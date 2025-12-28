@echo off
title Eligamer Updater
set "RAW=https://raw.githubusercontent.com/enoisstock/eligamer-project/main"
echo Lade System-Dateien von GitHub...
powershell -Command "Invoke-WebRequest -Uri '%RAW%/server.js' -OutFile 'server.js'"
powershell -Command "Invoke-WebRequest -Uri '%RAW%/package.json' -OutFile 'package.json'"

echo Erstelle Start-Datei...
(
echo @echo off
echo npm install ^& node server.js
echo pause
) > start_server.bat

echo FERTIG! Starte jetzt die start_server.bat
pause
exit