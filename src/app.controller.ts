import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { execSync } from "child_process";
import { parse } from "comment-json";
import { Request, Response } from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Config, DockerHostedOn, WorkflowPayload, WorkflowStatus } from "./app.model";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("github/workflow")
  /**
   * This api get called when workflow will run
   * We entertain here only completed status
   * This api matches repository from config.json. If found pulls latest docker image, runs image and deletes old image
   */
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

      const errorMsg = await this.appService.dockerLogin();
      if (errorMsg) {
        res.status(500).json({ error: errorMsg });
        return;
      }

      const containerApps = await this.appService.getRunningDockerContainers();
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
              let dockeRunScript = `docker run --name ${app.docker.name} -d -p ${app.docker.port} -it ${imageWithTag} --rm`;
              Object.keys(app.docker.env).forEach((envKey) => {
                dockeRunScript += ` -e ${envKey}=${app.docker.env[envKey]}`;
              });
              execSync(dockeRunScript);

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
}
