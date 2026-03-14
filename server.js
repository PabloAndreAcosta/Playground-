/**
 * BandJam WebSocket Server - Optional server for network multiplayer.
 * Run with: node server.js
 * Relays messages between clients in the same room.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

let WebSocket;
try {
    WebSocket = require('ws');
} catch {
    console.log('Install ws: npm install ws');
    console.log('Then run: node server.js');
    process.exit(1);
}

const PORT = 3001;
const STATIC_PORT = 3000;

// Static file server
const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.mid': 'audio/midi',
};

const staticServer = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

staticServer.listen(STATIC_PORT, () => {
    console.log(`BandJam: http://localhost:${STATIC_PORT}`);
});

// WebSocket relay
const wss = new WebSocket.Server({ port: PORT });
const rooms = {}; // { roomId: Set<ws> }

wss.on('connection', (ws) => {
    ws.roomId = null;
    ws.playerId = null;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'join' && msg.room) {
            ws.roomId = msg.room;
            ws.playerId = msg.player;
            if (!rooms[msg.room]) rooms[msg.room] = new Set();
            rooms[msg.room].add(ws);
        }

        // Relay to all others in same room
        if (ws.roomId && rooms[ws.roomId]) {
            for (const client of rooms[ws.roomId]) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(msg));
                }
            }
        }
    });

    ws.on('close', () => {
        if (ws.roomId && rooms[ws.roomId]) {
            rooms[ws.roomId].delete(ws);
            // Notify others
            for (const client of rooms[ws.roomId]) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'leave', from: ws.playerId }));
                }
            }
            if (rooms[ws.roomId].size === 0) delete rooms[ws.roomId];
        }
    });
});

console.log(`WebSocket relay: ws://localhost:${PORT}`);
