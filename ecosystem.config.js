module.exports = {
  apps: [
    {
      name: 'pazar-plus',
      script: './server/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'client/build',
        'uploads'
      ],
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      kill_timeout: 3000,
      listen_timeout: 8000,
      wait_ready: true
    }
  ]
};
