## Description

This project developed on [Nest](https://github.com/nestjs/nest) framework. Idea of this project is to pull docker images automatically on server whenever there is push. Github webhook calls docker pull auto api whenever workflow runs on github.
You add a config.json file for your docker containers which need to pull auto. Whenever receives request on api, api compares with config file and gets app. App contains information about repository and docker image. API uses this information to pull latest image from docker, runs this pulled image and also delete old image if exist.

## High level diagram

![High level diagram of docker pull auto](./assets/docker-auto-pull-flow.drawio.png)

## Installation

```bash
$ npm install
```

## Running the app

- Create a .env file at the root with following content:

  ```bash
  HOOK_SECRET=yourSecret;
  DOCKER_USERNAME=yourUser;
  DOCKER_TOKEN=yourToken;
  PORT=7002;
  ```

- Add a config.json for your app(s). You can take reference from [config.example.json](./config.example.json)
- Run application

  ```bash
  # development
  $ npm run start

  # watch mode
  $ npm run start:dev

  # production mode
  $ npm run start:prod
  ```

## Build

```bash
# Build the project
$ npm run build
```

<!-- ## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
``` -->

## Pre requisites for server

- Docker
- Node 16.x or higher
- pm2 (`sudo npm i -g pm2`)

## Useful Links

- #### [How to add docker container app for auto pull in config json](./how-to-add-docker-container-app.md)

- #### [What is HOOK_SECRET and How to create HOOK_SECRET](./how-to-create-hook-secret.md)
- #### [How to create multiple config based on environment](./how-to-create-multiple-config-based-on-env.md)
- #### [How to encrypt config.json](./how-to-encrypt-config-json.md)
- #### [How to add environment file for Docker App/ Config App](./how-to-add-environment-file-for-config-app.md)
