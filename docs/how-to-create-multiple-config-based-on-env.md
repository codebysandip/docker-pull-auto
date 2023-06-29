In software developement, it's common requirement to have multiple config based on environment.
You can have multiple environments like dev, qa, stage etc.  
docker pull auto uses NODE_ENV environment variable for multiple config management. Format for reading config is config.{process.env.NODE_ENV}.json. Let suppose we need to create a separate config for development. To create multiple config, you will need to follow following steps:

1. Create a config.development.json in root
2. Now you will need to pass development value in NODE_ENV environment variable.
3. You will need to add two scripts in package.json in scripts section. One for local development and one for build

   ```bash
   "start:development": "cross-env NODE_ENV=development nest start --watch --webpack --webpackPath ./config/nest-webpack.config.js"
   "build:development": "cross-env NODE_ENV=development nest build --webpack --webpackPath ./config/nest-webpack.config.js"
   ```

4. Now run your new added script to test on local via command

   ```bash
   npm run start:development
   ```

5. This project supports auto deployment on push. For ease already have workflow config in folder .github/workflows with name build-and-push-dev.yml.bak. Just rename this file. If you compare build-and-push.yml with build-and-push-dev.yml.bak then you will find, we only changed build command from `npm run build` to `npm run build:development`

NOTE: If you will not pass NODE_ENV then config.json will use as config file
