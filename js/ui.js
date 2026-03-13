/**
 * UI - Manages lobby screen, player setup, and results display.
 */
const UI = (() => {
    let currentSong = null;
    let playerSlots = [];
    const MAX_PLAYERS = 4;

    function init() {
        setupFileInput();
        setupButtons();
        loadDemoSong();
        addPlayerSlot();
    }

    function loadDemoSong() {
        currentSong = MidiParser.createDemoSong();
        updateSongInfo('Twinkle Twinkle Little Star (Demo)');
        updateInstrumentOptions();
    }

    function setupFileInput() {
        const input = document.getElementById('midi-file-input');
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const buffer = await file.arrayBuffer();
                currentSong = MidiParser.parse(buffer);
                updateSongInfo(file.name.replace(/\.(mid|midi)$/i, ''));
                updateInstrumentOptions();
                document.querySelectorAll('.song-btn').forEach(b => b.classList.remove('selected'));
            } catch (err) {
                alert('Kunde inte läsa MIDI-filen: ' + err.message);
            }
        });

        document.querySelector('[data-song="demo"]').addEventListener('click', (e) => {
            document.querySelectorAll('.song-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            loadDemoSong();
        });
    }

    function updateSongInfo(name) {
        const infoEl = document.getElementById('song-info');
        infoEl.classList.remove('hidden');
        document.getElementById('song-name').textContent = `Låt: ${name}`;
        document.getElementById('song-tracks').textContent =
            `Spår: ${currentSong.tracks.map(t => t.name).join(', ')} | ${currentSong.bpm} BPM`;
    }

    function getInstrumentHint(role, playerIndex) {
        const cfg = GameEngine.getInstrumentForRole(role);
        if (!cfg) return '';
        if (cfg.isVocal) return 'Mikrofon';
        const keys = cfg.keys[playerIndex % cfg.keys.length];
        return keys.map(k => k.toUpperCase()).join(' ');
    }

    function updateKeyHints() {
        for (let i = 0; i < playerSlots.length; i++) {
            const slot = playerSlots[i];
            const select = slot.element.querySelector('select');
            const hintSpan = slot.element.querySelector('.key-hint-text');
            if (!hintSpan) continue;

            const trackName = select.value;
            if (trackName && currentSong) {
                const track = currentSong.tracks.find(t => t.name === trackName);
                if (track) {
                    hintSpan.textContent = getInstrumentHint(track.role, i);
                    return;
                }
            }
            hintSpan.textContent = '';
        }
    }

    function updateInstrumentOptions() {
        for (const slot of playerSlots) {
            const select = slot.element.querySelector('select');
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Välj instrument --</option>';

            for (const track of currentSong.tracks) {
                const opt = document.createElement('option');
                opt.value = track.name;
                opt.textContent = `${track.name} (${track.role}) - ${track.notes.length} noter`;
                select.appendChild(opt);
            }

            if (currentValue) select.value = currentValue;
        }
        updateKeyHints();
        validateStartButton();
    }

    function addPlayerSlot() {
        if (playerSlots.length >= MAX_PLAYERS) return;

        const index = playerSlots.length;
        const color = GameEngine.PLAYER_COLORS[index];

        const div = document.createElement('div');
        div.className = 'player-slot';
        div.innerHTML = `
            <div class="player-color" style="background:${color}"></div>
            <span class="player-name">Spelare ${index + 1}</span>
            <select>
                <option value="">-- Välj instrument --</option>
            </select>
            <span class="key-hint-text" style="color:#555;font-size:0.75rem"></span>
            ${index > 0 ? '<button class="remove-player">&times;</button>' : ''}
        `;

        const slot = { element: div, index };
        playerSlots.push(slot);

        document.getElementById('players-container').appendChild(div);

        const select = div.querySelector('select');
        if (currentSong) {
            for (const track of currentSong.tracks) {
                const opt = document.createElement('option');
                opt.value = track.name;
                opt.textContent = `${track.name} (${track.role}) - ${track.notes.length} noter`;
                select.appendChild(opt);
            }
        }

        select.addEventListener('change', () => {
            updateKeyHints();
            validateStartButton();
        });

        const removeBtn = div.querySelector('.remove-player');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => removePlayerSlot(slot));
        }

        if (playerSlots.length >= MAX_PLAYERS) {
            document.getElementById('add-player-btn').classList.add('hidden');
        }

        validateStartButton();
    }

    function removePlayerSlot(slot) {
        slot.element.remove();
        playerSlots = playerSlots.filter(s => s !== slot);

        playerSlots.forEach((s, i) => {
            s.index = i;
            s.element.querySelector('.player-name').textContent = `Spelare ${i + 1}`;
            s.element.querySelector('.player-color').style.background = GameEngine.PLAYER_COLORS[i];
        });

        document.getElementById('add-player-btn').classList.remove('hidden');
        updateKeyHints();
        validateStartButton();
    }

    function validateStartButton() {
        const btn = document.getElementById('start-game-btn');
        const selections = playerSlots.map(s => s.element.querySelector('select').value).filter(v => v);

        const valid = selections.length > 0;
        const unique = new Set(selections);
        const noDupes = unique.size === selections.length;

        btn.disabled = !valid || !noDupes;

        if (!noDupes && selections.length > 1) {
            btn.textContent = 'Två spelare kan inte ha samma instrument!';
        } else {
            btn.textContent = 'Starta!';
        }
    }

    function setupButtons() {
        document.getElementById('add-player-btn').addEventListener('click', addPlayerSlot);

        document.getElementById('start-game-btn').addEventListener('click', () => {
            if (!currentSong) return;
            startGame();
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            GameEngine.stop();
            showScreen('lobby-screen');
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            showScreen('lobby-screen');
        });
    }

    function startGame() {
        const playerConfigs = [];
        for (const slot of playerSlots) {
            const trackName = slot.element.querySelector('select').value;
            if (!trackName) continue;
            const track = currentSong.tracks.find(t => t.name === trackName);
            if (track) {
                playerConfigs.push({ trackName: track.name, role: track.role });
            }
        }

        if (playerConfigs.length === 0) return;

        showScreen('game-screen');
        GameEngine.start(currentSong, playerConfigs, showResults);
    }

    function showResults(results) {
        showScreen('results-screen');

        const container = document.getElementById('results-container');
        container.innerHTML = results.map(r => {
            const grade = r.accuracy >= 95 ? 'S' :
                          r.accuracy >= 85 ? 'A' :
                          r.accuracy >= 70 ? 'B' :
                          r.accuracy >= 50 ? 'C' : 'D';
            const gradeColor = grade === 'S' ? '#ffa500' :
                               grade === 'A' ? '#48dbfb' :
                               grade === 'B' ? '#6bff6b' : '#888';

            return `<div class="result-card">
                <h3 style="color:${GameEngine.PLAYER_COLORS[r.playerIndex]}">
                    Spelare ${r.playerIndex + 1} - ${r.trackName}
                </h3>
                <div class="result-grade" style="color:${gradeColor}">${grade}</div>
                <div class="result-score">${r.score}</div>
                <div class="result-details">
                    Träff: ${r.accuracy}%<br>
                    Perfect: ${r.hits.perfect} | Good: ${r.hits.good} | OK: ${r.hits.ok}<br>
                    Miss: ${r.hits.miss} | Max combo: ${r.combo}
                </div>
            </div>`;
        }).join('');
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    return { init };
})();
