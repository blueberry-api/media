@echo off
chcp 65001 >nul
cd /d "%~dp0"
set /p message=Commit message: 
git init
git remote add origin https://github.com/blueberry-api/media
git add .
git commit -m "%message%"
git push origin master --force
pause

