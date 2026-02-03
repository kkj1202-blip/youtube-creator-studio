@echo off
echo Starting AutoKim with PM2...
pm2 start ecosystem.config.js
pm2 save
pm2 monit
pause
