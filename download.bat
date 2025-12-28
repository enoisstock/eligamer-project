@echo off
title ELIGAMER - System Installer
cls

echo [1/3] Verbinde mit GitHub Repository...
:: Pfad zu deinem Repository
set "RAW_URL=https://raw.githubusercontent.com/enoisstock/eligamer-project/main"

echo [2/3] Lade Loader herunter...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%RAW_URL%/Loader.bat' -OutFile 'Loader.bat'"

if exist "Loader.bat" (
    echo [3/3] Starte System-Loader...
    start Loader.bat
    exit
) else (
    echo FEHLER: Die Verbindung zu GitHub ist fehlgeschlagen.
    pause
)
