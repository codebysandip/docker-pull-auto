# how to add environment file for Docker App/ Config App

It's common to have environment file for backend applications. Env file (.env) holds secrets of application. This project have env folder for environment variables. You can add a folder per application to organize in a better way. In newly created folder you can add env file.

After adding env file let say we added env/react-ssr-doc/development.env file. we can refer env file in config json like this:

```json
{
  "apps": [
    {
      "docker": {
        "image": "sandipj/react-ssr-doc",
        "tagRegex": "prod-[\\da-z]{8,8}-\\d{9,11}$",
        "hostedOn": "docker-hub",
        "name": "react-ssr-doc",
        "port": "6500:5000",
        "envFile": "env/react-ssr-doc/development.env"
      }
    }
  ]
}
```

In above json, we added a key **envKey** and passed path of env file. Docker pull auto will pass this env file while running docker image.

But we should not a commit a env file having raw values if it containing secret values. In ideal scenario, we create env file, encrypted it and commit only encrypted file and decrypt it whenever we need it. Docker Pull Auto supports running a command before running docker image. So we can add a command to decrypt env file. You can add a command in **apps[index].runCommandBeforeAccessApp**. Your updated json will look like:

```json
{
  "apps": [
    {
      "docker": {
        "image": "sandipj/react-ssr-doc",
        "tagRegex": "prod-[\\da-z]{8,8}-\\d{9,11}$",
        "hostedOn": "docker-hub",
        "name": "react-ssr-doc",
        "port": "6500:5000",
        "envFile": "env/react-ssr-doc/development.env"
      },
      "runCommandBeforeAccessApp": "sops -d env/react-ssr-doc/enc.development.env > env/react-ssr-doc/development.env"
    }
  ]
}
```

In above json, you can see we added a command of sops to decrypt env file. Docker Pull Auto will run this command before running docker image.
