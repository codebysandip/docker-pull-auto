import { NestFactory } from "@nestjs/core";
import { AxiosError, AxiosResponse } from "axios";
import { catchError, forkJoin, of } from "rxjs";
import { AppModule } from "./app.module";
import { AppService } from "./app.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");

  const appService = app.get(AppService);
  const config = appService.getConfig();
  const obs$ = config.apps.map((dockerConfig) => {
    return appService.dockerUpAppManually(dockerConfig.repo.url, dockerConfig.repo.branch);
  });
  forkJoin(obs$)
    .pipe(
      catchError((err) => {
        return of(err);
      }),
    )
    .subscribe((result: (AxiosResponse | AxiosError)[]) => {
      result.forEach((resp, idx) => {
        const data = resp instanceof AxiosError ? resp.response.data : resp.data;
        console.log(`docker run manual result for ${config.apps[idx].docker.image}`, data);
      });
    });
  await app.listen(process.env.PORT || 7002);
}
bootstrap();
