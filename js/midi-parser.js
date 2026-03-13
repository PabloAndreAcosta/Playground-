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

    // Create a demo song (Twinkle Twinkle Little Star) as game data
    function createDemoSong() {
        const bpm = 120;
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

        // Melody (C major) - Twinkle Twinkle
        const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69;
        const melodyPattern = [
            [C4,0,1],[C4,1,1],[G4,2,1],[G4,3,1],[A4,4,1],[A4,5,1],[G4,6,2],
            [F4,8,1],[F4,9,1],[E4,10,1],[E4,11,1],[D4,12,1],[D4,13,1],[C4,14,2],
            [G4,16,1],[G4,17,1],[F4,18,1],[F4,19,1],[E4,20,1],[E4,21,1],[D4,22,2],
            [G4,24,1],[G4,25,1],[F4,26,1],[F4,27,1],[E4,28,1],[E4,29,1],[D4,30,2],
            [C4,32,1],[C4,33,1],[G4,34,1],[G4,35,1],[A4,36,1],[A4,37,1],[G4,38,2],
            [F4,40,1],[F4,41,1],[E4,42,1],[E4,43,1],[D4,44,1],[D4,45,1],[C4,46,2],
        ];
        const melodyNotes = melodyPattern.map(([n,b,d]) => makeNote(n,b,d));

        // Bass line
        const C3 = 48, F3 = 53, G3 = 55;
        const bassPattern = [
            [C3,0,2],[C3,2,2],[F3,4,2],[C3,6,2],
            [F3,8,2],[C3,10,2],[G3,12,2],[C3,14,2],
            [C3,16,2],[F3,18,2],[C3,20,2],[G3,22,2],
            [C3,24,2],[F3,26,2],[C3,28,2],[G3,30,2],
            [C3,32,2],[C3,34,2],[F3,36,2],[C3,38,2],
            [F3,40,2],[C3,42,2],[G3,44,2],[C3,46,2],
        ];
        const bassNotes = bassPattern.map(([n,b,d]) => makeNote(n,b,d));

        // Simple chords (piano)
        const E3 = 52;
        const chordPattern = [
            [C3,0,4],[E3,0,4],[G3,0,4],
            [F3,4,4],[A4-12,4,4],[C4,4,4],
            [F3,8,4],[A4-12,8,4],[C4,8,4],
            [G3,12,4],[C3+19,12,4],[D4,12,4],
            [C3,16,4],[E3,16,4],[G3,16,4],
            [F3,20,4],[A4-12,20,4],[C4,20,4],
            [C3,24,4],[E3,24,4],[G3,24,4],
            [G3,28,4],[C3+19,28,4],[D4,28,4],
            [C3,32,4],[E3,32,4],[G3,32,4],
            [F3,36,4],[A4-12,36,4],[C4,36,4],
            [F3,40,4],[A4-12,40,4],[C4,40,4],
            [G3,44,4],[C3+19,44,4],[C4,46,2],
        ];
        const chordNotes = chordPattern.map(([n,b,d]) => makeNote(n,b,d));

        const duration = 48 * beatDuration;

        return {
            ticksPerBeat: 480,
            bpm: 120,
            secPerTick: beatDuration / 480,
            duration,
            tracks: [
                { name: 'Melodi', role: 'sång', program: 0, channel: 0, isDrums: false, notes: melodyNotes, duration },
                { name: 'Bas', role: 'bas', program: 33, channel: 1, isDrums: false, notes: bassNotes, duration },
                { name: 'Piano', role: 'piano', program: 0, channel: 2, isDrums: false, notes: chordNotes, duration },
            ],
        };
    }

    return { parse, createDemoSong, noteToName, noteToLane };
})();
