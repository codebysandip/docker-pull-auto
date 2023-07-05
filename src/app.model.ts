import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, ValidateNested } from "class-validator";

export interface DockerApp {
  Command: string;
  CreatedAt: string;
  ID: string;
  Image: string;
  Labels: string;
  LocalVolumes: string;
  Mounts: string;
  Names: string;
  Networks: string;
  Ports: string;
  RunningFor: string;
  Size: string;
  State: "running" | "exited";
  Status: string;
}

export class ConfigDocker {
  /**
   * Docker image
   *
   * @example
   *   sandipj / react - ssr - doc;
   */
  @IsNotEmpty()
  image: string;
  /** Tag regex to match tag with upcoming tag */
  @IsNotEmpty()
  tagRegex: string;

  /** Name which will use to run docker image */
  @IsNotEmpty()
  name: string;
  /**
   * Internal and external
   *
   * @example
   *   3000:5000
   */
  @IsNotEmpty()
  port: string;
  /** Docker environment variables These variables passed as environment variables while running docker image */
  env?: Record<string, string>;
  /** Path of env file. we pass env file while running docker image */
  envFile?: string;
}
export class Config {
  /** Docker apps */
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigApp)
  apps: ConfigApp[];
  /**
   * Command to run before reading config.json.\
   * This enables decryption of config.json via sops or similar tool
   */
  runCommandBeforeConfigRead: string;

  /** Will use this command for docker login */
  dockerLoginCommand?: string;
}

export class ConfigApp {
  /** Docker info */
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ConfigDocker)
  docker: ConfigDocker;
  /**
   * Run command before access app.
   *
   * @example
   *   decrypt env file before docker app access env file
   */
  runCommandBeforeAccessApp?: string;
}

export interface DockerImage {
  architecture: string;
  features: string;
  variant: any;
  digest: string;
  os: string;
  os_features: string;
  os_version: any;
  size: number;
  status: string;
  last_pulled: string;
  last_pushed: string;
}

export class HookPayload {
  @IsNotEmpty()
  dockerImage: string;

  @IsNotEmpty()
  dockerImageTag: string;
}

export interface PullImageResponse {
  message?: string;
  error?: string;
  pullCompleted: boolean;
}

export interface DockerImage {
  Containers: string;
  CreatedAt: string;
  CreatedSince: string;
  Digest: string;
  ID: string;
  Repository: string;
  SharedSize: string;
  Size: string;
  Tag: string;
  UniqueSize: string;
  VirtualSize: string;
}
