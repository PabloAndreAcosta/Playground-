/**
 * GameEngine - Renders note highways with instrument-specific mechanics.
 *
 * Instrument types:
 * - Guitar: 6 strings (E A D G B e), keys S D F J K L
 * - Bass: 4 strings (E A D G), keys D F J K
 * - Drums: 6 pads (Kick, Snare, HiHat, Tom1, Tom2, Crash), keys A S D F G H
 * - Vocals: Pitch-matching via microphone
 * - Piano: 8 white keys, keys A S D F G H J K
 */
const GameEngine = (() => {
    const PLAYER_COLORS = ['#48dbfb', '#ff6b6b', '#ffa500', '#6bff6b'];
    const HIT_ZONE_Y_RATIO = 0.88;

    // Base values (medium)
    const BASE_NOTE_SPEED = 300;
    const BASE_PERFECT_WINDOW = 0.08;
    const BASE_GOOD_WINDOW = 0.15;
    const BASE_OK_WINDOW = 0.25;

    // Difficulty presets: [speedMult, windowMult, noteFilterRatio]
    const DIFFICULTY_PRESETS = {
        easy:   { speedMult: 0.7,  windowMult: 1.5, noteKeepRatio: 0.55 },
        medium: { speedMult: 1.0,  windowMult: 1.0, noteKeepRatio: 1.0  },
        hard:   { speedMult: 1.4,  windowMult: 0.6, noteKeepRatio: 1.0  },
    };

    // Active difficulty values (set on start)
    let NOTE_SPEED = BASE_NOTE_SPEED;
    let PERFECT_WINDOW = BASE_PERFECT_WINDOW;
    let GOOD_WINDOW = BASE_GOOD_WINDOW;
    let OK_WINDOW = BASE_OK_WINDOW;
    let currentDifficulty = 'medium';

    // Practice mode state
    let practiceMode = false;
    let practiceTempo = 1.0;       // 0.25 - 1.0

    // Instrument definitions
    const INSTRUMENTS = {
        gitarr: {
            lanes: 6,
            laneLabels: ['E', 'A', 'D', 'G', 'B', 'e'],
            laneColors: ['#ff6b6b', '#ffa500', '#ffd93d', '#6bff6b', '#48dbfb', '#ff6bd6'],
            keys: [
                ['s', 'd', 'f', 'j', 'k', 'l'],
                ['z', 'x', 'c', 'v', 'b', 'n'],
            ],
            noteMapper: noteToGuitarString,
        },
        bas: {
            lanes: 4,
            laneLabels: ['E', 'A', 'D', 'G'],
            laneColors: ['#ff6b6b', '#ffa500', '#48dbfb', '#6bff6b'],
            keys: [
                ['d', 'f', 'j', 'k'],
                ['v', 'b', 'n', 'm'],
            ],
            noteMapper: noteToBassString,
        },
        trummor: {
            lanes: 6,
            laneLabels: ['KI', 'SN', 'HH', 'T1', 'T2', 'CR'],
            laneColors: ['#ff6b6b', '#ffd93d', '#48dbfb', '#6bff6b', '#ffa500', '#ff6bd6'],
            keys: [
                ['a', 's', 'd', 'f', 'g', 'h'],
                ['v', 'b', 'n', 'm', ',', '.'],
            ],
            noteMapper: noteToDrumPad,
        },
        piano: {
            lanes: 8,
            laneLabels: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C\''],
            laneColors: ['#ff6b6b', '#ffa500', '#ffd93d', '#6bff6b', '#48dbfb', '#6b6bff', '#ff6bd6', '#fff'],
            keys: [
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'],
            ],
            noteMapper: noteToPianoKey,
        },
        sång: {
            lanes: 0, // special: pitch-based
            laneLabels: [],
            laneColors: [],
            keys: [[]],
            noteMapper: null,
            isVocal: true,
        },
        // Fallback
        synth: {
            lanes: 4,
            laneLabels: ['1', '2', '3', '4'],
            laneColors: ['#ff6b6b', '#48dbfb', '#ffa500', '#6bff6b'],
            keys: [
                ['d', 'f', 'j', 'k'],
                ['1', '2', '3', '4'],
            ],
            noteMapper: (note, lanes) => note % lanes,
        },
        stråkar: null, // will use synth fallback
        blås: null,
    };

    // Note mapping functions

    // Guitar: map MIDI note to 6 strings based on standard tuning ranges
    // E2(40)-A2(45) = E string, A2(45)-D3(50) = A string, etc.
    function noteToGuitarString(noteNum) {
        if (noteNum < 45) return 0;      // E string (low)
        if (noteNum < 50) return 1;      // A string
        if (noteNum < 55) return 2;      // D string
        if (noteNum < 59) return 3;      // G string
        if (noteNum < 64) return 4;      // B string
        return 5;                         // e string (high)
    }

    // Bass: map MIDI note to 4 strings
    // E1(28)-A1(33) = E, A1(33)-D2(38) = A, D2(38)-G2(43) = D, G2(43)+ = G
    function noteToBassString(noteNum) {
        if (noteNum < 33) return 0;      // E string
        if (noteNum < 38) return 1;      // A string
        if (noteNum < 43) return 2;      // D string
        return 3;                         // G string
    }

    // Drums: map MIDI percussion to pads
    // GM drum map: 35-36=kick, 38-40=snare, 42-44-46=hihat, 45-47=tom, 48-50=tom2, 49-57=crash
    function noteToDrumPad(noteNum) {
        if (noteNum === 35 || noteNum === 36) return 0; // Kick
        if (noteNum === 38 || noteNum === 40) return 1; // Snare
        if (noteNum === 42 || noteNum === 44 || noteNum === 46) return 2; // HiHat
        if (noteNum >= 45 && noteNum <= 47) return 3;   // Tom 1
        if (noteNum >= 48 && noteNum <= 50) return 4;   // Tom 2
        if (noteNum === 49 || noteNum === 51 || noteNum === 55 || noteNum === 57) return 5; // Crash/Ride
        // Default spread
        return noteNum % 6;
    }

    // Piano: map to 8 white keys across one octave
    function noteToPianoKey(noteNum) {
        const whiteKeyMap = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }; // C D E F G A B
        const noteInOctave = noteNum % 12;
        if (whiteKeyMap[noteInOctave] !== undefined) {
            return whiteKeyMap[noteInOctave];
        }
        // Black keys: map to nearest white key
        if (noteInOctave === 1) return 0;  // C#->C
        if (noteInOctave === 3) return 1;  // D#->D
        if (noteInOctave === 6) return 3;  // F#->F
        if (noteInOctave === 8) return 4;  // G#->G
        if (noteInOctave === 10) return 5; // A#->A
        return noteNum % 8;
    }

    function getInstrumentConfig(role) {
        const cfg = INSTRUMENTS[role];
        if (cfg) return cfg;
        return INSTRUMENTS.synth;
    }

    // ==================== VOCAL LANE (pitch-matching) ====================

    class VocalLane {
        constructor(playerIndex, track, container) {
            this.playerIndex = playerIndex;
            this.track = track;
            this.color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.hits = { perfect: 0, good: 0, ok: 0, miss: 0 };
            this.totalNotes = track.notes.length;
            this.nextNoteIndex = 0;
            this.activeNotes = [];
            this.currentPitch = -1; // detected pitch in MIDI note
            this.pitchHistory = []; // recent pitch samples for smoothing

            // Pitch range for display
            this.minNote = 48; // C3
            this.maxNote = 84; // C6
            if (track.notes.length > 0) {
                const notes = track.notes.map(n => n.note);
                this.minNote = Math.min(...notes) - 5;
                this.maxNote = Math.max(...notes) + 5;
            }

            // DOM
            this.element = document.createElement('div');
            this.element.className = 'player-lane';

            this.label = document.createElement('div');
            this.label.className = 'lane-label';
            this.label.textContent = `${track.name} (Mikrofon)`;
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

            // Start microphone
            this.micStream = null;
            this.analyser = null;
            this.initMicrophone();
        }

        async initMicrophone() {
            try {
                this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioCtx = Synth.getAudioContext() || new AudioContext();
                const source = audioCtx.createMediaStreamSource(this.micStream);
                this.analyser = audioCtx.createAnalyser();
                this.analyser.fftSize = 4096;
                source.connect(this.analyser);
                this.bufferLength = this.analyser.fftSize;
                this.audioBuffer = new Float32Array(this.bufferLength);
            } catch (err) {
                console.warn('Mikrofon ej tillgänglig:', err);
                this.label.textContent = `${this.track.name} (Ingen mikrofon!)`;
            }
        }

        resize() {
            const rect = this.element.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }

        detectPitch() {
            if (!this.analyser) return -1;

            this.analyser.getFloatTimeDomainData(this.audioBuffer);

            // Autocorrelation pitch detection
            const buf = this.audioBuffer;
            const len = buf.length;

            // Check if signal is strong enough
            let rms = 0;
            for (let i = 0; i < len; i++) rms += buf[i] * buf[i];
            rms = Math.sqrt(rms / len);
            if (rms < 0.01) return -1; // too quiet

            // Find fundamental frequency via autocorrelation
            let bestCorrelation = 0;
            let bestOffset = -1;
            const minPeriod = Math.floor(44100 / 1000); // 1000 Hz max
            const maxPeriod = Math.floor(44100 / 60);   // 60 Hz min

            for (let offset = minPeriod; offset < maxPeriod && offset < len / 2; offset++) {
                let correlation = 0;
                for (let i = 0; i < len / 2; i++) {
                    correlation += buf[i] * buf[i + offset];
                }
                if (correlation > bestCorrelation) {
                    bestCorrelation = correlation;
                    bestOffset = offset;
                }
            }

            if (bestOffset === -1 || bestCorrelation < 0.01) return -1;

            const frequency = 44100 / bestOffset;
            // Convert frequency to MIDI note
            const midiNote = 69 + 12 * Math.log2(frequency / 440);
            return midiNote;
        }

        update(currentTime) {
            // Detect pitch
            const rawPitch = this.detectPitch();
            this.pitchHistory.push(rawPitch);
            if (this.pitchHistory.length > 5) this.pitchHistory.shift();

            // Smoothed pitch (median filter)
            const validPitches = this.pitchHistory.filter(p => p > 0);
            this.currentPitch = validPitches.length > 0
                ? validPitches.sort((a, b) => a - b)[Math.floor(validPitches.length / 2)]
                : -1;

            // Add visible notes
            const lookAhead = this.canvas.width / NOTE_SPEED + 0.5;
            while (this.nextNoteIndex < this.track.notes.length) {
                const note = this.track.notes[this.nextNoteIndex];
                if (note.startTime <= currentTime + lookAhead) {
                    this.activeNotes.push({ ...note, scored: false, missed: false, matchFrames: 0 });
                    this.nextNoteIndex++;
                } else break;
            }

            // Score notes based on pitch matching
            for (const note of this.activeNotes) {
                if (note.scored || note.missed) continue;

                // Is this note currently active (should be singing now)?
                if (currentTime >= note.startTime && currentTime <= note.endTime) {
                    if (this.currentPitch > 0) {
                        const diff = Math.abs(this.currentPitch - note.note);
                        if (diff < 1.0) note.matchFrames += 3;      // perfect pitch
                        else if (diff < 2.0) note.matchFrames += 2; // good
                        else if (diff < 3.0) note.matchFrames += 1; // ok
                    }
                }

                // Note ended - evaluate
                if (currentTime > note.endTime + 0.1) {
                    const durationFrames = Math.max(1, (note.duration / 0.016)); // ~60fps
                    const matchRatio = note.matchFrames / durationFrames;

                    note.scored = true;
                    if (matchRatio > 0.6) {
                        this.hits.perfect++;
                        this.score += 100 * (1 + this.combo * 0.1);
                        this.combo++;
                        this.showHitFlash('perfect');
                    } else if (matchRatio > 0.3) {
                        this.hits.good++;
                        this.score += 50 * (1 + this.combo * 0.05);
                        this.combo++;
                        this.showHitFlash('good');
                    } else if (matchRatio > 0.1) {
                        this.hits.ok++;
                        this.score += 25;
                        this.combo++;
                        this.showHitFlash('ok');
                    } else {
                        note.missed = true;
                        this.hits.miss++;
                        this.combo = 0;
                        this.showHitFlash('miss');
                    }
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                }
            }

            // Cleanup
            this.activeNotes = this.activeNotes.filter(n => currentTime < n.endTime + 2);
        }

        render(currentTime) {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;
            ctx.clearRect(0, 0, w, h);

            const noteRange = this.maxNote - this.minNote;
            const playheadX = w * 0.25; // notes scroll right to left, playhead at 25%

            // Draw pitch grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            const NOTE_NAMES = ['C', '', 'D', '', 'E', 'F', '', 'G', '', 'A', '', 'B'];
            for (let n = this.minNote; n <= this.maxNote; n++) {
                const y = h - ((n - this.minNote) / noteRange) * (h * 0.8) - h * 0.1;
                const noteName = NOTE_NAMES[n % 12];
                if (noteName) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();

                    if (n % 12 === 0) { // C notes
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.font = '10px sans-serif';
                        ctx.textAlign = 'left';
                        ctx.fillText(`C${Math.floor(n / 12) - 1}`, 4, y - 2);
                    }
                }
            }

            // Draw playhead
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, h);
            ctx.stroke();

            // Draw notes (scrolling left)
            for (const note of this.activeNotes) {
                const noteY = h - ((note.note - this.minNote) / noteRange) * (h * 0.8) - h * 0.1;
                const startX = playheadX + (note.startTime - currentTime) * NOTE_SPEED;
                const endX = playheadX + (note.endTime - currentTime) * NOTE_SPEED;
                const noteW = Math.max(endX - startX, 8);

                const isActive = currentTime >= note.startTime && currentTime <= note.endTime;

                // Note bar
                ctx.fillStyle = note.missed ? 'rgba(100,100,100,0.3)' :
                    note.scored ? 'rgba(72,219,251,0.3)' :
                    isActive ? '#48dbfb' : 'rgba(72,219,251,0.6)';
                ctx.beginPath();
                ctx.roundRect(startX, noteY - 8, noteW, 16, 4);
                ctx.fill();

                // Note name
                if (noteW > 30) {
                    ctx.fillStyle = note.missed ? '#555' : '#fff';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(note.noteName, startX + noteW / 2, noteY + 4);
                }

                // Glow if active
                if (isActive && !note.scored) {
                    ctx.shadowColor = '#48dbfb';
                    ctx.shadowBlur = 10;
                    ctx.strokeStyle = '#48dbfb';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(startX, noteY - 8, noteW, 16, 4);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            // Draw current pitch indicator
            if (this.currentPitch > 0 && this.currentPitch >= this.minNote && this.currentPitch <= this.maxNote) {
                const pitchY = h - ((this.currentPitch - this.minNote) / noteRange) * (h * 0.8) - h * 0.1;
                ctx.fillStyle = '#ffa500';
                ctx.shadowColor = '#ffa500';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(playheadX, pitchY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Pitch trail
                ctx.strokeStyle = 'rgba(255,165,0,0.3)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(playheadX - 40, pitchY);
                ctx.lineTo(playheadX, pitchY);
                ctx.stroke();
            }

            // Combo
            if (this.combo >= 5) {
                this.comboDisplay.textContent = `${this.combo}x`;
                this.comboDisplay.style.color = this.combo >= 20 ? '#ff6bd6' :
                    this.combo >= 10 ? '#ffa500' : '#48dbfb';
            } else {
                this.comboDisplay.textContent = '';
            }
        }

        // Vocals don't use keyboard
        handleKeyDown() { return null; }

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

        destroy() {
            if (this.micStream) {
                this.micStream.getTracks().forEach(t => t.stop());
            }
        }
    }

    // ==================== INSTRUMENT LANE (guitar, bass, drums, piano) ====================

    class InstrumentLane {
        constructor(playerIndex, track, container, instrumentConfig) {
            this.playerIndex = playerIndex;
            this.track = track;
            this.config = instrumentConfig;
            this.color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
            this.keys = instrumentConfig.keys[playerIndex % instrumentConfig.keys.length];
            this.laneCount = instrumentConfig.lanes;

            // Re-map all notes to this instrument's lanes
            for (const note of track.notes) {
                note.lane = instrumentConfig.noteMapper(note.note, this.laneCount);
            }

            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.hits = { perfect: 0, good: 0, ok: 0, miss: 0 };
            this.totalNotes = track.notes.length;
            this.nextNoteIndex = 0;
            this.activeNotes = [];

            // DOM
            this.element = document.createElement('div');
            this.element.className = 'player-lane';

            this.label = document.createElement('div');
            this.label.className = 'lane-label';
            this.label.textContent = `${track.name} (${this.keys.map(k => k.toUpperCase()).join(' ')})`;
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

            // Particle system for this lane
            this.particles = new Effects.ParticleSystem();
            this.hitLabels = [];
            this.missShakeTime = 0;
            this.lastFrameTime = 0;

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
            const dt = this.lastFrameTime ? (currentTime - this.lastFrameTime) : 0.016;
            this.lastFrameTime = currentTime;

            const lookAhead = this.canvas.height / NOTE_SPEED + 0.5;
            while (this.nextNoteIndex < this.track.notes.length) {
                const note = this.track.notes[this.nextNoteIndex];
                if (note.startTime <= currentTime + lookAhead) {
                    this.activeNotes.push({ ...note, hit: false, missed: false });
                    this.nextNoteIndex++;
                } else break;
            }

            for (const note of this.activeNotes) {
                if (!note.hit && !note.missed && currentTime > note.startTime + OK_WINDOW) {
                    note.missed = true;
                    this.hits.miss++;
                    this.combo = 0;
                    this.missShakeTime = 0.2;
                }
            }

            this.activeNotes = this.activeNotes.filter(n => {
                const y = this.hitZoneY + (currentTime - n.startTime) * NOTE_SPEED;
                return y < this.canvas.height + 100;
            });

            // Update effects
            this.particles.update(Math.abs(dt));
            this.missShakeTime = Math.max(0, this.missShakeTime - Math.abs(dt));

            // Streak fire particles
            if (Effects.shouldShowFire(this.combo)) {
                const laneWidth = this.canvas.width / this.laneCount;
                const fireColor = Effects.getStreakColor(this.combo);
                for (let i = 0; i < this.laneCount; i++) {
                    if (Math.random() < 0.3) {
                        this.particles.emit(
                            (i + 0.5) * laneWidth,
                            this.hitZoneY,
                            fireColor,
                            1,
                            'fire'
                        );
                    }
                }
            }

            // Update hit labels
            for (const l of this.hitLabels) {
                l.y -= 60 * Math.abs(dt);
                l.life -= Math.abs(dt);
            }
            this.hitLabels = this.hitLabels.filter(l => l.life > 0);
        }

        render(currentTime) {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            // Shake on miss
            ctx.save();
            if (this.missShakeTime > 0) {
                const shake = Effects.getShakeOffset(this.combo, this.missShakeTime);
                ctx.translate(shake.x, shake.y);
            }

            ctx.clearRect(-5, -5, w + 10, h + 10);

            // Background pulse
            Effects.renderBgPulse(ctx, w, h);

            const laneWidth = w / this.laneCount;

            // Lane dividers
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1;
            for (let i = 1; i < this.laneCount; i++) {
                ctx.beginPath();
                ctx.moveTo(i * laneWidth, 0);
                ctx.lineTo(i * laneWidth, h);
                ctx.stroke();
            }

            // Hit zone glow per lane
            for (let i = 0; i < this.laneCount; i++) {
                Effects.renderHitZoneGlow(
                    ctx, i * laneWidth, laneWidth,
                    this.hitZoneY, this.combo,
                    this.config.laneColors[i]
                );
            }

            // Hit zone line
            ctx.fillStyle = this.combo >= 10
                ? `rgba(255, 165, 0, ${0.15 + 0.1 * Math.sin(performance.now() / 200)})`
                : 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(0, this.hitZoneY - 2, w, 4);

            // Lane labels + key labels
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            for (let i = 0; i < this.laneCount; i++) {
                const cx = (i + 0.5) * laneWidth;

                ctx.fillStyle = this.config.laneColors[i] || '#444';
                ctx.globalAlpha = 0.3;
                ctx.fillText(this.config.laneLabels[i] || '', cx, this.hitZoneY - 12);
                ctx.globalAlpha = 1;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillText(this.keys[i].toUpperCase(), cx, this.hitZoneY + 22);
            }

            // Notes
            for (const note of this.activeNotes) {
                if (note.hit) continue;

                const lane = note.lane;
                const x = lane * laneWidth;
                const timeDiff = note.startTime - currentTime;
                const y = this.hitZoneY - timeDiff * NOTE_SPEED;

                const noteH = Math.max(note.duration * NOTE_SPEED, 20);
                const noteW = laneWidth - 6;
                const noteX = x + 3;
                const noteY = y - noteH;

                const baseColor = this.config.laneColors[lane] || '#48dbfb';
                const color = note.missed ? 'rgba(100,100,100,0.3)' : baseColor;

                // Approaching glow
                if (!note.missed && Math.abs(timeDiff) < 0.3) {
                    const glowAlpha = (1 - Math.abs(timeDiff) / 0.3) * 0.3;
                    ctx.shadowColor = baseColor;
                    ctx.shadowBlur = 12 * glowAlpha;
                }

                // Note body
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(noteX, noteY, noteW, noteH, 4);
                ctx.fill();

                ctx.shadowBlur = 0;

                // Note head
                if (!note.missed) {
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.roundRect(noteX, y - 5, noteW, 5, 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }

                // Note name
                if (noteH > 18) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(note.noteName, noteX + noteW / 2, noteY + noteH / 2 + 4);
                }
            }

            // Render particles
            this.particles.render(ctx);

            // Render hit labels
            for (const label of this.hitLabels) {
                const alpha = Math.max(0, label.life / label.maxLife);
                const scale = label.scale * (1 + (1 - alpha) * 0.3);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = label.color;
                ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowColor = label.color;
                ctx.shadowBlur = 8;
                ctx.fillText(label.text, label.x, label.y);
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;

            ctx.restore();

            // Combo display
            if (this.combo >= 5) {
                this.comboDisplay.textContent = `${this.combo}x`;
                const comboColor = this.combo >= 30 ? '#ff6bd6' :
                    this.combo >= 20 ? '#ff4444' :
                    this.combo >= 10 ? '#ffa500' : '#48dbfb';
                this.comboDisplay.style.color = comboColor;
                this.comboDisplay.style.textShadow = `0 0 10px ${comboColor}`;
            } else {
                this.comboDisplay.textContent = '';
                this.comboDisplay.style.textShadow = '';
            }
        }

        handleKeyDown(laneIndex, currentTime) {
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
                const laneWidth = this.canvas.width / this.laneCount;
                const hitX = (laneIndex + 0.5) * laneWidth;
                let quality;

                if (bestDist <= PERFECT_WINDOW) {
                    quality = 'perfect';
                    this.score += 100 * (1 + this.combo * 0.1);
                    this.hits.perfect++;
                    // Big burst
                    const color = this.config.laneColors[laneIndex] || '#48dbfb';
                    this.particles.emit(hitX, this.hitZoneY, color, 12, 'burst');
                    this.particles.emit(hitX, this.hitZoneY, '#fff', 6, 'spark');
                    Effects.triggerBgPulse();
                } else if (bestDist <= GOOD_WINDOW) {
                    quality = 'good';
                    this.score += 50 * (1 + this.combo * 0.05);
                    this.hits.good++;
                    this.particles.emit(hitX, this.hitZoneY, '#ffa500', 6, 'burst');
                } else {
                    quality = 'ok';
                    this.score += 25;
                    this.hits.ok++;
                    this.particles.emit(hitX, this.hitZoneY, '#888', 3, 'burst');
                }

                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                // Hit label
                const labelText = quality === 'perfect' ? 'PERFECT!' :
                                  quality === 'good' ? 'GOOD' : 'OK';
                const labelColor = quality === 'perfect' ? '#48dbfb' :
                                   quality === 'good' ? '#ffa500' : '#aaa';
                this.hitLabels.push({
                    x: hitX, y: this.hitZoneY - 30,
                    text: labelText, color: labelColor,
                    life: 0.7, maxLife: 0.7,
                    scale: quality === 'perfect' ? 1.4 : 1.0,
                });

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

        destroy() {}
    }

    // ==================== MAIN GAME STATE ====================

    // Filter notes for easy mode — keep every Nth note, but always keep
    // notes that start a new "phrase" (gap > 1s from previous)
    function filterNotesForDifficulty(notes, keepRatio) {
        if (keepRatio >= 1.0) return notes;
        const result = [];
        let kept = 0;
        for (let i = 0; i < notes.length; i++) {
            const isPhraseBoundary = i === 0 ||
                (notes[i].startTime - notes[i - 1].startTime) > 1.0;
            // Keep phrase boundaries and every Nth note
            if (isPhraseBoundary || (i % Math.round(1 / keepRatio)) === 0) {
                result.push(notes[i]);
                kept++;
            }
        }
        return result;
    }

    let players = [];
    let songData = null;
    let startTime = 0;
    let isPlaying = false;
    let animFrameId = null;
    let onGameEnd = null;
    let backingTracks = [];

    function setPracticeTempo(t) {
        practiceTempo = Math.max(0.25, Math.min(1.0, t));
    }

    function start(song, playerConfigs, endCallback, difficulty, options) {
        practiceMode = options && options.practice || false;
        practiceTempo = options && options.tempo || 1.0;
        // Apply difficulty
        currentDifficulty = difficulty || 'medium';
        const preset = DIFFICULTY_PRESETS[currentDifficulty] || DIFFICULTY_PRESETS.medium;
        NOTE_SPEED = BASE_NOTE_SPEED * preset.speedMult;
        PERFECT_WINDOW = BASE_PERFECT_WINDOW * preset.windowMult;
        GOOD_WINDOW = BASE_GOOD_WINDOW * preset.windowMult;
        OK_WINDOW = BASE_OK_WINDOW * preset.windowMult;

        // Filter notes on a deep copy so original song data isn't mutated
        const tempoScale = practiceMode ? (1 / practiceTempo) : 1;
        const filteredSong = {
            ...song,
            duration: song.duration * tempoScale,
            tracks: song.tracks.map(t => ({
                ...t,
                notes: filterNotesForDifficulty([...t.notes], preset.noteKeepRatio).map(n => ({
                    ...n,
                    startTime: n.startTime * tempoScale,
                    endTime: n.endTime ? n.endTime * tempoScale : undefined,
                    duration: n.duration * tempoScale,
                })),
            })),
        };

        songData = filteredSong;
        onGameEnd = endCallback;
        players = [];
        backingTracks = [];

        Synth.init();
        Synth.resume();

        const container = document.getElementById('game-area');
        container.innerHTML = '';

        const assignedTracks = new Set();

        for (let i = 0; i < playerConfigs.length; i++) {
            const cfg = playerConfigs[i];
            const track = filteredSong.tracks.find(t => t.name === cfg.trackName || t.role === cfg.role);
            if (!track) continue;

            assignedTracks.add(track);
            const instConfig = getInstrumentConfig(track.role);

            let lane;
            if (instConfig.isVocal) {
                lane = new VocalLane(i, track, container);
            } else {
                lane = new InstrumentLane(i, track, container, instConfig);
            }
            players.push(lane);
        }

        // Backing tracks
        for (const track of filteredSong.tracks) {
            if (!assignedTracks.has(track)) {
                backingTracks.push(track);
            }
        }

        // Key hints
        const hintEl = document.getElementById('key-hints');
        hintEl.innerHTML = players.map(p => {
            if (p instanceof VocalLane) {
                return `<div class="key-hint"><span style="color:${p.color}">${p.track.name}:</span> Mikrofon</div>`;
            }
            return `<div class="key-hint">
                <span style="color:${p.color}">${p.track.name}:</span>
                ${p.keys.map(k => `<kbd>${k.toUpperCase()}</kbd>`).join(' ')}
            </div>`;
        }).join('');

        startTime = performance.now() / 1000 + 4; // 3s countdown + 1s buffer

        isPlaying = true;
        window.addEventListener('resize', handleResize);
        handleResize();

        // Setup touch input on each player canvas
        for (const player of players) {
            if (player instanceof VocalLane) continue;
            player.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        }

        // Show countdown, then enable input and start backing
        Effects.showCountdown(3, () => {
            document.addEventListener('keydown', handleKeyDown);
            for (const track of backingTracks) {
                Synth.scheduleBackingTrack(track, 0);
            }
        });

        gameLoop();
    }

    function handleResize() {
        for (const player of players) player.resize();
    }

    function handleTouch(e) {
        if (!isPlaying) return;
        e.preventDefault();

        const currentTime = performance.now() / 1000 - startTime;

        // Find which player owns this canvas
        for (const player of players) {
            if (player instanceof VocalLane) continue;
            if (player.canvas !== e.target) continue;

            const rect = player.canvas.getBoundingClientRect();
            const laneWidth = rect.width / player.laneCount;

            // Handle each touch point
            for (const touch of e.changedTouches) {
                const x = touch.clientX - rect.left;
                const laneIndex = Math.min(
                    player.laneCount - 1,
                    Math.max(0, Math.floor(x / laneWidth))
                );
                player.handleKeyDown(laneIndex, currentTime);
            }
            break;
        }
    }

    function handleKeyDown(e) {
        if (!isPlaying) return;
        const key = e.key.toLowerCase();
        const currentTime = performance.now() / 1000 - startTime;

        for (const player of players) {
            if (player instanceof VocalLane) continue;
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

        Effects.updateBgPulse(0.016);

        for (const player of players) {
            player.update(currentTime);
            player.render(currentTime);
        }

        const scoreEl = document.getElementById('score-display');
        if (practiceMode) {
            scoreEl.innerHTML = `<div class="practice-badge">&oplus; Övning ${Math.round(practiceTempo * 100)}%</div>`;
        } else {
            scoreEl.innerHTML = players.map(p =>
                `<div class="player-score">
                    <span class="dot" style="background:${p.color}"></span>
                    ${Math.round(p.score)}
                </div>`
            ).join('');
        }

        const progressEl = document.getElementById('song-progress');
        const mins = Math.floor(Math.max(0, currentTime) / 60);
        const secs = Math.floor(Math.max(0, currentTime) % 60);
        const totalMins = Math.floor(songData.duration / 60);
        const totalSecs = Math.floor(songData.duration % 60);
        progressEl.textContent = `${mins}:${secs.toString().padStart(2,'0')} / ${totalMins}:${totalSecs.toString().padStart(2,'0')}`;

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
        Effects.hideCountdown();

        // Remove touch listeners
        for (const player of players) {
            if (player instanceof VocalLane) continue;
            player.canvas.removeEventListener('touchstart', handleTouch);
        }

        for (const player of players) {
            if (player.destroy) player.destroy();
        }

        if (onGameEnd) {
            onGameEnd(players.map(p => p.getResults()), practiceMode);
        }
    }

    function getInstrumentForRole(role) {
        return getInstrumentConfig(role);
    }

    return { start, stop, getInstrumentForRole, PLAYER_COLORS, getDifficulty: () => currentDifficulty, setPracticeTempo, isPractice: () => practiceMode };
})();
