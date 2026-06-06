module.exports = {
  apps: [
    {
      name: 'agent-watchdog',
      script: './scripts/vps-watchdog.sh',
      interpreter: 'bash',
      cwd: '/root/Aidacamp',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      log_file: './logs/pm2-watchdog.log',
      error_file: './logs/pm2-watchdog-err.log',
      time: true,
    }
  ]
}
