# How to add docker container app for auto pull in config json

All the docker apps which needs to pull automatically reside in config.js. This project already have [config.example.json](https://raw.githubusercontent.com/codebysandip/docker-pull-auto/main/config.example.json) for example with comments added. Below is a example config.json

```json
{
  "apps": [
    {
      "docker": {
        "image": "sandipj/react-ssr-doc",
        "tagRegex": "prod-[\\da-z]{8,8}-\\d{9,11}$",
        "name": "react-ssr-doc",
        "port": "6500:5000",
        "env": {
          "mySecret": "my secret value"
        }
      }
    }
  ],
  "runCommandBeforeConfigRead": "sops -d config.enc.json \u003e config.json"
}
```

config.json have following direct keys:

1. apps
2. [runCommandBeforeConfigRead](#runCommandBeforeConfigRead)

## **config.apps**

config.apps key hold all the docker apps which needs to pull automatically. Every app contains information about docker. Lets take a look of each key one by one:

### **app.docker.image**

Docker image name. For example [react-ssr-doc](https://hub.docker.com/r/sandipj/react-ssr-doc) hosted on docker hub. Image name for this is **sandipj/react-ssr-doc**.

### **app.docker.tagRegex**

We put different tags based on environment like for development environment, we tag image like dev-{timestamp} and for production prod-{timestamp}. app.docker.tagRegex helps Docker Pull Auto to decide the current tag should execute or not

### **app.docker.name**

Docker Pull Auto uses name to run docker image with name. Thi helps to identify your app on server if running multiple docker images

### **app.docker.port**

Example value for app.docker.port is `5000:3000`. first port used by docker to expose container image for outside. Second port is the port which your application listening. In example value, application running on port 3000 and you can access via 5000. Normally we use same value for both ports.

### **app.docker.env**

app.docker.env is the environment variables in form of key value pair. Docker Pull Auto uses app.docker.env while running docker image and passes as environment variable.

### **app.docker.envFile**

You can also have env file per docker app and can pass path in app.docker.envFile. This project have example for [react-ssr-doc](https://github.com/codebysandip/react-ssr-doc) which have secret env file.

### **app.runCommandBeforeAccessApp**

You can run a command before docker pull run docker image. You can run a command to decrypt env file before docker pull auto access it for running image.

## **runCommandBeforeConfigRead**

This key is useful in scenario where you want to run a command before config read. A good example can be decrypt `app.docker.env` before reading config.json. This project supports adding of encrypted config.json also. It means you can save config json in format config.enc.json or config.{NODE_ENV}.enc.json. Docker Pull Auto will read enc file if available instead of reading config json.

## **dockerLoginCommand**

Docker pull auto runs a command of docker login before pulling a image. You can pass your custom command for docker login. 