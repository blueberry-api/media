@echo off
chcp 65001 >nul
cd /d "%~dp0"
python -m http.server 8081
http://localhost:8081
pause