/**
 * Effects - Visual effects system: countdown, particles, streak flames, hit labels.
 */
const Effects = (() => {

    // ==================== COUNTDOWN ====================

    let countdownOverlay = null;
    let countdownInterval = null;

    function showCountdown(seconds, onDone) {
        countdownOverlay = document.createElement('div');
        countdownOverlay.className = 'countdown-overlay';
        document.getElementById('game-screen').appendChild(countdownOverlay);

        let remaining = seconds;

        function tick() {
            if (remaining <= 0) {
                countdownOverlay.textContent = 'GO!';
                countdownOverlay.classList.add('countdown-go');
                setTimeout(() => {
                    if (countdownOverlay && countdownOverlay.parentNode) {
                        countdownOverlay.remove();
                    }
                    countdownOverlay = null;
                    if (onDone) onDone();
                }, 600);
                return;
            }

            countdownOverlay.textContent = remaining;
            countdownOverlay.classList.remove('countdown-pop');
            void countdownOverlay.offsetWidth; // force reflow
            countdownOverlay.classList.add('countdown-pop');

            remaining--;
            countdownInterval = setTimeout(tick, 1000);
        }

        tick();
    }

    function hideCountdown() {
        if (countdownInterval) clearTimeout(countdownInterval);
        if (countdownOverlay && countdownOverlay.parentNode) {
            countdownOverlay.remove();
        }
        countdownOverlay = null;
    }

    // ==================== PARTICLES ====================

    class ParticleSystem {
        constructor() {
            this.particles = [];
        }

        emit(x, y, color, count, type) {
            for (let i = 0; i < count; i++) {
                if (type === 'burst') {
                    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
                    const speed = 80 + Math.random() * 180;
                    this.particles.push({
                        x, y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 50,
                        life: 0.5 + Math.random() * 0.4,
                        maxLife: 0.5 + Math.random() * 0.4,
                        color,
                        size: 3 + Math.random() * 4,
                        type: 'circle',
                    });
                } else if (type === 'spark') {
                    this.particles.push({
                        x: x + (Math.random() - 0.5) * 30,
                        y,
                        vx: (Math.random() - 0.5) * 60,
                        vy: -100 - Math.random() * 150,
                        life: 0.3 + Math.random() * 0.3,
                        maxLife: 0.3 + Math.random() * 0.3,
                        color,
                        size: 2 + Math.random() * 2,
                        type: 'spark',
                    });
                } else if (type === 'fire') {
                    this.particles.push({
                        x: x + (Math.random() - 0.5) * 20,
                        y,
                        vx: (Math.random() - 0.5) * 30,
                        vy: -60 - Math.random() * 120,
                        life: 0.4 + Math.random() * 0.4,
                        maxLife: 0.4 + Math.random() * 0.4,
                        color,
                        size: 4 + Math.random() * 6,
                        type: 'fire',
                    });
                }
            }
        }

        update(dt) {
            for (const p of this.particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 200 * dt; // gravity
                p.life -= dt;
            }
            this.particles = this.particles.filter(p => p.life > 0);
        }

        render(ctx) {
            for (const p of this.particles) {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.globalAlpha = alpha;

                if (p.type === 'fire') {
                    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, p.color);
                    gradient.addColorStop(0.5, p.color);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'spark') {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(p.x - 1, p.y - 1, 2, p.size * alpha);
                } else {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        }
    }

    // ==================== HIT LABELS ====================

    const hitLabels = [];

    function addHitLabel(x, y, quality) {
        const text = quality === 'perfect' ? 'PERFECT!' :
                     quality === 'good' ? 'GOOD' :
                     quality === 'ok' ? 'OK' : 'MISS';
        const color = quality === 'perfect' ? '#48dbfb' :
                      quality === 'good' ? '#ffa500' :
                      quality === 'ok' ? '#aaa' : '#ff6b6b';

        hitLabels.push({
            x, y,
            text,
            color,
            life: 0.8,
            maxLife: 0.8,
            scale: quality === 'perfect' ? 1.5 : 1.0,
        });
    }

    function updateHitLabels(dt) {
        for (const label of hitLabels) {
            label.y -= 60 * dt;
            label.life -= dt;
        }
        hitLabels.length = 0;
        hitLabels.push(...hitLabels.filter(l => l.life > 0));
    }

    // Keep the array reference but filter in place
    function cleanHitLabels() {
        for (let i = hitLabels.length - 1; i >= 0; i--) {
            if (hitLabels[i].life <= 0) hitLabels.splice(i, 1);
        }
    }

    function renderHitLabels(ctx) {
        for (const label of hitLabels) {
            const alpha = Math.max(0, label.life / label.maxLife);
            const scale = label.scale * (1 + (1 - alpha) * 0.3);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = label.color;
            ctx.font = `bold ${Math.round(16 * scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = label.color;
            ctx.shadowBlur = 8;
            ctx.fillText(label.text, label.x, label.y);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }

    // ==================== HIT ZONE GLOW ====================

    function renderHitZoneGlow(ctx, x, width, hitZoneY, combo, laneColor) {
        if (combo < 3) return;

        const intensity = Math.min(combo / 30, 1);
        const pulseSpeed = 3 + combo * 0.1;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * pulseSpeed);
        const alpha = 0.1 + intensity * 0.3 * pulse;

        const gradient = ctx.createLinearGradient(x, hitZoneY - 30, x, hitZoneY + 10);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, laneColor || '#48dbfb');
        gradient.addColorStop(1, 'transparent');

        ctx.globalAlpha = alpha;
        ctx.fillStyle = gradient;
        ctx.fillRect(x, hitZoneY - 30, width, 40);
        ctx.globalAlpha = 1;
    }

    // ==================== STREAK FIRE ====================

    function getStreakColor(combo) {
        if (combo >= 30) return '#ff6bd6'; // purple/pink fire
        if (combo >= 20) return '#ff4444'; // red fire
        if (combo >= 10) return '#ffa500'; // orange fire
        return '#ffd93d';                   // yellow fire
    }

    function shouldShowFire(combo) {
        return combo >= 10;
    }

    // ==================== BACKGROUND PULSE ====================

    let bgPulse = 0;

    function triggerBgPulse() {
        bgPulse = 1;
    }

    function updateBgPulse(dt) {
        bgPulse = Math.max(0, bgPulse - dt * 4);
    }

    function renderBgPulse(ctx, w, h) {
        if (bgPulse <= 0) return;
        ctx.globalAlpha = bgPulse * 0.06;
        ctx.fillStyle = '#48dbfb';
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
    }

    // ==================== MISS SHAKE ====================

    function getShakeOffset(combo, missTime) {
        if (missTime <= 0) return { x: 0, y: 0 };
        const intensity = Math.min(missTime * 8, 4);
        return {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity,
        };
    }

    return {
        showCountdown,
        hideCountdown,
        ParticleSystem,
        addHitLabel,
        updateHitLabels: (dt) => { for (const l of hitLabels) { l.y -= 60 * dt; l.life -= dt; } cleanHitLabels(); },
        renderHitLabels,
        renderHitZoneGlow,
        getStreakColor,
        shouldShowFire,
        triggerBgPulse,
        updateBgPulse,
        renderBgPulse,
        getShakeOffset,
    };
})();
