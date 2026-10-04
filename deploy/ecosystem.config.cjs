module.exports = {
  apps: [
    {
      name: "marketplace-api",
      cwd: "/root/marketplace/apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "marketplace-web",
      cwd: "/root/marketplace/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "300M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
