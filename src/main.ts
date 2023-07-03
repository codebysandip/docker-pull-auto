import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppService } from "./app.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");

  app.useGlobalPipes(new ValidationPipe());

  // read config at startup to run config.runCommandBeforeConfigRead
  const appService = app.get(AppService);
  appService.getConfig();

  // load dotenv after config read
  // to allow runCommandBeforeConfigRead to decrypt enc.env
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  dotenv.config();

  await app.listen(process.env.PORT || 7002);
}
bootstrap();
