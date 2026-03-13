/**
 * Synth - Web Audio synthesizer for backing tracks and hit sounds.
 * Plays MIDI notes using oscillators and provides audio feedback.
 */
const Synth = (() => {
    let audioCtx = null;
    let masterGain = null;
    const activeNotes = {};

    function init() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(audioCtx.destination);
    }

    function resume() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function midiToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // Instrument voice configs
    const VOICES = {
        'sång':    { type: 'sine',     attack: 0.05, release: 0.2, gain: 0.4 },
        'gitarr':  { type: 'sawtooth', attack: 0.01, release: 0.3, gain: 0.25 },
        'bas':     { type: 'triangle', attack: 0.02, release: 0.3, gain: 0.5 },
        'piano':   { type: 'triangle', attack: 0.01, release: 0.4, gain: 0.3 },
        'trummor': { type: 'square',   attack: 0.001, release: 0.1, gain: 0.3 },
        'stråkar': { type: 'sawtooth', attack: 0.1, release: 0.4, gain: 0.2 },
        'blås':    { type: 'square',   attack: 0.05, release: 0.2, gain: 0.2 },
        'synth':   { type: 'sawtooth', attack: 0.01, release: 0.2, gain: 0.25 },
    };

    function playNote(noteNum, role, duration, time) {
        if (!audioCtx) init();
        const voice = VOICES[role] || VOICES['synth'];
        const freq = midiToFreq(noteNum);

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = voice.type;
        osc.frequency.value = freq;

        const startTime = time || audioCtx.currentTime;
        const endTime = startTime + (duration || 0.5);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(voice.gain, startTime + voice.attack);
        gain.gain.setValueAtTime(voice.gain, endTime - voice.release);
        gain.gain.linearRampToValueAtTime(0, endTime);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(endTime + 0.05);
    }

    // Schedule all notes for a backing track
    function scheduleBackingTrack(track, startOffset) {
        if (!audioCtx) init();
        const now = audioCtx.currentTime;

        for (const note of track.notes) {
            const noteStart = now + note.startTime - (startOffset || 0);
            if (noteStart < now) continue;
            playNote(note.note, track.role, note.duration, noteStart);
        }
    }

    // Play hit feedback sound
    function playHitSound(quality) {
        if (!audioCtx) init();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (quality === 'perfect') {
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, now);
        } else if (quality === 'good') {
            osc.frequency.value = 660;
            gain.gain.setValueAtTime(0.1, now);
        } else {
            osc.frequency.value = 220;
            gain.gain.setValueAtTime(0.08, now);
        }

        osc.type = 'sine';
        gain.gain.linearRampToValueAtTime(0, now + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    function getAudioContext() {
        return audioCtx;
    }

    function getCurrentTime() {
        return audioCtx ? audioCtx.currentTime : 0;
    }

    return { init, resume, playNote, scheduleBackingTrack, playHitSound, getAudioContext, getCurrentTime };
})();
