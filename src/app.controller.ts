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
    const config = this.appService.getConfig();
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

    const errorMsg = await this.appService.dockerLogin();
    if (errorMsg) {
      res.status(500).json({ error: errorMsg });
      return;
    }

    const containerApps = await this.appService.getRunningDockerContainers();
    const containerApp = containerApps.find((ca) => ca.Image.startsWith(app.docker.image));

    console.log("container app!!", containerApp);

    if (!containerApp) {
      // get latest tag, pull the image and start
      this.appService.pullImage(`${payload.dockerImage}:${payload.dockerImageTag}`, false).subscribe((imageWithTag) => {
        if (typeof imageWithTag === "string") {
          this.appService.dockerRun(app, imageWithTag);
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
      this.appService.pullImage(`${payload.dockerImage}:${payload.dockerImageTag}`, false).subscribe((imageWithTag) => {
        if (typeof imageWithTag === "string") {
          if (containerApp.Image === imageWithTag) {
            res.status(200).json({
              message: "Server already have latest tag",
            });
            return;
          } else {
            console.log(`Stopping container ${containerApp.ID}`);
            execSync(`docker stop ${containerApp.ID}`);

            this.appService.dockerRun(app, imageWithTag);

            console.log(`Deleting old image ${containerApp.Image}`);
            execSync(`docker image rm ${containerApp.Image} -f`);
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
  }
}
