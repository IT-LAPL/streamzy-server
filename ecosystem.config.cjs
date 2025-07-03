module.exports = {
  apps: [
    {
      name: "fastify-app",
      script: "bun",
      args: "run src/server.ts",
      instances: "max",
      exec_mode: "cluster",
      watch: ["src"],
      ignore_watch: ["node_modules"],
      autorestart: true,
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
