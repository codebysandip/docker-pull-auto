# How to add docker container app for auto pull

All the docker apps which needs to pull automatically reside in config.js. This project already have [config.example.json](../config.example.json) for example with comments added. Below is a example config.json

```json
{
  "apps": [
    {
      "repo": {
        "url": "https://github.com/codebysandip/react-ssr-doc",
        "branch": "main"
      },
      "docker": {
        "image": "sandipj/react-ssr-doc",
        "tagRegex": "prod-[\\da-z]{8,8}-\\d{9,11}$",
        "hostedOn": "docker-hub",
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

config.apps key hold all the docker apps which needs to pull automatically. Every app contains information about repository and docker. Lets take a look of each key one by one:

### **app.repo.url**

Repository url of github. Don't add .git at the end

### **app.repo.branch**

Docker will work only when code will merge on Github branch specified in app.repo.branch. If branch is development then docker auto pull will work only when code will merge on development branch.

### **app.docker.image**

Docker image name. For example [react-ssr-doc](https://hub.docker.com/r/sandipj/react-ssr-doc) hosted on docker hub. Image name for this is **sandipj/react-ssr-doc**.

### **app.docker.tagRegex**

We put different tags based on environment like for development environment, we tag image like dev-{timestamp} and for production prod-{timestamp}. app.docker.tagRegex helps Docker Pull Auto to decide which tag should pull. Docker Pull Auto gets last 20 tags of stored images and compares each tag with tagRegex.

### **app.docker.hostedOn**

hostedOn is requirement parameter to identify where your docker images hosted on. Valid values are aws, docker-hub, github and azure. Currenty we are supporting only for docker hub but soon will support all mentoined.

### **app.docker.name**

Docker Pull Auto uses name to run docker image with name. Thi helps to identify your app on server if running multiple docker images

### **app.docker.port**

Example value for app.docker.port is `5000:3000`. first port used by docker to expose container image for outside. Second port is the port which your application listening. In example value, application running on port 3000 and you can access via 5000. Normally we use same value for both ports.

### **app.docker.env**

app.docker.env i the environment variables in form of key value pair. Docker Pull Auto uses app.docker.env while running docker image and passes as environt variable.

## **runCommandBeforeConfigRead**

This key is useful in scenario where you want to run a command before config read. A good example can be decrypt `app.docker.env` before reading config.json. This project supports adding of encrypted config.json also. It means you can save config json in format config.enc.json or config.{NODE_ENV}.enc.json. Docker Pull Auto will read enc file if available instead of reading config json.
