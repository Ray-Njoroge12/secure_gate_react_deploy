module.exports = {
  apps: [
    {
      name: 'secure-gate-api',
      script: 'server.js',
      node_args: '--import ./load-env.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enable cluster mode for load balancing
      watch: false,
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      
      // Restart configuration
      exp_backoff_restart_delay: 100, // Exponential backoff on restarts
      max_restarts: 10, // Max restarts before stopping
      min_uptime: '10s', // Min uptime to consider "started"
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // Health monitoring
      instance_var: 'INSTANCE_ID'
    }
  ]
};
