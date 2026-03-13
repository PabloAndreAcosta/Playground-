/**
 * GameEngine - Renders note highways and handles scoring per player.
 * Each player has their own lane with falling notes.
 */
const GameEngine = (() => {
    const LANE_COLORS = ['#ff6b6b', '#48dbfb', '#ffa500', '#6bff6b'];
    const PLAYER_COLORS = ['#48dbfb', '#ff6b6b', '#ffa500', '#6bff6b'];
    const HIT_ZONE_Y_RATIO = 0.88; // hit zone position from top
    const NOTE_SPEED = 300; // pixels per second
    const PERFECT_WINDOW = 0.08; // seconds
    const GOOD_WINDOW = 0.15;
    const OK_WINDOW = 0.25;

    // Key bindings per player (4 lanes each)
    const KEY_BINDINGS = [
        ['d', 'f', 'j', 'k'],       // Player 1
        ['1', '2', '3', '4'],       // Player 2
        ['7', '8', '9', '0'],       // Player 3
        ['v', 'b', 'n', 'm'],       // Player 4
    ];

    class PlayerLane {
        constructor(playerIndex, track, container) {
            this.playerIndex = playerIndex;
            this.track = track;
            this.color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
            this.keys = KEY_BINDINGS[playerIndex % KEY_BINDINGS.length];

            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.hits = { perfect: 0, good: 0, ok: 0, miss: 0 };
            this.totalNotes = track.notes.length;
            this.nextNoteIndex = 0;
            this.activeNotes = []; // notes currently visible

            // Create DOM elements
            this.element = document.createElement('div');
            this.element.className = 'player-lane';

            this.label = document.createElement('div');
            this.label.className = 'lane-label';
            this.label.textContent = `${track.name} (${this.keys.join(' ')})`;
            this.element.appendChild(this.label);

            this.canvas = document.createElement('canvas');
            this.element.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');

            this.hitFlash = document.createElement('div');
            this.hitFlash.className = 'hit-flash';
            this.element.appendChild(this.hitFlash);

            this.comboDisplay = document.createElement('div');
            this.comboDisplay.className = 'combo-display';
            this.element.appendChild(this.comboDisplay);

            container.appendChild(this.element);
            this.resize();
        }

        resize() {
            const rect = this.element.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.hitZoneY = this.canvas.height * HIT_ZONE_Y_RATIO;
        }

        update(currentTime) {
            // Add new notes that are about to appear
            const lookAhead = this.canvas.height / NOTE_SPEED + 0.5;
            while (this.nextNoteIndex < this.track.notes.length) {
                const note = this.track.notes[this.nextNoteIndex];
                if (note.startTime <= currentTime + lookAhead) {
                    this.activeNotes.push({
                        ...note,
                        hit: false,
                        missed: false,
                    });
                    this.nextNoteIndex++;
                } else {
                    break;
                }
            }

            // Check for missed notes
            for (const note of this.activeNotes) {
                if (!note.hit && !note.missed && currentTime > note.startTime + OK_WINDOW) {
                    note.missed = true;
                    this.hits.miss++;
                    this.combo = 0;
                }
            }

            // Remove notes that have scrolled past
            this.activeNotes = this.activeNotes.filter(n => {
                const y = this.hitZoneY + (currentTime - n.startTime) * NOTE_SPEED;
                return y < this.canvas.height + 100;
            });
        }

        render(currentTime) {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            ctx.clearRect(0, 0, w, h);

            const laneWidth = w / 4;

            // Draw lane dividers
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1;
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(i * laneWidth, 0);
                ctx.lineTo(i * laneWidth, h);
                ctx.stroke();
            }

            // Draw hit zone
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(0, this.hitZoneY - 3, w, 6);

            // Draw lane key labels at hit zone
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillText(this.keys[i].toUpperCase(), (i + 0.5) * laneWidth, this.hitZoneY + 20);
            }

            // Draw notes
            for (const note of this.activeNotes) {
                const lane = note.lane;
                const x = lane * laneWidth;
                const timeDiff = note.startTime - currentTime;
                const y = this.hitZoneY - timeDiff * NOTE_SPEED;

                if (note.hit) continue;

                const noteH = Math.max(note.duration * NOTE_SPEED, 20);
                const noteW = laneWidth - 8;
                const noteX = x + 4;
                const noteY = y - noteH;

                const color = note.missed ? 'rgba(100, 100, 100, 0.3)' : LANE_COLORS[lane];

                // Note body
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(noteX, noteY, noteW, noteH, 4);
                ctx.fill();

                // Note head (bottom)
                if (!note.missed) {
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.roundRect(noteX, y - 6, noteW, 6, 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }

                // Note name
                if (noteH > 20) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(note.noteName, noteX + noteW / 2, noteY + noteH / 2 + 4);
                }
            }

            // Update combo display
            if (this.combo >= 5) {
                this.comboDisplay.textContent = `${this.combo}x`;
                this.comboDisplay.style.color = this.combo >= 20 ? '#ff6bd6' :
                    this.combo >= 10 ? '#ffa500' : '#48dbfb';
            } else {
                this.comboDisplay.textContent = '';
            }
        }

        handleKeyDown(laneIndex, currentTime) {
            // Find closest unhit note in this lane within the hit window
            let bestNote = null;
            let bestDist = Infinity;

            for (const note of this.activeNotes) {
                if (note.hit || note.missed || note.lane !== laneIndex) continue;
                const dist = Math.abs(note.startTime - currentTime);
                if (dist < OK_WINDOW && dist < bestDist) {
                    bestNote = note;
                    bestDist = dist;
                }
            }

            if (bestNote) {
                bestNote.hit = true;
                let quality;
                if (bestDist <= PERFECT_WINDOW) {
                    quality = 'perfect';
                    this.score += 100 * (1 + this.combo * 0.1);
                    this.hits.perfect++;
                } else if (bestDist <= GOOD_WINDOW) {
                    quality = 'good';
                    this.score += 50 * (1 + this.combo * 0.05);
                    this.hits.good++;
                } else {
                    quality = 'ok';
                    this.score += 25;
                    this.hits.ok++;
                }

                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                // Visual + audio feedback
                this.showHitFlash(quality);
                Synth.playHitSound(quality);
                Synth.playNote(bestNote.note, this.track.role, Math.min(bestNote.duration, 1));

                return quality;
            }

            return null;
        }

        showHitFlash(quality) {
            this.hitFlash.className = 'hit-flash ' + quality;
            clearTimeout(this._flashTimeout);
            this._flashTimeout = setTimeout(() => {
                this.hitFlash.className = 'hit-flash';
            }, 200);
        }

        getResults() {
            return {
                playerIndex: this.playerIndex,
                trackName: this.track.name,
                role: this.track.role,
                score: Math.round(this.score),
                combo: this.maxCombo,
                hits: { ...this.hits },
                totalNotes: this.totalNotes,
                accuracy: this.totalNotes > 0
                    ? Math.round(((this.hits.perfect + this.hits.good + this.hits.ok) / this.totalNotes) * 100)
                    : 0,
            };
        }
    }

    // Main game state
    let players = [];
    let songData = null;
    let startTime = 0;
    let isPlaying = false;
    let animFrameId = null;
    let onGameEnd = null;
    let backingTracks = [];

    function start(song, playerConfigs, endCallback) {
        songData = song;
        onGameEnd = endCallback;
        players = [];
        backingTracks = [];

        Synth.init();
        Synth.resume();

        const container = document.getElementById('game-area');
        container.innerHTML = '';

        const assignedTracks = new Set();

        // Create player lanes
        for (let i = 0; i < playerConfigs.length; i++) {
            const cfg = playerConfigs[i];
            const track = song.tracks.find(t => t.name === cfg.trackName || t.role === cfg.role);
            if (track) {
                assignedTracks.add(track);
                const lane = new PlayerLane(i, track, container);
                players.push(lane);
            }
        }

        // Schedule backing tracks for unassigned instruments
        for (const track of song.tracks) {
            if (!assignedTracks.has(track)) {
                backingTracks.push(track);
            }
        }

        // Show key hints
        const hintEl = document.getElementById('key-hints');
        hintEl.innerHTML = players.map(p => {
            return `<div class="key-hint">
                <span style="color:${p.color}">${p.track.name}:</span>
                ${p.keys.map(k => `<kbd>${k.toUpperCase()}</kbd>`).join(' ')}
            </div>`;
        }).join('');

        // Start with a countdown delay
        startTime = performance.now() / 1000 + 3; // 3 second lead-in

        // Schedule backing tracks
        setTimeout(() => {
            for (const track of backingTracks) {
                Synth.scheduleBackingTrack(track, 0);
            }
        }, 3000);

        isPlaying = true;

        // Set up keyboard input
        document.addEventListener('keydown', handleKeyDown);

        // Resize handler
        window.addEventListener('resize', handleResize);
        handleResize();

        // Start game loop
        gameLoop();
    }

    function handleResize() {
        for (const player of players) {
            player.resize();
        }
    }

    function handleKeyDown(e) {
        if (!isPlaying) return;
        const key = e.key.toLowerCase();
        const currentTime = performance.now() / 1000 - startTime;

        for (const player of players) {
            const laneIndex = player.keys.indexOf(key);
            if (laneIndex !== -1) {
                player.handleKeyDown(laneIndex, currentTime);
                e.preventDefault();
                break;
            }
        }
    }

    function gameLoop() {
        if (!isPlaying) return;

        const currentTime = performance.now() / 1000 - startTime;

        // Update + render each player
        for (const player of players) {
            player.update(currentTime);
            player.render(currentTime);
        }

        // Update score display
        const scoreEl = document.getElementById('score-display');
        scoreEl.innerHTML = players.map(p =>
            `<div class="player-score">
                <span class="dot" style="background:${p.color}"></span>
                ${Math.round(p.score)}
            </div>`
        ).join('');

        // Update progress
        const progress = Math.max(0, currentTime / songData.duration);
        const progressEl = document.getElementById('song-progress');
        const mins = Math.floor(Math.max(0, currentTime) / 60);
        const secs = Math.floor(Math.max(0, currentTime) % 60);
        const totalMins = Math.floor(songData.duration / 60);
        const totalSecs = Math.floor(songData.duration % 60);
        progressEl.textContent = `${mins}:${secs.toString().padStart(2,'0')} / ${totalMins}:${totalSecs.toString().padStart(2,'0')}`;

        // Check if song ended
        if (currentTime > songData.duration + 2) {
            stop();
            return;
        }

        animFrameId = requestAnimationFrame(gameLoop);
    }

    function stop() {
        isPlaying = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);

        if (onGameEnd) {
            const results = players.map(p => p.getResults());
            onGameEnd(results);
        }
    }

    function getKeyBindings() {
        return KEY_BINDINGS;
    }

    return { start, stop, getKeyBindings, PLAYER_COLORS };
})();
