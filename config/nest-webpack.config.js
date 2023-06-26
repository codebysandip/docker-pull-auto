const Dotenv = require("dotenv-webpack");

module.exports = (options, webpack) => {
  const plugins = [
    ...options.plugins,
    new Dotenv({
      systemvars: true,
      path: ".env",
    }),
  ];

  return {
    ...options,
    plugins: [...plugins],
  };
};
