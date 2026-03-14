/**
 * Multiplayer - Real-time score sharing using BroadcastChannel (same device)
 * or WebSocket (network play via server.js).
 *
 * Protocol:
 *  - join: { type: 'join', room, player }
 *  - start: { type: 'start', song, difficulty }
 *  - score: { type: 'score', player, score, combo, accuracy }
 *  - end: { type: 'end', player, results }
 */
const Multiplayer = (() => {
    let channel = null;
    let ws = null;
    let roomId = null;
    let playerId = null;
    let isHost = false;
    let onPeerUpdate = null;
    let onPeerJoin = null;
    let onGameStart = null;
    let peers = {}; // { id: { name, score, combo, accuracy, connected } }

    function generateId() {
        return Math.random().toString(36).substr(2, 6);
    }

    function init(callbacks) {
        onPeerUpdate = callbacks.onPeerUpdate || (() => {});
        onPeerJoin = callbacks.onPeerJoin || (() => {});
        onGameStart = callbacks.onGameStart || (() => {});
        playerId = generateId();
    }

    function createRoom() {
        roomId = generateId();
        isHost = true;
        peers = {};
        connectChannel();
        return roomId;
    }

    function joinRoom(id) {
        roomId = id;
        isHost = false;
        peers = {};
        connectChannel();
        broadcast({ type: 'join', player: playerId, name: `Spelare` });
    }

    function connectChannel() {
        // Use BroadcastChannel for same-device multiplayer
        if (channel) channel.close();
        channel = new BroadcastChannel(`bandjam_${roomId}`);
        channel.onmessage = (e) => handleMessage(e.data);

        // Try WebSocket too (optional server)
        tryWebSocket();
    }

    function tryWebSocket() {
        try {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${protocol}//${location.hostname}:3001`);
            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'join', room: roomId, player: playerId }));
            };
            ws.onmessage = (e) => {
                try { handleMessage(JSON.parse(e.data)); } catch {}
            };
            ws.onerror = () => { ws = null; };
            ws.onclose = () => { ws = null; };
        } catch {
            ws = null;
        }
    }

    function broadcast(msg) {
        msg.from = playerId;
        msg.room = roomId;
        if (channel) channel.postMessage(msg);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
    }

    function handleMessage(msg) {
        if (msg.from === playerId) return; // ignore own messages

        switch (msg.type) {
            case 'join':
                peers[msg.from] = { name: msg.name || 'Spelare', score: 0, combo: 0, accuracy: 0, connected: true };
                onPeerJoin(msg.from, peers);
                // Respond with our presence
                broadcast({ type: 'hello', player: playerId, name: 'Spelare' });
                break;
            case 'hello':
                if (!peers[msg.from]) {
                    peers[msg.from] = { name: msg.name || 'Spelare', score: 0, combo: 0, accuracy: 0, connected: true };
                    onPeerJoin(msg.from, peers);
                }
                break;
            case 'score':
                if (peers[msg.from]) {
                    peers[msg.from].score = msg.score;
                    peers[msg.from].combo = msg.combo;
                    peers[msg.from].accuracy = msg.accuracy;
                }
                onPeerUpdate(peers);
                break;
            case 'start':
                onGameStart(msg);
                break;
            case 'end':
                if (peers[msg.from]) {
                    peers[msg.from].finalResults = msg.results;
                }
                onPeerUpdate(peers);
                break;
            case 'leave':
                if (peers[msg.from]) {
                    peers[msg.from].connected = false;
                }
                onPeerUpdate(peers);
                break;
        }
    }

    function sendScore(score, combo, accuracy) {
        broadcast({ type: 'score', score, combo, accuracy });
    }

    function sendStart(songId, difficulty) {
        broadcast({ type: 'start', songId, difficulty });
    }

    function sendEnd(results) {
        broadcast({ type: 'end', results });
    }

    function leave() {
        broadcast({ type: 'leave' });
        if (channel) { channel.close(); channel = null; }
        if (ws) { ws.close(); ws = null; }
        roomId = null;
        peers = {};
    }

    function isConnected() {
        return roomId !== null;
    }

    function getPeers() {
        return { ...peers };
    }

    function getRoomId() {
        return roomId;
    }

    function getPlayerId() {
        return playerId;
    }

    function isHostPlayer() {
        return isHost;
    }

    function getPeerCount() {
        return Object.values(peers).filter(p => p.connected).length;
    }

    return {
        init, createRoom, joinRoom, leave,
        sendScore, sendStart, sendEnd,
        isConnected, getPeers, getRoomId, getPlayerId,
        isHostPlayer, getPeerCount,
    };
})();
