const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DUCKDNS_DOMAIN = "eligameserver"; 
const DUCKDNS_TOKEN = "c5baa2df-d545-4b4d-b495-d3503037301f";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const MC_DIR = path.join(__dirname, 'eligamer_server');
const JAR_PATH = path.join(MC_DIR, 'server.jar');
const PROP_PATH = path.join(MC_DIR, 'server.properties');

// Ordner und EULA
if (!fs.existsSync(MC_DIR)) fs.mkdirSync(MC_DIR);
fs.writeFileSync(path.join(MC_DIR, 'eula.txt'), 'eula=true');

// AUTOMATISCHE SERVER.PROPERTIES
if (!fs.existsSync(PROP_PATH)) {
    const props = [
        'server-port=25565',
        'query.port=25565',
        'motd=\\u00A7bELIGAMER \\u00A7fMinecraft Server',
        'difficulty=easy',
        'gamemode=survival',
        'max-players=20',
        'online-mode=true',
        'enable-command-block=true',
        'view-distance=10'
    ].join('\n');
    fs.writeFileSync(PROP_PATH, props);
}

app.get('/', (req, res) => {
    res.send(`
        <body style="background:#121212;color:white;font-family:sans-serif;text-align:center;padding:50px;">
            <h1 style="color:#007bff">ELIGAMER DASHBOARD</h1>
            <div id="l" style="background:#000;color:#0f0;height:300px;overflow:auto;padding:15px;text-align:left;border:1px solid #333;font-family:monospace;"></div>
            <br>
            <button onclick="s.emit('start')" style="padding:15px;background:#28a745;color:white;border:none;cursor:pointer;font-weight:bold;">SERVER STARTEN</button>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const s=io();const l=document.getElementById('l');
                s.on('log',d=>{const v=document.createElement('div');v.textContent=d;l.appendChild(v);l.scrollTop=99999;});
                function start(){s.emit('start');}
            </script>
        </body>
    `);
});

io.on('connection', (socket) => {
    socket.on('start', async () => {
        if (!fs.existsSync(JAR_PATH)) return socket.emit('log', 'Fehler: server.jar fehlt! Bitte erst Update ausfuehren.');
        
        socket.emit('log', '[System] Aktualisiere DuckDNS...');
        await fetch(`https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=`);
        
        socket.emit('log', '[System] Starte Minecraft...');
        const mc = spawn('java', ['-Xmx2G', '-jar', 'server.jar', 'nogui'], { cwd: MC_DIR });
        
        mc.stdout.on('data', d => io.emit('log', d.toString()));
        mc.stderr.on('data', d => io.emit('log', 'ERR: ' + d.toString()));
        
        mc.on('close', () => {
            io.emit('log', '[System] Server gestoppt.');
        });
    });
});

server.listen(3000, () => { 
    console.log('Dashboard auf Port 3000 bereit.');
    exec('start http://localhost:3000'); 
});
