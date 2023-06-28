<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

This project developed on [Nest](https://github.com/nestjs/nest) framework. Idea of this project is to pull docker images automatically on server whenever there is push. Github webhook calls docker pull auto api whenever workflow runs on github.
You add a config.json file for your docker containers which need to pull auto. Wheneever recieve request on api, api compares with config file and gets app. App constains information about repository and docker image. API uses this information to pull latest image from docker, runs this pulled image and also delete old image if exist.

## High level diagram

![High level diagram of docker pull auto](./docs/assets/docker-auto-pull-flow.drawio.png)

## Installation

```bash
$ npm install
```

## Running the app

- Create a .env file at the root with follwing content:

  ```typescript
  HOOK_SECRET = yourSecret;
  DOCKER_USERNAME = yourUser;
  DOCKER_TOKEN = yourToken;
  PORT = 7002;
  ```

- Add a config.json for your app(s). You can take referenece from [config.example.json](./config.example.json)
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

## Pre reqisuites for server

- Docker
- Node 16.x or higher
- pm2 (`sudo npm i -g pm2`)

## Useful Links

- #### [How to add docker container app in config for auto pull](./docs/how-to-add-docker-container-app.md)

- #### [What is HOOK_SECRET and How to create HOOK_SECRET](./docs/how-to-create-hook-secret.md)
- #### [How to create multiple config based on environment](./docs/how-to-create-multiple-config-based-on-env.md)
