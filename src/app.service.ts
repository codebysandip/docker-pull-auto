import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { exec, execSync } from "child_process";
import { parse } from "comment-json";
import { createHmac } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Observable, of, throwError } from "rxjs";
import { catchError, map, mergeMap } from "rxjs/operators";
import { Config, ConfigApp, DockerApp, DockerAuthResponse, DockerTagResponse, WorkflowStatus } from "./app.model";

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Verify signature of github payload. You can set secret on Github webhook.
   * Github will use secret to createHmac from payload and will send in header key x-hub-signature-256
   * @param body payload of Github webhook
   * @param header github sends x-hub-signature-256 header
   * @returns boolean
   */
  verifySignature(body: unknown, header: string) {
    const signature = createHmac("sha256", process.env.HOOK_SECRET).update(JSON.stringify(body)).digest("hex");
    return `sha256=${signature}` === header;
  }

  /**
   * Get token from auth.docker.io
   * @param app ConfigApp from config.json
   * @returns token
   */
  generateDockerToken(app: ConfigApp) {
    return this.httpService
      .get<DockerAuthResponse>(
        `https://${process.env.DOCKER_USERNAME}:${process.env.DOCKER_TOKEN}@auth.docker.io/token?service=registry.docker.io&scope=repository:${app.docker.image}:pull`,
      )
      .pipe(
        catchError((err) => {
          console.error("Error in getting token from  auth.docker.io. Error: ", err);
          return throwError(() => err);
        }),
        map((res) => res.data.token),
      );
  }

  /**
   * Get tags from index.docker.io
   * @param app Config App
   * @param token docker auth token
   * @param last last value of response. Used to fetch next values
   * @returns tags
   */
  getTags(app: ConfigApp, token?: string, last?: string): Observable<DockerTagResponse> {
    let url = `https://index.docker.io/v2/${app.docker.image}/tags/list?n=10`;
    if (last) {
      url += `&last=${last}`;
    }
    let token$: Observable<string>;
    if (!token) {
      token$ = this.generateDockerToken(app);
    } else {
      token$ = of(token);
    }
    return token$.pipe(
      mergeMap((t) => {
        return this.httpService.get<DockerTagResponse>(url, { headers: { Authorization: `Bearer ${t}` } }).pipe(
          catchError((err) => {
            console.error("Error in getting tags from index.docker.io. Error: ", err);
            return throwError(() => err);
          }),
          mergeMap((resp) => {
            if (resp.headers.link) {
              return this.getTags(app, token, resp.data.tags.reverse()[0]);
            }
            return of(resp.data);
          }),
        );
      }),
    );
  }

  /**
   * Get tag from docker hub and pull latest docker image
   * @param app ConfigApp which reside in config.json
   * @returns image with tag string in case of success. In case of failure returns { error: string }
   */
  getTagAndPullImage(app: ConfigApp): Observable<string | { error: string } | { message: string }> {
    return this.getTags(app).pipe(
      mergeMap((resp) => {
        if (resp.tags.length) {
          const regex = new RegExp(app.docker.tagRegex);
          const dockerTag = resp.tags.find((t) => regex.test(t));
          if (!dockerTag) {
            const error = `No docker image found for regex ${app.docker.tagRegex}`;
            console.warn(error);
            return of({ error });
          }
          const imageWithTag = `${app.docker.image}:${dockerTag}`;
          console.log(`Docker image ${imageWithTag}`);
          return this.pullImage(imageWithTag);
        }
        return of({ error: "Empty result from docker registry api" });
      }),
      catchError((err) => {
        const error = `Error in fetching tags from registry. Error ${err}`;
        console.error(error);
        return of({ error });
      }),
    );
  }

  /**
   * Pull image from docker
   * @param imageWithTag image:tag
   * @returns Observable
   */
  pullImage(imageWithTag: string, wait = true) {
    console.log("pulling docker image ", imageWithTag);
    return new Observable<string | { error: string } | { message: string }>((obs) => {
      console.log("pulling docker image ", imageWithTag);
      let respSent = false;
      // github hook timeouts after 10 sec
      const timeoutId = setTimeout(
        () => {
          if (respSent) {
            return;
          }
          obs.next({ message: "Docker pulling image. Check server log for more information" });
          respSent = true;
        },
        wait ? 8000 : 0,
      );

      exec(`docker pull ${imageWithTag}`, (err, stdout, stderr) => {
        if (!respSent) {
          clearTimeout(timeoutId);
        }
        respSent = true;
        if (err) {
          const error = `Error in pulling image ${imageWithTag}. Error: ${err.message}`;
          console.error(error, err);
          obs.next({ error });
          obs.complete();
          return;
        }
        if (stderr) {
          const error = `Error in pulling image ${imageWithTag}. Error: ${stderr}`;
          console.error(error, err);
          obs.next({ error });
          obs.complete();
          return;
        }
        console.log(stdout);
        obs.next(imageWithTag);
        obs.complete();
      });
    });
  }

  dockerLogin() {
    console.log("docker login!!");
    return new Promise<string>((resolve) => {
      exec(`docker login -u ${process.env.DOCKER_USERNAME} -p ${process.env.DOCKER_TOKEN}`, (err) => {
        if (err) {
          resolve(`Unable to login docker. Error: ${err.message}`);
        } else {
          console.log("docker login success!!");
          resolve("");
        }
      });
    });
  }

  /**
   * reads config.json
   * @returns Config
   */
  getConfig(commandToRun?: string): Config | null {
    if (commandToRun) {
      execSync(commandToRun);
    }
    const configFile = process.env.NODE_ENV ? `config.${process.env.NODE_ENV}.json` : "config.json";
    const configEncFile = process.env.NODE_ENV ? `config.${process.env.NODE_ENV}.enc.json` : "config.enc.json";
    const configEncFilePath = join(process.cwd(), configEncFile);
    let configPath = join(process.cwd(), configFile);
    if (!commandToRun && existsSync(configEncFilePath)) {
      configPath = configEncFilePath;
    }
    if (!existsSync(configPath)) {
      console.error("config.json doesn't exist on path ", configPath);
      return null;
    }
    const configStr = readFileSync(configPath, { encoding: "utf8" });
    if (configStr) {
      try {
        const config: Config = parse(configStr) as any;
        if (config.runCommandBeforeConfigRead && !commandToRun) {
          return this.getConfig(config.runCommandBeforeConfigRead);
        }
        return config;
      } catch (err) {
        console.error("Invalid config json!!", err);
        return null;
      }
    }
  }

  /**
   * Get running docker containers on system. This method uses command docker ps --format json
   * @returns running docker containers
   */
  getRunningDockerContainers() {
    return new Promise<DockerApp[]>((resolve) => {
      const appsRunning: DockerApp[] = [];
      exec('docker ps --format "{{json .}}"', (err, stdout, stderr) => {
        if (err) {
          console.error("Error in docker ps!!", err);
          resolve(appsRunning);

          return;
        }
        if (stderr) {
          console.error("StdError in docker ps!!", stderr);
          resolve(appsRunning);
          return;
        }
        stdout
          .split(/\n/g)
          .filter((str) => !!str)
          .forEach((str) => {
            try {
              const obj = JSON.parse(str);
              appsRunning.push(obj);
            } catch {}
          });
        resolve(appsRunning);
        console.log(appsRunning);
      });
    });
  }

  /**
   * Run docker image
   * @param app Config App
   * @param imageWithTag Image with tag
   */
  dockerRun(app: ConfigApp, imageWithTag: string) {
    if (app.runCommandBeforeAccessApp) {
      console.log(`Running command: ${app.runCommandBeforeAccessApp}`);
      execSync(app.runCommandBeforeAccessApp);
    }
    let dockerRunScript = `docker run --name ${app.docker.name} -itd -p ${app.docker.port}`;
    if (app.docker.env && typeof app.docker.env === "object") {
      console.log("Reading env from app.docker.env");
      Object.keys(app.docker.env).forEach((envKey) => {
        dockerRunScript += ` --env "${envKey}=${app.docker.env[envKey]}"`;
      });
    }

    if (app.docker.envFile) {
      dockerRunScript += ` --env-file ${app.docker.envFile}`;
    }

    dockerRunScript += ` ${imageWithTag}`;

    console.log(`Running docker image ${imageWithTag}`);
    console.log(`with command: ${dockerRunScript}`);
    execSync(dockerRunScript);
  }

  /**
   * Manually up docker apps from config
   * @param url repository url
   * @param branch branch name
   * @returns axios request
   */
  dockerUpAppManually(url: string, branch: string) {
    const payload = {
      workflow_run: {
        status: WorkflowStatus.completed,
        head_branch: branch,
      },
      repository: {
        html_url: url,
      },
    };
    const signature = createHmac("sha256", process.env.HOOK_SECRET).update(JSON.stringify(payload)).digest("hex");
    const header = `sha256=${signature}`;

    return this.httpService.post(`http://localhost:${process.env.PORT || 7002}/api/github/workflow`, payload, {
      headers: { "x-hub-signature-256": header },
    });
  }
}
