import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { exec, execSync } from "child_process";
import { createHmac } from "crypto";
import { Observable, of } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
import { ConfigApp, DockerApp, DockerTagResponse } from "./app.model";

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
   * Get tag from docker hub and pull latest docker image
   * @param app ConfigApp which reside in config.json
   * @returns image with tag string in case of success. In case of failure returns { error: string }
   */
  getTagAndPullImage(app: ConfigApp): Observable<string | { error: string } | { message: string }> {
    const url = `https://registry.hub.docker.com/v2/repositories/${app.docker.image}/tags?page_size=20&sort=last_updated`;
    return this.httpService.get<DockerTagResponse>(url).pipe(
      mergeMap((resp) => {
        if (resp.data.results.length) {
          const regex = new RegExp(app.docker.tagRegex);
          const dockerTag = resp.data.results.find((t) => regex.test(t.name));
          if (!dockerTag) {
            const error = `No docker image found for regex ${app.docker.tagRegex}`;
            console.warn(error);
            return of({ error });
          }
          const imageWithTag = `${app.docker.image}:${dockerTag.name}`;
          console.log(`Docker image ${imageWithTag}`);
          return new Observable<string | { error: string } | { message: string }>((obs) => {
            console.log("pulling docker image ", imageWithTag);
            let respSent = false;
            // github hook timeouts after 10 sec
            const timeoutId = setTimeout(() => {
              if (respSent) {
                return;
              }
              obs.next({ message: "Docker pulling image. Check server log for more information" });
              respSent = true;
            }, 8000);

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
        return of({ error: "Empty result from docker registry api" });
      }),
      catchError((err) => {
        const error = `Error in fetching tags from registry. Error ${err}`;
        console.error(error);
        return of({ error });
      }),
    );
  }

  dockerLogin() {
    return new Promise<string>((resolve) => {
      exec(`docker login -u ${process.env.DOCKER_USERNAME} -p ${process.env.DOCKER_TOKEN}`, (err) => {
        if (err) {
          resolve(`Unable to login docker. Error: ${err.message}`);
        } else {
          resolve("");
        }
      });
    });
  }

  /**
   * Get running docker containers on system. This method uses command docker ps --format json
   * @returns running docker containers
   */
  getRunningDockerContainers() {
    return new Promise<DockerApp[]>((resolve) => {
      const appsRunning: DockerApp[] = [];
      exec("docker ps --format json", (err, stdout, stderr) => {
        if (err) {
          console.error("Error in installing package.json!!", err);
          resolve(appsRunning);

          return;
        }
        if (stderr) {
          console.error("StdError in installing package.json!!", stderr);
          resolve(appsRunning);
          return;
        }
        stdout
          .split(/\n/g)
          .filter((str) => !!str)
          .forEach((str) => appsRunning.push(JSON.parse(str)));
        resolve(appsRunning);
      });
    });
  }

  dockerRun(app: ConfigApp, imageWithTag: string) {
    if (app.runCommandBeforeAccessApp) {
      console.log(`Running command: ${app.runCommandBeforeAccessApp}`);
      execSync(app.runCommandBeforeAccessApp);
    }
    let dockeRunScript = `docker run --name ${app.docker.name} -d -p ${app.docker.port} -it ${imageWithTag} --rm`;
    if (app.docker.env && typeof app.docker.env === "object") {
      console.log("Reading env from app.docker.env");
      Object.keys(app.docker.env).forEach((envKey) => {
        dockeRunScript += ` -e ${envKey}=${app.docker.env[envKey]}`;
      });
    }

    if (app.docker.envFile) {
      dockeRunScript += ` --env-file ${app.docker.envFile}`;
    }

    console.log(`Running docker image ${imageWithTag}`);
    console.log(`with command: ${dockeRunScript}`);
    execSync(dockeRunScript);
  }
}
