# Getting Started

Docker Pull Auto works on webhook concept and you do setup a [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) on github. Concept here is whenever a workflow runs on github, [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) calls Docker Pull auto api with docker image and tag. This is where Docker Auto pull starts magic.

For example, I will use [react--sr-doc](https://github.com/codebysandip/react-ssr-doc). To start using docker pull auto, you can setup with these simple steps:

1. Clone Docker Pull Auto Repository on your local system

   ```bash
     git clone https://github.com/codebysandip/docker-pull-auto
   ```

2. Install the dependencies
   ```bash
     npm i
   ```
3. Delete .git folder becaus you don't need it

   ```bash
   npx rimraf .git
   ```

4. Initialize a new github repository
   ```bash
     git init
   ```
5. Add your github repository via adding your github origin

   ```bash
     git remote add origin https://github.com/youruser/your-repo.git
     git branch -M main
   ```

6. Add config.json which will have all your docker apps to pull automatically on server. You can use example config json for quick start. Move example/config.json and example/config.enc.json to root.  
   Below is example config.json for open source docker image [sandipj/react-ssr-doc](https://hub.docker.com/repository/docker/sandipj/react-ssr-doc/general):

   ```json
   {
     "apps": [
       {
         "docker": {
           "image": "sandipj/react-ssr-doc",
           "tagRegex": "prod-[\\da-z]{8,8}-\\d{9,11}$",
           "name": "react-ssr-doc",
           "port": "6500:5000",
           "envFile": "env/react-ssr-doc/development.env"
         },
         "runCommandBeforeAccessApp": "sops -d env/react-ssr-doc/enc.development.env > env/react-ssr-doc/development.env"
       }
     ],
     "runCommandBeforeConfigRead": "sops -d config.enc.json > config.json"
   }
   ```

   Whenever a new workflow will run on react-ssr-doc, Docker Pull Auto will receive request (after adding [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) in workflow). Docker Pull Auto will match tag with **tagRegex**. If a match will found, Docker Pull Auto will pull the image and will run the image with parameters **name, port and envFile**.

7. Create a .env file at the root with following content:

   ```bash
   HOOK_SECRET=yourSecret;
   DOCKER_USERNAME=yourUser;
   DOCKER_TOKEN=yourToken;
   PORT=7002;
   ```

   You can learn from here [What is HOOK_SECRET and How to create HOOK_SECRET](./how-to-create-hook-secret.md)

8. Both config.enc.json and env/react-ssr-doc/enc.development.env file encrypted via sops age. To decrypt both files we will need key.txt file while placed at root. Export SOPS_AGE_KEY_FILE variable with value key.txt to tell key.txt file exist in current folder

   1. If you are using windows
      ```bash
        $ENV:SOPS_AGE_KEY_FILE="key.txt"
      ```
   2. If you are using linux system (mac or ubuntu)
      ```bash
        export SOPS_AGE_KEY_FILE="key.txt"
      ```

9. Now you can run application on your local machine but before that please check docker must running on your machine and also sops must install if you are using example config
   ```bash
    npm run start:dev
   ```

10. Last step is to include [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) in all your project's github workflow. docker pull auto action sends request to docker pull auto webhook api with docker image and tag which needs to run on your server. Below is example workflow file of react-ssr-doc:

```yaml
name: Docker build & push

on:
  push:
    branches:
      - "main"
jobs:
  build:
    timeout-minutes: 20
    runs-on: ubuntu-20.04

    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Get build version
        id: vars
        run: echo short_hash=$(echo ${GITHUB_SHA::8}) >> $GITHUB_OUTPUT

      - name: Get latest commit timestamp
        id: commit_epoch
        run: echo epoch=$(echo $(git show -s --format=%ct))  >> $GITHUB_OUTPUT

      - name: Build and push
        id: docker_build
        uses: docker/build-push-action@v4
        with:
          push: true
          context: ${{ github.workspace }}
          tags: sandipj/react-ssr-doc:prod-${{steps.vars.outputs.short_hash}}-${{steps.commit_epoch.outputs.epoch}}
          build-args: |
            env=prod

      - name: Docker Pull Auto
        uses: codebysandip/docker-pull-auto-action@v1.5
        with:
          docker-image: sandipj/react-ssr-doc
          docker-tag: prod-${{steps.vars.outputs.short_hash}}-${{steps.commit_epoch.outputs.epoch}}
          domain: dockerpullauto.sandipj.dev
          hook-secret: ${{ secrets.HOOK_SECRET }}

```
