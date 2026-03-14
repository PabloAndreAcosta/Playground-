/**
 * Synth - Web Audio synthesizer for backing tracks and hit sounds.
 * Uses layered oscillators for richer instrument tones.
 */
const Synth = (() => {
    let audioCtx = null;
    let masterGain = null;
    let volumeLevel = 0.5; // 0-1

    function init() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = volumeLevel * 0.6;
        masterGain.connect(audioCtx.destination);
    }

    function resume() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function setVolume(v) {
        volumeLevel = Math.max(0, Math.min(1, v));
        if (masterGain) {
            masterGain.gain.setTargetAtTime(volumeLevel * 0.6, audioCtx.currentTime, 0.05);
        }
    }

    function getVolume() {
        return volumeLevel;
    }

    function midiToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // Richer voice configs with optional detune layers
    const VOICES = {
        'sång': {
            layers: [
                { type: 'sine', detune: 0, gain: 0.35 },
                { type: 'sine', detune: 3, gain: 0.1 },
            ],
            attack: 0.05, release: 0.25,
        },
        'gitarr': {
            layers: [
                { type: 'sawtooth', detune: 0, gain: 0.18 },
                { type: 'sawtooth', detune: 7, gain: 0.08 },
                { type: 'triangle', detune: -5, gain: 0.06 },
            ],
            attack: 0.005, release: 0.35,
        },
        'bas': {
            layers: [
                { type: 'triangle', detune: 0, gain: 0.4 },
                { type: 'sine', detune: 0, gain: 0.15 },
            ],
            attack: 0.02, release: 0.3,
        },
        'piano': {
            layers: [
                { type: 'triangle', detune: 0, gain: 0.22 },
                { type: 'sine', detune: 1, gain: 0.12 },
                { type: 'sawtooth', detune: -2, gain: 0.04 },
            ],
            attack: 0.005, release: 0.5,
        },
        'trummor': {
            layers: [
                { type: 'square', detune: 0, gain: 0.2 },
                { type: 'sawtooth', detune: 0, gain: 0.1 },
            ],
            attack: 0.001, release: 0.08,
        },
        'stråkar': {
            layers: [
                { type: 'sawtooth', detune: 0, gain: 0.12 },
                { type: 'sawtooth', detune: 5, gain: 0.08 },
                { type: 'sawtooth', detune: -5, gain: 0.08 },
            ],
            attack: 0.12, release: 0.4,
        },
        'blås': {
            layers: [
                { type: 'square', detune: 0, gain: 0.14 },
                { type: 'sine', detune: 3, gain: 0.06 },
            ],
            attack: 0.04, release: 0.2,
        },
        'synth': {
            layers: [
                { type: 'sawtooth', detune: 0, gain: 0.18 },
                { type: 'square', detune: 7, gain: 0.06 },
            ],
            attack: 0.01, release: 0.2,
        },
    };

    function playNote(noteNum, role, duration, time) {
        if (!audioCtx) init();
        const voice = VOICES[role] || VOICES['synth'];
        const freq = midiToFreq(noteNum);
        const startTime = time || audioCtx.currentTime;
        const endTime = startTime + (duration || 0.5);

        for (const layer of voice.layers) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = layer.type;
            osc.frequency.value = freq;
            osc.detune.value = layer.detune;

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(layer.gain, startTime + voice.attack);
            gain.gain.setValueAtTime(layer.gain, Math.max(startTime + voice.attack, endTime - voice.release));
            gain.gain.linearRampToValueAtTime(0, endTime);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(startTime);
            osc.stop(endTime + 0.05);
        }
    }

    function scheduleBackingTrack(track, startOffset) {
        if (!audioCtx) init();
        const now = audioCtx.currentTime;

        for (const note of track.notes) {
            const noteStart = now + note.startTime - (startOffset || 0);
            if (noteStart < now) continue;
            playNote(note.note, track.role, note.duration, noteStart);
        }
    }

    function playHitSound(quality) {
        if (!audioCtx) init();
        const now = audioCtx.currentTime;

        if (quality === 'perfect') {
            // Bright chime: two harmonics
            [880, 1320].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(i === 0 ? 0.12 : 0.06, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(now);
                osc.stop(now + 0.25);
            });
        } else if (quality === 'good') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 660;
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.15);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.2);
        } else {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 330;
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.12);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    }

    function getAudioContext() {
        return audioCtx;
    }

    function getCurrentTime() {
        return audioCtx ? audioCtx.currentTime : 0;
    }

    return { init, resume, playNote, scheduleBackingTrack, playHitSound, getAudioContext, getCurrentTime, setVolume, getVolume };
})();
