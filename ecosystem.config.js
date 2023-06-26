module.exports = {
  apps: [
    {
      name: "Docker Pull Auto",
      script: "./dist/main.js",
      instances: "1",
      exec_mode: "fork",
      max_restarts: 5,
      restart_delay: 1000,
    },
  ],
};
