/**
 * MIDI Parser - Parses standard MIDI files (.mid) into game-friendly format.
 * Extracts separate instrument tracks with note events.
 */
const MidiParser = (() => {

    // GM instrument categories mapped to game roles
    const INSTRUMENT_ROLES = {
        // Piano (0-7)
        0: 'piano', 1: 'piano', 2: 'piano', 3: 'piano',
        4: 'piano', 5: 'piano', 6: 'piano', 7: 'piano',
        // Guitar (24-31)
        24: 'gitarr', 25: 'gitarr', 26: 'gitarr', 27: 'gitarr',
        28: 'gitarr', 29: 'gitarr', 30: 'gitarr', 31: 'gitarr',
        // Bass (32-39)
        32: 'bas', 33: 'bas', 34: 'bas', 35: 'bas',
        36: 'bas', 37: 'bas', 38: 'bas', 39: 'bas',
        // Strings (40-55)
        40: 'stråkar', 41: 'stråkar', 42: 'stråkar', 43: 'stråkar',
        44: 'stråkar', 45: 'stråkar', 46: 'stråkar', 47: 'stråkar',
        48: 'stråkar', 49: 'stråkar', 50: 'stråkar', 51: 'stråkar',
        52: 'sång', 53: 'sång', 54: 'sång', 55: 'stråkar',
        // Brass (56-63)
        56: 'blås', 57: 'blås', 58: 'blås', 59: 'blås',
        60: 'blås', 61: 'blås', 62: 'blås', 63: 'blås',
        // Woodwind (64-79)
        64: 'blås', 65: 'blås', 66: 'blås', 67: 'blås',
        68: 'blås', 69: 'blås', 70: 'blås', 71: 'blås',
        72: 'blås', 73: 'blås', 74: 'blås', 75: 'blås',
        76: 'blås', 77: 'blås', 78: 'blås', 79: 'blås',
    };

    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    function noteToName(noteNum) {
        const octave = Math.floor(noteNum / 12) - 1;
        const name = NOTE_NAMES[noteNum % 12];
        return `${name}${octave}`;
    }

    // Map note to one of 4 game lanes (for keyboard input)
    function noteToLane(noteNum) {
        return noteNum % 4;
    }

    class MidiReader {
        constructor(buffer) {
            this.data = new Uint8Array(buffer);
            this.pos = 0;
        }

        readUint8() {
            return this.data[this.pos++];
        }

        readUint16() {
            const val = (this.data[this.pos] << 8) | this.data[this.pos + 1];
            this.pos += 2;
            return val;
        }

        readUint32() {
            const val = (this.data[this.pos] << 24) | (this.data[this.pos + 1] << 16) |
                        (this.data[this.pos + 2] << 8) | this.data[this.pos + 3];
            this.pos += 4;
            return val >>> 0;
        }

        readString(len) {
            let s = '';
            for (let i = 0; i < len; i++) {
                s += String.fromCharCode(this.data[this.pos++]);
            }
            return s;
        }

        readVarLen() {
            let val = 0;
            let byte;
            do {
                byte = this.data[this.pos++];
                val = (val << 7) | (byte & 0x7F);
            } while (byte & 0x80);
            return val;
        }

        eof() {
            return this.pos >= this.data.length;
        }
    }

    function parse(arrayBuffer) {
        const reader = new MidiReader(arrayBuffer);

        // Read header
        const headerChunk = reader.readString(4);
        if (headerChunk !== 'MThd') throw new Error('Inte en giltig MIDI-fil');

        const headerLen = reader.readUint32();
        const format = reader.readUint16();
        const numTracks = reader.readUint16();
        const ticksPerBeat = reader.readUint16();

        const rawTracks = [];

        // Read all tracks
        for (let t = 0; t < numTracks; t++) {
            const trackChunk = reader.readString(4);
            if (trackChunk !== 'MTrk') {
                throw new Error(`Ogiltigt track-chunk: ${trackChunk}`);
            }
            const trackLen = reader.readUint32();
            const trackEnd = reader.pos + trackLen;
            const events = [];
            let runningStatus = 0;

            while (reader.pos < trackEnd) {
                const delta = reader.readVarLen();
                let statusByte = reader.data[reader.pos];

                if (statusByte & 0x80) {
                    reader.pos++;
                    runningStatus = statusByte;
                } else {
                    statusByte = runningStatus;
                }

                const eventType = statusByte & 0xF0;
                const channel = statusByte & 0x0F;

                if (statusByte === 0xFF) {
                    // Meta event
                    const metaType = reader.readUint8();
                    const metaLen = reader.readVarLen();
                    const metaData = reader.data.slice(reader.pos, reader.pos + metaLen);
                    reader.pos += metaLen;

                    if (metaType === 0x51) {
                        // Tempo
                        const tempo = (metaData[0] << 16) | (metaData[1] << 8) | metaData[2];
                        events.push({ delta, type: 'tempo', tempo });
                    } else if (metaType === 0x03) {
                        // Track name
                        let name = '';
                        for (let i = 0; i < metaData.length; i++) {
                            name += String.fromCharCode(metaData[i]);
                        }
                        events.push({ delta, type: 'trackName', name });
                    } else if (metaType === 0x2F) {
                        events.push({ delta, type: 'endOfTrack' });
                    } else {
                        events.push({ delta, type: 'meta', metaType });
                    }
                } else if (statusByte >= 0xF0 && statusByte <= 0xFE) {
                    // SysEx
                    const len = reader.readVarLen();
                    reader.pos += len;
                    events.push({ delta, type: 'sysex' });
                } else if (eventType === 0x90) {
                    // Note On
                    const note = reader.readUint8();
                    const velocity = reader.readUint8();
                    events.push({ delta, type: velocity > 0 ? 'noteOn' : 'noteOff', channel, note, velocity });
                } else if (eventType === 0x80) {
                    // Note Off
                    const note = reader.readUint8();
                    const velocity = reader.readUint8();
                    events.push({ delta, type: 'noteOff', channel, note, velocity });
                } else if (eventType === 0xC0) {
                    // Program Change
                    const program = reader.readUint8();
                    events.push({ delta, type: 'programChange', channel, program });
                } else if (eventType === 0xB0) {
                    // Control Change
                    reader.readUint8();
                    reader.readUint8();
                    events.push({ delta, type: 'controlChange', channel });
                } else if (eventType === 0xE0) {
                    // Pitch Bend
                    reader.readUint8();
                    reader.readUint8();
                    events.push({ delta, type: 'pitchBend', channel });
                } else if (eventType === 0xD0) {
                    // Channel Pressure
                    reader.readUint8();
                    events.push({ delta, type: 'channelPressure', channel });
                } else if (eventType === 0xA0) {
                    // Poly Pressure
                    reader.readUint8();
                    reader.readUint8();
                    events.push({ delta, type: 'polyPressure', channel });
                } else {
                    // Unknown - skip
                    events.push({ delta, type: 'unknown' });
                }
            }

            reader.pos = trackEnd;
            rawTracks.push(events);
        }

        return processRawTracks(rawTracks, ticksPerBeat);
    }

    function processRawTracks(rawTracks, ticksPerBeat) {
        let globalTempo = 500000; // default 120 BPM
        const tracks = [];

        for (const rawEvents of rawTracks) {
            let tickPos = 0;
            let trackName = '';
            let program = 0;
            let channel = 0;
            const noteOns = {};
            const notes = [];
            const tempoChanges = [];

            for (const evt of rawEvents) {
                tickPos += evt.delta;

                if (evt.type === 'trackName') {
                    trackName = evt.name;
                } else if (evt.type === 'programChange') {
                    program = evt.program;
                    channel = evt.channel;
                } else if (evt.type === 'tempo') {
                    tempoChanges.push({ tick: tickPos, tempo: evt.tempo });
                    if (tempoChanges.length === 1) globalTempo = evt.tempo;
                } else if (evt.type === 'noteOn') {
                    channel = evt.channel;
                    const key = `${evt.channel}-${evt.note}`;
                    noteOns[key] = { tick: tickPos, velocity: evt.velocity, note: evt.note };
                } else if (evt.type === 'noteOff') {
                    const key = `${evt.channel}-${evt.note}`;
                    if (noteOns[key]) {
                        notes.push({
                            note: evt.note,
                            noteName: noteToName(evt.note),
                            lane: noteToLane(evt.note),
                            startTick: noteOns[key].tick,
                            endTick: tickPos,
                            velocity: noteOns[key].velocity,
                        });
                        delete noteOns[key];
                    }
                }
            }

            if (notes.length > 0) {
                const isDrums = channel === 9;
                const role = isDrums ? 'trummor' : (INSTRUMENT_ROLES[program] || 'synth');
                tracks.push({
                    name: trackName || role,
                    role,
                    program,
                    channel,
                    isDrums,
                    notes: notes.sort((a, b) => a.startTick - b.startTick),
                });
            }

            if (tempoChanges.length > 0 && notes.length === 0) {
                // Tempo track - store tempo changes
                tracks._tempoChanges = tempoChanges;
            }
        }

        // Convert ticks to seconds
        const bpm = 60000000 / globalTempo;
        const secPerTick = globalTempo / (ticksPerBeat * 1000000);

        for (const track of tracks) {
            for (const note of track.notes) {
                note.startTime = note.startTick * secPerTick;
                note.endTime = note.endTick * secPerTick;
                note.duration = note.endTime - note.startTime;
            }
            track.duration = track.notes.length > 0
                ? track.notes[track.notes.length - 1].endTime
                : 0;
        }

        return {
            ticksPerBeat,
            bpm: Math.round(bpm),
            secPerTick,
            tracks,
            duration: Math.max(...tracks.map(t => t.duration), 0),
        };
    }

    // Helper to build a song from patterns
    function buildSong(title, bpm, trackDefs) {
        const beatDuration = 60 / bpm;

        function makeNote(noteNum, startBeat, durationBeats) {
            return {
                note: noteNum,
                noteName: noteToName(noteNum),
                lane: noteToLane(noteNum),
                startTick: startBeat * 480,
                endTick: (startBeat + durationBeats) * 480,
                startTime: startBeat * beatDuration,
                endTime: (startBeat + durationBeats) * beatDuration,
                duration: durationBeats * beatDuration,
                velocity: 100,
            };
        }

        let maxBeat = 0;
        const tracks = trackDefs.map(def => {
            const notes = def.pattern.map(([n, b, d]) => {
                if (b + d > maxBeat) maxBeat = b + d;
                return makeNote(n, b, d);
            });
            return {
                name: def.name,
                role: def.role,
                program: def.program || 0,
                channel: def.channel || 0,
                isDrums: def.isDrums || false,
                notes,
                duration: maxBeat * beatDuration,
            };
        });

        const duration = maxBeat * beatDuration;
        tracks.forEach(t => t.duration = duration);

        return {
            title,
            ticksPerBeat: 480,
            bpm,
            secPerTick: beatDuration / 480,
            duration,
            tracks,
        };
    }

    // ==================== SONG LIBRARY ====================

    function createSongLibrary() {
        const songs = {};

        // --- 1. Twinkle Twinkle Little Star ---
        {
            const C4=60,D4=62,E4=64,F4=65,G4=67,A4=69;
            const C3=48,F3=53,G3=55,E3=52;

            songs['twinkle'] = buildSong('Twinkle Twinkle Little Star', 120, [
                { name: 'Melodi', role: 'sång', channel: 0, pattern: [
                    [C4,0,1],[C4,1,1],[G4,2,1],[G4,3,1],[A4,4,1],[A4,5,1],[G4,6,2],
                    [F4,8,1],[F4,9,1],[E4,10,1],[E4,11,1],[D4,12,1],[D4,13,1],[C4,14,2],
                    [G4,16,1],[G4,17,1],[F4,18,1],[F4,19,1],[E4,20,1],[E4,21,1],[D4,22,2],
                    [G4,24,1],[G4,25,1],[F4,26,1],[F4,27,1],[E4,28,1],[E4,29,1],[D4,30,2],
                    [C4,32,1],[C4,33,1],[G4,34,1],[G4,35,1],[A4,36,1],[A4,37,1],[G4,38,2],
                    [F4,40,1],[F4,41,1],[E4,42,1],[E4,43,1],[D4,44,1],[D4,45,1],[C4,46,2],
                ]},
                { name: 'Bas', role: 'bas', program: 33, channel: 1, pattern: [
                    [C3,0,2],[C3,2,2],[F3,4,2],[C3,6,2],
                    [F3,8,2],[C3,10,2],[G3,12,2],[C3,14,2],
                    [C3,16,2],[F3,18,2],[C3,20,2],[G3,22,2],
                    [C3,24,2],[F3,26,2],[C3,28,2],[G3,30,2],
                    [C3,32,2],[C3,34,2],[F3,36,2],[C3,38,2],
                    [F3,40,2],[C3,42,2],[G3,44,2],[C3,46,2],
                ]},
                { name: 'Piano', role: 'piano', channel: 2, pattern: [
                    [C3,0,4],[E3,0,4],[G3,0,4],
                    [F3,4,4],[57,4,4],[C4,4,4],
                    [F3,8,4],[57,8,4],[C4,8,4],
                    [G3,12,4],[59,12,4],[D4,12,4],
                    [C3,16,4],[E3,16,4],[G3,16,4],
                    [F3,20,4],[57,20,4],[C4,20,4],
                    [C3,24,4],[E3,24,4],[G3,24,4],
                    [G3,28,4],[59,28,4],[D4,28,4],
                    [C3,32,4],[E3,32,4],[G3,32,4],
                    [F3,36,4],[57,36,4],[C4,36,4],
                    [F3,40,4],[57,40,4],[C4,40,4],
                    [G3,44,4],[59,44,4],[C4,46,2],
                ]},
            ]);
        }

        // --- 2. Ode to Joy (Beethoven) ---
        {
            const E4=64,F4=65,G4=67,D4=62,C4=60,B3=59,A3=57;
            const C3=48,G3=55,F3=53,E3=52,D3=50,B2=47;

            songs['ode-to-joy'] = buildSong('Ode to Joy', 108, [
                { name: 'Melodi', role: 'sång', channel: 0, pattern: [
                    // Theme A
                    [E4,0,1],[E4,1,1],[F4,2,1],[G4,3,1],
                    [G4,4,1],[F4,5,1],[E4,6,1],[D4,7,1],
                    [C4,8,1],[C4,9,1],[D4,10,1],[E4,11,1],
                    [E4,12,1.5],[D4,13.5,0.5],[D4,14,2],
                    // Theme A repeat
                    [E4,16,1],[E4,17,1],[F4,18,1],[G4,19,1],
                    [G4,20,1],[F4,21,1],[E4,22,1],[D4,23,1],
                    [C4,24,1],[C4,25,1],[D4,26,1],[E4,27,1],
                    [D4,28,1.5],[C4,29.5,0.5],[C4,30,2],
                    // Theme B
                    [D4,32,1],[D4,33,1],[E4,34,1],[C4,35,1],
                    [D4,36,1],[E4,37,0.5],[F4,37.5,0.5],[E4,38,1],[C4,39,1],
                    [D4,40,1],[E4,41,0.5],[F4,41.5,0.5],[E4,42,1],[D4,43,1],
                    [C4,44,1],[D4,45,1],[G3,46,2],
                    // Theme A final
                    [E4,48,1],[E4,49,1],[F4,50,1],[G4,51,1],
                    [G4,52,1],[F4,53,1],[E4,54,1],[D4,55,1],
                    [C4,56,1],[C4,57,1],[D4,58,1],[E4,59,1],
                    [D4,60,1.5],[C4,61.5,0.5],[C4,62,2],
                ]},
                { name: 'Bas', role: 'bas', program: 33, channel: 1, pattern: [
                    [C3,0,2],[G3,2,2],[C3,4,2],[G3,6,2],
                    [C3,8,2],[G3,10,2],[G3,12,2],[G3,14,2],
                    [C3,16,2],[G3,18,2],[C3,20,2],[G3,22,2],
                    [C3,24,2],[G3,26,2],[C3,28,2],[C3,30,2],
                    [G3,32,2],[C3,34,2],[G3,36,2],[C3,38,2],
                    [G3,40,2],[C3,42,2],[G3,44,2],[G3,46,2],
                    [C3,48,2],[G3,50,2],[C3,52,2],[G3,54,2],
                    [C3,56,2],[G3,58,2],[C3,60,2],[C3,62,2],
                ]},
                { name: 'Gitarr', role: 'gitarr', program: 25, channel: 3, pattern: [
                    [E4,0,2],[E4,2,2],[F4,4,2],[G4,6,2],
                    [E4,8,2],[E4,10,2],[D4,12,2],[D4,14,2],
                    [E4,16,2],[E4,18,2],[F4,20,2],[G4,22,2],
                    [D4,24,2],[C4,26,2],[C4,28,2],[C4,30,2],
                    [D4,32,2],[E4,34,2],[D4,36,2],[E4,38,2],
                    [D4,40,2],[E4,42,2],[C4,44,2],[B3,46,2],
                    [E4,48,2],[E4,50,2],[F4,52,2],[G4,54,2],
                    [E4,56,2],[E4,58,2],[C4,60,2],[C4,62,2],
                ]},
            ]);
        }

        // --- 3. Happy Birthday ---
        {
            const C4=60,D4=62,E4=64,F4=65,G4=67,A4=69,Bb4=70,C5=72;
            const C3=48,F3=53,G3=55,Bb3=58;

            songs['happy-birthday'] = buildSong('Happy Birthday', 100, [
                { name: 'Melodi', role: 'sång', channel: 0, pattern: [
                    [C4,0,0.75],[C4,0.75,0.25],[D4,1,1],[C4,2,1],[F4,3,1],[E4,4,2],
                    [C4,6,0.75],[C4,6.75,0.25],[D4,7,1],[C4,8,1],[G4,9,1],[F4,10,2],
                    [C4,12,0.75],[C4,12.75,0.25],[C5,13,1],[A4,14,1],[F4,15,1],[E4,16,1],[D4,17,1],
                    [Bb4,18,0.75],[Bb4,18.75,0.25],[A4,19,1],[F4,20,1],[G4,21,1],[F4,22,2],
                ]},
                { name: 'Bas', role: 'bas', program: 33, channel: 1, pattern: [
                    [C3,0,2],[C3,2,1],[F3,3,1],[C3,4,2],
                    [C3,6,2],[C3,8,1],[G3,9,1],[F3,10,2],
                    [C3,12,2],[F3,14,2],[F3,16,1],[G3,17,1],
                    [Bb3,18,2],[F3,20,1],[G3,21,1],[F3,22,2],
                ]},
                { name: 'Piano', role: 'piano', channel: 2, pattern: [
                    [C3,0,3],[E4,0,3],[G4,0,3],
                    [F3,3,3],[A4,3,3],[C5,3,3],
                    [C3,6,3],[E4,6,3],[G4,6,3],
                    [G3,9,3],[F4,9,3],[67,9,3],
                    [C3,12,3],[E4,12,3],[G4,12,3],
                    [F3,15,3],[A4,15,3],[C5,15,3],
                    [Bb3,18,3],[70,18,3],[F4,18,3],
                    [C3,21,3],[E4,21,3],[G4,21,3],
                ]},
            ]);
        }

        // --- 4. Smoke on the Water (iconic riff) ---
        {
            const G3=55,Bb3=58,C4=60,Db4=61,F3=53,Ab3=56;
            const G2=43,Bb2=46,C3=48,F2=41;

            songs['smoke-on-the-water'] = buildSong('Smoke on the Water (Riff)', 112, [
                { name: 'Gitarr', role: 'gitarr', program: 29, channel: 0, pattern: [
                    // Riff x4
                    ...[0, 16, 32, 48].flatMap(offset => [
                        [G3,offset+0,1],[Bb3,offset+2,1],[C4,offset+4,1.5],
                        [G3,offset+6,1],[Bb3,offset+8,1],[Db4,offset+10,0.5],[C4,offset+10.5,1.5],
                        [G3,offset+12,1],[Bb3,offset+14,1],
                    ]),
                ]},
                { name: 'Bas', role: 'bas', program: 33, channel: 1, pattern: [
                    ...[0, 16, 32, 48].flatMap(offset => [
                        [G2,offset+0,2],[G2,offset+2,2],[C3,offset+4,2],
                        [G2,offset+6,2],[Bb2,offset+8,2],[C3,offset+10,2],
                        [G2,offset+12,2],[Bb2,offset+14,2],
                    ]),
                ]},
                { name: 'Trummor', role: 'trummor', channel: 9, isDrums: true, pattern: [
                    // Steady rock beat x16 bars
                    ...[...Array(16)].flatMap((_, bar) => {
                        const b = bar * 4;
                        return [
                            [36,b,0.5],[42,b,0.5],         // kick + hihat
                            [42,b+1,0.5],                   // hihat
                            [38,b+2,0.5],[42,b+2,0.5],     // snare + hihat
                            [42,b+3,0.5],                   // hihat
                        ];
                    }),
                ]},
            ]);
        }

        // --- 5. Seven Nation Army (riff) ---
        {
            const E3=52,G3=55,E4=64,D4=62,C4=60,B3=59;
            const E2=40,G2=43,D3=50,C3=48,B2=47;

            songs['seven-nation-army'] = buildSong('Seven Nation Army (Riff)', 124, [
                { name: 'Gitarr', role: 'gitarr', program: 29, channel: 0, pattern: [
                    // Riff x4
                    ...[0, 16, 32, 48].flatMap(offset => [
                        [E3,offset+0,2],[E3,offset+2,1],[G3,offset+4,1.5],
                        [E3,offset+6,1],[D4,offset+8,2],[C4,offset+10,2],
                        [B3,offset+12,4],
                    ]),
                ]},
                { name: 'Bas', role: 'bas', program: 33, channel: 1, pattern: [
                    ...[0, 16, 32, 48].flatMap(offset => [
                        [E2,offset+0,4],[G2,offset+4,2],[E2,offset+6,2],
                        [D3,offset+8,2],[C3,offset+10,2],[B2,offset+12,4],
                    ]),
                ]},
                { name: 'Trummor', role: 'trummor', channel: 9, isDrums: true, pattern: [
                    ...[...Array(16)].flatMap((_, bar) => {
                        const b = bar * 4;
                        return [
                            [36,b,0.5],[42,b,0.5],
                            [42,b+1,0.5],
                            [38,b+2,0.5],[42,b+2,0.5],
                            [42,b+3,0.5],
                        ];
                    }),
                ]},
            ]);
        }

        // --- 6. Für Elise (piano piece) ---
        {
            const E5=76,Ds5=75,B4=71,D5=74,C5=72,A4=69,E4=64,C4=60;
            const A3=57,E3=52,B3=59,C3=48,G3=55;
            const A2=45,E2=40;

            songs['fur-elise'] = buildSong('Für Elise', 130, [
                { name: 'Piano höger', role: 'piano', channel: 0, pattern: [
                    // Theme
                    [E5,0,0.5],[Ds5,0.5,0.5],[E5,1,0.5],[Ds5,1.5,0.5],
                    [E5,2,0.5],[B4,2.5,0.5],[D5,3,0.5],[C5,3.5,0.5],
                    [A4,4,1],
                    [C4,6,0.5],[E4,6.5,0.5],[A4,7,0.5],
                    [B4,8,1],
                    [E4,10,0.5],[G3+12,10.5,0.5],[B4,11,0.5],
                    [C5,12,1],
                    [E4,14,0.5],[E5,14.5,0.5],[Ds5,15,0.5],
                    // Repeat
                    [E5,16,0.5],[Ds5,16.5,0.5],[E5,17,0.5],[Ds5,17.5,0.5],
                    [E5,18,0.5],[B4,18.5,0.5],[D5,19,0.5],[C5,19.5,0.5],
                    [A4,20,1],
                    [C4,22,0.5],[E4,22.5,0.5],[A4,23,0.5],
                    [B4,24,1],
                    [E4,26,0.5],[C5,26.5,0.5],[B4,27,0.5],
                    [A4,28,2],
                ]},
                { name: 'Piano vänster', role: 'bas', program: 0, channel: 1, pattern: [
                    [A2,4,1],[E3,5,1],[A3,5.5,0.5],
                    [E2,8,1],[E3,9,1],[G3,9.5,0.5],
                    [A2,12,1],[E3,13,1],
                    [A2,20,1],[E3,21,1],[A3,21.5,0.5],
                    [E2,24,1],[E3,25,1],[G3,25.5,0.5],
                    [A2,28,2],
                ]},
            ]);
        }

        return songs;
    }

    const SONG_LIBRARY = createSongLibrary();

    function getDemoSong(id) {
        return SONG_LIBRARY[id] || SONG_LIBRARY['twinkle'];
    }

    function getSongList() {
        return Object.entries(SONG_LIBRARY).map(([id, song]) => ({
            id,
            title: song.title,
            bpm: song.bpm,
            tracks: song.tracks.map(t => t.role),
            duration: song.duration,
        }));
    }

    return { parse, getDemoSong, getSongList, noteToName, noteToLane };
})();
