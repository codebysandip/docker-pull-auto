# How to encrypt config.json

config.json holds all the docker apps which needs to pull automaticaly. It's common to have secret values for backend applications like database password, jwt secret key etc. We can't save these secrets in config.json as raw value. To protect these secrets values, we can encrypt env part of config.json with [sops](https://github.com/mozilla/sops). I'm going to use sops for this example.

Docker pull auto supports reading of config file in format config.enc.json and in case of multiple config based on envionment config.{NODE_ENV}.enc.json. Docker pull auto supports this format so that we can have encrypted config json.

Docker pull auto supports running a command before reading config json. We will add a command to decrypt config.enc.json. You can add command in key **runCommandBeforeConfigRead**. Your updated config.json will look like:

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
        "port": "6500:5000"
      }
    }
  ],
  "runCommandBeforeConfigRead": "sops -d config.enc.json > config.json"
}
```

command `sops -d config.enc.json > config.json` will decrypt config.enc.json and will create a config.json

Note: You should not commit config.json if have secret values. We should add config.json in .gitignore so that git will not include in commit
