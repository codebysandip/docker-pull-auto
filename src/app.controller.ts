import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { exec, execSync } from "child_process";
import { Request, Response } from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Config, DockerApp, DockerHostedOn, WorkflowPayload, WorkflowStatus } from "./app.model";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("github/workflow")
  async workflowRun(@Body() payload: WorkflowPayload, @Req() req: Request, @Res() res: Response) {
    if (!this.appService.verifySignature(payload, req.headers["x-hub-signature-256"] as string)) {
      res.status(400).json({
        error: "Invalid request",
      });
      return;
    }
    // 9a58510c-2ecd-481c-962a-2e7ff473d3c0
    const { status, head_branch } = payload.workflow_run;
    const { html_url } = payload.repository;

    if (status === WorkflowStatus.completed) {
      const config = this.getConfig();
      if (!config) {
        res.status(500).json({
          error: "Config not available",
        });
        return;
      }
      const app = config.apps.find((app) => app.repo.url === html_url && app.repo.branch === head_branch);

      if (!app) {
        res.status(400).json({
          error: "No config app found for this repository",
        });
        return;
      }

      console.log("config app!!", app);

      // for now supporting only for docker hub
      if (app.docker.hostedOn !== DockerHostedOn.dockerHub) {
        console.warn("Only Docker hub supported!!");
        res.status(422).json({
          error: "Currently supporting only docker hub",
        });
        return;
      }

      const containerApps = await this.getRunningDockerContainers();
      const containerApp = containerApps.find((ca) => ca.Image.startsWith(app.docker.image));

      if (!containerApp) {
        // get latest tag, pull the image and start
        this.appService.getTagAndPullImage(app).subscribe((imageWithTag) => {
          if (typeof imageWithTag === "string") {
            console.log(`Running docker image ${imageWithTag}`);
            execSync(`docker run --name ${app.docker.name} -d -p ${app.docker.port} -it ${imageWithTag}`);
            if (res.headersSent) {
              return;
            }
            res.status(200).json({
              message: `Docker image ${imageWithTag} started successfully`,
            });
          } else if ((imageWithTag as { message: string }).message) {
            res.status(200).json(imageWithTag);
          }
          if (res.headersSent) {
            return;
          }
          res.status(500).json(imageWithTag);
        });
      } else {
        this.appService.getTagAndPullImage(app).subscribe((imageWithTag) => {
          if (typeof imageWithTag === "string") {
            if (containerApp.Image === imageWithTag) {
              res.status(200).json({
                message: "Server already have latest tag",
              });
              return;
            } else {
              console.log(`Stopping container ${containerApp.ID}`);
              execSync(`docker stop ${containerApp.ID}`);

              console.log(`Running docker image ${imageWithTag}`);
              execSync(`docker run --name ${app.docker.name} -d -p ${app.docker.port} -it ${imageWithTag} --rm`);

              console.log(`Deleting old image ${containerApp.Image}`);
              execSync(`docker image rm ${containerApp.Image}`);
              if (res.headersSent) {
                return;
              }
              res.status(200).json({
                message: `Docker image ${imageWithTag} started`,
              });
              return;
            }
          } else if ((imageWithTag as { message: string }).message) {
            res.status(200).json(imageWithTag);
          }
          if (res.headersSent) {
            return;
          }
          res.status(500).json(imageWithTag);
        });
      }
    } else {
      res.status(200).json({});
    }
  }

  @Get("test")
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

  getConfig(): Config | null {
    const configPath = join(process.cwd(), "config.json");
    if (!existsSync(configPath)) {
      console.error("config.json doesn't exist on path ", configPath);
      return null;
    }
    const configStr = readFileSync(configPath, { encoding: "utf8" });
    if (configStr) {
      try {
        const config: Config = JSON.parse(configStr);
        return config;
      } catch (err) {
        console.error("Invalid config json!!", err);
        return null;
      }
    }
  }
}
