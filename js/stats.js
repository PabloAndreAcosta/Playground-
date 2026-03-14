/**
 * Stats - Tracks play history and renders progression graphs.
 * Stores data in localStorage.
 */
const Stats = (() => {
    const STATS_KEY = 'bandjam_stats';

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STATS_KEY)) || [];
        } catch { return []; }
    }

    function record(songTitle, difficulty, results) {
        const history = getHistory();
        for (const r of results) {
            history.push({
                song: songTitle,
                difficulty,
                track: r.trackName,
                score: r.score,
                accuracy: r.accuracy,
                grade: r.accuracy >= 95 ? 'S' : r.accuracy >= 85 ? 'A' :
                       r.accuracy >= 70 ? 'B' : r.accuracy >= 50 ? 'C' : 'D',
                combo: r.combo,
                perfect: r.hits.perfect,
                good: r.hits.good,
                ok: r.hits.ok,
                miss: r.hits.miss,
                date: new Date().toISOString(),
            });
        }
        // Keep last 200 entries
        if (history.length > 200) history.splice(0, history.length - 200);
        localStorage.setItem(STATS_KEY, JSON.stringify(history));
    }

    function getSummary() {
        const history = getHistory();
        if (history.length === 0) return null;

        const totalGames = history.length;
        const avgAccuracy = Math.round(history.reduce((s, h) => s + h.accuracy, 0) / totalGames);
        const avgScore = Math.round(history.reduce((s, h) => s + h.score, 0) / totalGames);
        const bestScore = Math.max(...history.map(h => h.score));
        const bestCombo = Math.max(...history.map(h => h.combo));
        const totalPerfects = history.reduce((s, h) => s + (h.perfect || 0), 0);

        // Favorite song
        const songCounts = {};
        for (const h of history) {
            songCounts[h.song] = (songCounts[h.song] || 0) + 1;
        }
        const favSong = Object.entries(songCounts).sort((a, b) => b[1] - a[1])[0];

        // Grade distribution
        const grades = { S: 0, A: 0, B: 0, C: 0, D: 0 };
        for (const h of history) grades[h.grade] = (grades[h.grade] || 0) + 1;

        return {
            totalGames,
            avgAccuracy,
            avgScore,
            bestScore,
            bestCombo,
            totalPerfects,
            favSong: favSong ? favSong[0] : '-',
            grades,
            // Last 20 accuracy values for chart
            recentAccuracy: history.slice(-20).map(h => h.accuracy),
            recentDates: history.slice(-20).map(h => {
                const d = new Date(h.date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
        };
    }

    function renderStatsScreen(container) {
        const summary = getSummary();
        if (!summary) {
            container.innerHTML = '<p style="color:#888;text-align:center">Inga spelade rundor än!</p>';
            return;
        }

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${summary.totalGames}</div>
                    <div class="stat-label">Spelade rundor</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.avgAccuracy}%</div>
                    <div class="stat-label">Snitt träffsäkerhet</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.bestScore}</div>
                    <div class="stat-label">Bästa poäng</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.bestCombo}x</div>
                    <div class="stat-label">Bästa combo</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.totalPerfects}</div>
                    <div class="stat-label">Totalt perfects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="font-size:0.9rem">${summary.favSong}</div>
                    <div class="stat-label">Favoritlåt</div>
                </div>
            </div>
            <div class="stats-chart-section">
                <h3>Träffsäkerhet (senaste 20)</h3>
                <canvas id="stats-chart" width="400" height="160"></canvas>
            </div>
            <div class="stats-grades">
                <h3>Betygsfördelning</h3>
                <div class="grade-bars">
                    ${['S', 'A', 'B', 'C', 'D'].map(g => {
                        const pct = summary.totalGames > 0 ? Math.round((summary.grades[g] / summary.totalGames) * 100) : 0;
                        const color = g === 'S' ? '#ffa500' : g === 'A' ? '#48dbfb' : g === 'B' ? '#6bff6b' : g === 'C' ? '#888' : '#555';
                        return `<div class="grade-bar-row">
                            <span class="grade-letter" style="color:${color}">${g}</span>
                            <div class="grade-bar-bg">
                                <div class="grade-bar-fill" style="width:${pct}%;background:${color}"></div>
                            </div>
                            <span class="grade-count">${summary.grades[g]}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;

        // Draw chart
        setTimeout(() => drawChart(summary), 50);
    }

    function drawChart(summary) {
        const canvas = document.getElementById('stats-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const data = summary.recentAccuracy;
        const labels = summary.recentDates;

        ctx.clearRect(0, 0, w, h);

        if (data.length < 2) return;

        const pad = { top: 10, bottom: 25, left: 35, right: 10 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let pct = 0; pct <= 100; pct += 25) {
            const y = pad.top + chartH - (pct / 100) * chartH;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(w - pad.right, y);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(pct + '%', pad.left - 4, y + 3);
        }

        // Data line
        ctx.strokeStyle = '#48dbfb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const x = pad.left + (i / (data.length - 1)) * chartW;
            const y = pad.top + chartH - (data[i] / 100) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points
        ctx.fillStyle = '#48dbfb';
        for (let i = 0; i < data.length; i++) {
            const x = pad.left + (i / (data.length - 1)) * chartW;
            const y = pad.top + chartH - (data[i] / 100) * chartH;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // X labels (show every 4th)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < labels.length; i += Math.max(1, Math.floor(labels.length / 5))) {
            const x = pad.left + (i / (data.length - 1)) * chartW;
            ctx.fillText(labels[i], x, h - 4);
        }
    }

    return { record, getSummary, renderStatsScreen };
})();
