@echo off
setlocal
start "" "http://127.0.0.1:8080"
call "%~dp0app.cmd" dev -Port 8080 -Install
endlocal
