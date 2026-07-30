@echo off
rem 双击启动西部世界 Demo（禁缓存开发服务器）
cd /d %~dp0
start "" http://localhost:8080
python serve.py 8080
pause
