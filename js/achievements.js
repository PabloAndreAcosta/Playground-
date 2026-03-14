/**
 * Achievements - Tracks and awards achievements based on gameplay.
 * Stores unlocked achievements in localStorage.
 */
const Achievements = (() => {
    const STORAGE_KEY = 'bandjam_achievements';

    const DEFINITIONS = [
        { id: 'first_song',    name: 'Första låten',     desc: 'Spela klart en låt', icon: '&#127925;' },
        { id: 'perfect_10',    name: 'Perfektionist',    desc: '10 perfects i en runda', icon: '&#11088;' },
        { id: 'perfect_50',    name: 'Mästare',          desc: '50 perfects i en runda', icon: '&#127942;' },
        { id: 'combo_20',      name: 'Combo King',       desc: '20x combo', icon: '&#128293;' },
        { id: 'combo_50',      name: 'Combo Legend',      desc: '50x combo', icon: '&#9889;' },
        { id: 'grade_s',       name: 'S-Rank',           desc: 'Få betyg S', icon: '&#127775;' },
        { id: 'grade_s_hard',  name: 'Gudalik',          desc: 'S-Rank på Hard', icon: '&#128081;' },
        { id: 'play_5',        name: 'Regelbunden',      desc: 'Spela 5 rundor', icon: '&#127911;' },
        { id: 'play_25',       name: 'Hängiven',         desc: 'Spela 25 rundor', icon: '&#127908;' },
        { id: 'no_miss',       name: 'Felfri',           desc: 'Klara en låt utan miss', icon: '&#128175;' },
        { id: 'all_songs',     name: 'Komplett',         desc: 'Spela alla demolåtar', icon: '&#127926;' },
        { id: 'score_10k',     name: 'Tiotusen',         desc: 'Nå 10 000 poäng', icon: '&#128176;' },
        { id: 'accuracy_100',  name: '100%',             desc: '100% träffsäkerhet', icon: '&#128175;' },
    ];

    function getUnlocked() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch { return {}; }
    }

    function unlock(id) {
        const unlocked = getUnlocked();
        if (unlocked[id]) return false; // already unlocked
        unlocked[id] = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
        return true; // newly unlocked
    }

    function checkAfterGame(results, difficulty, songTitle, allSongIds) {
        const newlyUnlocked = [];
        const stats = Stats.getSummary();

        for (const r of results) {
            // First song
            if (unlock('first_song')) newlyUnlocked.push('first_song');

            // Perfects
            if (r.hits.perfect >= 10 && unlock('perfect_10')) newlyUnlocked.push('perfect_10');
            if (r.hits.perfect >= 50 && unlock('perfect_50')) newlyUnlocked.push('perfect_50');

            // Combo
            if (r.combo >= 20 && unlock('combo_20')) newlyUnlocked.push('combo_20');
            if (r.combo >= 50 && unlock('combo_50')) newlyUnlocked.push('combo_50');

            // Grade S
            if (r.accuracy >= 95) {
                if (unlock('grade_s')) newlyUnlocked.push('grade_s');
                if (difficulty === 'hard' && unlock('grade_s_hard')) newlyUnlocked.push('grade_s_hard');
            }

            // No miss
            if (r.hits.miss === 0 && r.totalNotes > 0 && unlock('no_miss')) {
                newlyUnlocked.push('no_miss');
            }

            // Score 10k
            if (r.score >= 10000 && unlock('score_10k')) newlyUnlocked.push('score_10k');

            // 100% accuracy
            if (r.accuracy === 100 && unlock('accuracy_100')) newlyUnlocked.push('accuracy_100');
        }

        // Play count
        if (stats) {
            if (stats.totalGames >= 5 && unlock('play_5')) newlyUnlocked.push('play_5');
            if (stats.totalGames >= 25 && unlock('play_25')) newlyUnlocked.push('play_25');
        }

        // All songs played
        if (allSongIds && stats) {
            const history = Stats.getSummary();
            // Check from stats storage directly
            try {
                const hist = JSON.parse(localStorage.getItem('bandjam_stats')) || [];
                const playedSongs = new Set(hist.map(h => h.song));
                const demoTitles = allSongIds;
                if (demoTitles.every(t => playedSongs.has(t))) {
                    if (unlock('all_songs')) newlyUnlocked.push('all_songs');
                }
            } catch {}
        }

        return newlyUnlocked;
    }

    function showToast(achievementId) {
        const def = DEFINITIONS.find(d => d.id === achievementId);
        if (!def) return;

        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `
            <span class="ach-icon">${def.icon}</span>
            <div class="ach-text">
                <div class="ach-title">${def.name}</div>
                <div class="ach-desc">${def.desc}</div>
            </div>
        `;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    function renderGallery(container) {
        const unlocked = getUnlocked();

        container.innerHTML = DEFINITIONS.map(def => {
            const isUnlocked = !!unlocked[def.id];
            const date = isUnlocked ? new Date(unlocked[def.id]).toLocaleDateString('sv-SE') : '';
            return `<div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <span class="ach-card-icon">${def.icon}</span>
                <div class="ach-card-name">${def.name}</div>
                <div class="ach-card-desc">${def.desc}</div>
                ${isUnlocked ? `<div class="ach-card-date">${date}</div>` : ''}
            </div>`;
        }).join('');
    }

    function getProgress() {
        const unlocked = Object.keys(getUnlocked()).length;
        return { unlocked, total: DEFINITIONS.length };
    }

    return { checkAfterGame, showToast, renderGallery, getProgress, DEFINITIONS };
})();
