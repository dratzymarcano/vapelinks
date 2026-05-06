module.exports = {
  apps: [
    {
      name: 'mrnicevape',
      script: './dist/server/entry.mjs',
      env: {
        HOST: '0.0.0.0',
        PORT: 4321,
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
    },
  ],
};
