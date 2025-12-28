const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// --- KONFIGURATION ---
const DUCKDNS_DOMAIN = "eligameserver"; 
const DUCKDNS_TOKEN = "c5baa2df-d545-4b4d-b495-d3503037301f";
const PORT = 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Pfade (erstellt Ordner dort, wo die server.js liegt)
const MC_DIR = path.join(__dirname, 'eligamer_server');
const JAR_PATH = path.join(MC_DIR, 'server.jar');
const PLUGINS_DIR = path.join(MC_DIR, 'plugins');

if (!fs.existsSync(MC_DIR)) fs.mkdirSync(MC_DIR, { recursive: true });
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });

let mcProcess = null;

// DNS Update
async function updateDNS() {
    try {
        const url = `https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=`;
        const res = await fetch(url);
        const text = await res.text();
        return text.includes("OK");
    } catch (e) { return false; }
}

// Downloads (Paper 1.21 & Geyser)
async function setupServerFiles() {
    if (fs.existsSync(JAR_PATH)) return;
    io.emit('log', "Downloads werden gestartet (Paper 1.21 & Geyser)...");
    
    const paper = await fetch("https://api.papermc.io/v2/projects/paper/versions/1.21/builds/130/downloads/paper-1.21-130.jar");
    const pDest = fs.createWriteStream(JAR_PATH);
    paper.body.pipe(pDest);

    const geyser = await fetch("https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot");
    const gDest = fs.createWriteStream(path.join(PLUGINS_DIR, 'Geyser-Spigot.jar'));
    geyser.body.pipe(gDest);

    return new Promise(res => pDest.on('finish', res));
}

// EULA
fs.writeFileSync(path.join(MC_DIR, 'eula.txt'), 'eula=true');

// Dashboard HTML
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <title>ELIGAMER | Panel</title>
            <style>
                body { background: #121212; color: #eee; font-family: sans-serif; text-align: center; padding: 20px; }
                .card { background: #1e1e1e; max-width: 800px; margin: auto; padding: 20px; border-radius: 10px; border-top: 5px solid #007bff; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                #log { background: #000; color: #00ff00; height: 400px; overflow-y: auto; text-align: left; padding: 15px; font-family: monospace; border-radius: 5px; margin: 15px 0; border: 1px solid #333; white-space: pre-wrap; }
                button { padding: 12px 25px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.3s; }
                .btn-start { background: #28a745; color: white; }
                .btn-start:hover { background: #218838; }
                .btn-send { background: #007bff; color: white; }
                input { padding: 12px; width: 60%; background: #2a2a2a; border: 1px solid #444; color: white; border-radius: 5px; outline: none; }
                .status { font-size: 14px; color: #888; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1 style="margin:0; color:#007bff;">ELIGAMER SERVER CONTROL</h1>
                <div class="status">Domain: <strong>${DUCKDNS_DOMAIN}.duckdns.org</strong></div>
                <div id="log">System bereit. Klicke auf 'Starten'...</div>
                <button class="btn-start" onclick="start()">SERVER STARTEN</button>
                <div style="margin-top:20px;">
                    <input type="text" id="cmd" placeholder="Befehl eingeben..." onkeydown="if(event.key==='Enter') send()">
                    <button class="btn-send" onclick="send()">SENDEN</button>
                </div>
            </div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const logDiv = document.getElementById('log');
                socket.on('log', d => {
                    const line = document.createElement('div');
                    line.textContent = d;
                    logDiv.appendChild(line);
                    logDiv.scrollTop = logDiv.scrollHeight;
                });
                function start() { socket.emit('start-mc'); }
                function send() {
                    const i = document.getElementById('cmd');
                    socket.emit('command', i.value);
                    i.value = '';
                }
            </script>
        </body>
        </html>
    `);
});

io.on('connection', (socket) => {
    socket.on('start-mc', async () => {
        if (mcProcess) return socket.emit('log', "Server läuft bereits!");

        // 1. DuckDNS Update
        const dnsOk = await updateDNS();
        socket.emit('log', dnsOk ? "[DuckDNS] IP erfolgreich aktualisiert." : "[DuckDNS] Fehler beim IP-Update.");

        // 2. Files checken/laden
        await setupServerFiles();

        // 3. MC starten
        socket.emit('log', "Starte Minecraft Server (2GB RAM)...");
        mcProcess = spawn('java', ['-Xmx2G', '-jar', 'server.jar', 'nogui'], { cwd: MC_DIR });

        mcProcess.stdout.on('data', d => io.emit('log', d.toString()));
        mcProcess.stderr.on('data', d => io.emit('log', "ERR: " + d.toString()));

        mcProcess.on('close', () => {
            io.emit('log', "Minecraft Server wurde beendet.");
            mcProcess = null;
        });
    });

    socket.on('command', (c) => {
        if (mcProcess) mcProcess.stdin.write(c + '\n');
    });
});

// Sicherer Stopp bei Strg+C
process.on('SIGINT', () => {
    if (mcProcess) {
        console.log("\nBeende Server sicher...");
        mcProcess.stdin.write('stop\n');
        setTimeout(() => process.exit(), 3000);
    } else {
        process.exit();
    }
});

server.listen(PORT, () => {
    console.log(`Dashboard: http://localhost:${PORT}`);
    exec(`start http://localhost:${PORT}`);
});