@echo off
set "RAW=https://raw.githubusercontent.com/enoisstock/eligamer-project/main"
powershell -Command "Invoke-WebRequest -Uri '%RAW%/Update.bat' -OutFile 'Update.bat'"
start Update.bat
exit