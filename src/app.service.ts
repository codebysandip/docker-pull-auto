import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { exec, execSync } from "child_process";
import { plainToClass } from "class-transformer";
import { ValidationError, validate } from "class-validator";
import { parse } from "comment-json";
import { createHmac } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Observable } from "rxjs";
import { Config, ConfigApp, DockerApp, DockerImage, PullImageResponse } from "./app.model";

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
   * Pull image from docker
   * @param imageWithTag image:tag
   * @returns Observable
   */
  pullImage(imageWithTag: string) {
    console.log("pulling docker image ", imageWithTag);
    return new Observable<PullImageResponse>((obs) => {
      let respSent = false;
      // github hook timeouts after 10 sec
      const timeoutId = setTimeout(() => {
        obs.next({ message: "Docker pulling image. Check server log for more information", pullCompleted: false });
        respSent = true;
      }, 8000);

      exec(`docker pull ${imageWithTag}`, (err, stdout, stderr) => {
        if (!respSent) {
          clearTimeout(timeoutId);
        }
        if (err) {
          const error = `Error in pulling image ${imageWithTag}. Error: ${err.message}`;
          console.error(error, err);
          obs.next({ error, pullCompleted: true });
          obs.complete();
          return;
        }
        if (stderr) {
          const error = `Error in pulling image ${imageWithTag}. Error: ${stderr}`;
          console.error(error, err);
          obs.next({ error, pullCompleted: true });
          obs.complete();
          return;
        }
        console.log(stdout);
        obs.next({ message: stdout, pullCompleted: true });
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
  getConfig(commandToRun?: string): Promise<Config | null> {
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
      throw new Error("config.json doesn't exist");
    }
    const configStr = readFileSync(configPath, { encoding: "utf8" });
    if (configStr) {
      try {
        const config: Config = parse(configStr) as any;
        if (config.runCommandBeforeConfigRead && !commandToRun) {
          return this.getConfig(config.runCommandBeforeConfigRead);
        }
        return this.validateConfig(config);
      } catch (err) {
        console.error("Invalid config json!!", err);
        return Promise.resolve(null);
      }
    }
    throw new Error("Invalid config.json");
  }

  /**
   * Get running docker containers on system. This method uses command docker ps --format json
   * @returns running docker containers
   */
  getRunningDockerContainers() {
    return new Promise<DockerApp[]>((resolve) => {
      const appsRunning: DockerApp[] = [];
      exec('docker ps -a --format "{{json .}}"', (err, stdout, stderr) => {
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
      });
    });
  }

  /**
   * Run docker image
   * @param app Config App
   * @param imageWithTag Image with tag
   */
  dockerRunImage(app: ConfigApp, imageWithTag: string) {
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
   * Deletes all images other than the provided image with tag
   * @param image docker image
   * @param currentTag docker image tag
   */
  deleteOldDockerImages(image: string, currentTag: string) {
    console.log(`Deleting all old images!!`);
    execSync('docker image ls --format "{{json .}}"');
    return new Promise((resolve) => {
      const dockerImages: DockerImage[] = [];
      exec('docker image ls --format "{{json .}}"', (err, stdout, stderr) => {
        if (err) {
          console.error("Error in docker ps!!", err);
          resolve(false);

          return;
        }
        if (stderr) {
          console.error("StdError in docker ps!!", stderr);
          resolve(false);
          return;
        }
        stdout
          .split(/\n/g)
          .filter((str) => !!str)
          .forEach((str) => {
            try {
              const obj = JSON.parse(str);
              dockerImages.push(obj);
            } catch {}
          });

        const images = dockerImages.filter((i) => i.Repository === image && i.Tag !== currentTag);
        images.forEach((i) => {
          console.log(`deleting image ${i.Repository}:${i.Tag}`);
          execSync(`docker image rm -f ${i.ID}`);
        });
        resolve(true);
      });
    });
  }

  /**
   * Validate config.json
   * @param config Config
   * @returns Config if valid otherwise throws Error
   */
  validateConfig(config: Config) {
    config = plainToClass(Config, config);
    return validate(config).then((errors) => {
      if (errors.length) {
        this.showValidationMessage(errors);
        throw new Error("Validation failed for config.json");
      }
      return config;
    });
  }

  showValidationMessage(errors: ValidationError[]) {
    errors.forEach((err) => {
      if (err.children.length) {
        this.showValidationMessage(err.children);
      } else {
        console.log("validation error ", err);
      }
    });
  }
}
