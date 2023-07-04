import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { execSync } from "child_process";
import { Request, Response } from "express";
import { HookPayload } from "./app.model";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("webhook")
  async webhook(@Body() payload: HookPayload, @Req() req: Request, @Res() res: Response) {
    if (!this.appService.verifySignature(payload, req.headers["x-hub-signature-256"] as string)) {
      res.status(400).json({
        error: "Invalid request",
      });
      return;
    }
    console.log("payload!!", payload);
    const config = await this.appService.getConfig();
    if (!config) {
      res.status(500).json({
        error: "Config not available",
      });
      return;
    }
    const app = config.apps.find((app) => {
      if (app.docker.image === payload.dockerImage) {
        const regex = new RegExp(app.docker.tagRegex);
        return regex.test(payload.dockerImageTag);
      }
      return false;
    });

    if (!app) {
      res.status(400).json({
        error: `No config app found for ${payload.dockerImage}:${payload.dockerImageTag}`,
      });
      return;
    }

    console.log("config app!!", app);

    const containerApps = await this.appService.getRunningDockerContainers();
    const containerApp = containerApps.find(
      (ca) => ca.Names.startsWith(app.docker.name) || ca.Image.startsWith(app.docker.image),
    );

    console.log("container app!!", containerApp);
    const imageWithTag = `${payload.dockerImage}:${payload.dockerImageTag}`;

    if (containerApp && containerApp.Image === imageWithTag && containerApp.State === "running") {
      res.status(200).json({
        message: "Already running this tag",
      });
      return;
    }

    const errorMsg = await this.appService.dockerLogin();
    if (errorMsg) {
      res.status(500).json({ error: errorMsg });
      return;
    }

    if (!containerApp) {
      // get latest tag, pull the image and start
      this.appService.pullImage(imageWithTag).subscribe((response) => {
        if (!res.headersSent) {
          const statusCode = (response as any).error ? 500 : 200;
          res.status(statusCode).json(response);
        }
        if (response.pullCompleted && response.message) {
          this.appService.dockerRunImage(app, imageWithTag);
        }

        if (!res.headersSent) {
          res.status(200).json({
            message: `Docker image ${imageWithTag} started successfully`,
          });
        }
      });
    } else {
      this.appService.pullImage(imageWithTag).subscribe(async (response) => {
        if (!res.headersSent) {
          const statusCode = (response as any).error ? 500 : 200;
          res.status(statusCode).json(response);
        }
        if (response.pullCompleted && response.message) {
          console.log(`Stopping container ${containerApp.ID}`);
          execSync(`docker stop ${containerApp.ID}`);

          console.log(`Removing container ${containerApp.ID}`);
          execSync(`docker rm --force ${containerApp.ID}`);

          this.appService.dockerRunImage(app, imageWithTag);

          await this.appService.deleteOldDockerImages(payload.dockerImage, payload.dockerImageTag);
        }
        if (!res.headersSent) {
          res.status(200).json({
            message: `Docker image ${imageWithTag} started`,
          });
        }
        return;
      });
    }
  }
}
