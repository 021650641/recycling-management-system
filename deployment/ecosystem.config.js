/**
 * PM2 Ecosystem Configuration
 * Production-ready process management for Recycling Management System
 */

module.exports = {
  apps: [
    {
      // Application Configuration
      name: 'recycling-api',
      script: './dist/server.js',
      cwd: './backend',
      
      // Instance Configuration
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for load balancing
      
      // Environment Variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart Behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      // Reload Configuration
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Advanced Features
      watch: false, // Don't watch files in production
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Process Management
      wait_ready: true,
      increment_var: 'PORT',
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // Environment
      node_args: '--max-old-space-size=2048',
      
      // Graceful Shutdown
      kill_retry_time: 5000
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/021650641/recycling-management-system.git',
      path: '/var/www/recycling',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};
