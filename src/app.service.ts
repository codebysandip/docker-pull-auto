import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { exec } from "child_process";
import { createHmac } from "crypto";
import { Observable, of } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
import { ConfigApp, DockerTagResponse } from "./app.model";

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  verifySignature(body: unknown, header: string) {
    const signature = createHmac("sha256", process.env.GITHUB_HOOK_SECRET).update(JSON.stringify(body)).digest("hex");
    return `sha256=${signature}` === header;
  }

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
}
