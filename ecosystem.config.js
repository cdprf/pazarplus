module.exports = {
  apps: [
    {
      name: "pazar-plus",
      script: "./server/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
        HOST: "0.0.0.0",
        DATABASE_URL: "postgresql://pazar_user:pazar_plus@localhost:5432/pazar_plus_prod?sslmode=disable",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5001,
        HOST: "0.0.0.0",
        DATABASE_URL: "postgresql://pazar_user:pazar_plus@localhost:5432/pazar_plus_prod?sslmode=disable",
      },
      // Restart options
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",

      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
