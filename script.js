document.addEventListener('DOMContentLoaded', () => {
    // ========== ELEMENTOS UI ==========
    const ventanas = {
        1: document.getElementById('ventana1'),
        2: document.getElementById('ventana2'),
        3: document.getElementById('ventana3')
    };

    const btnNo1 = document.getElementById('btnNo1');
    const btnNo2 = document.getElementById('btnNo2');
    const btnEscapa = document.getElementById('btnEscapa');
    const pupilas = document.querySelectorAll('.pupila');
    const viento = document.getElementById('viento');
    const particulas = document.getElementById('particulas');
    const canvasConfetti = document.getElementById('confetti');
    const ctxConfetti = canvasConfetti.getContext('2d');

    const espacio = document.getElementById('espacio');
    const zoomCapa = document.getElementById('zoomCapa');
    const canvasEspacio = document.getElementById('canvasEspacio');
    const ctx = canvasEspacio.getContext('2d');
    const planetasLayer = document.getElementById('planetasLayer');
    const tooltip = document.getElementById('tooltip');
    const tooltipTexto = document.getElementById('tooltipTexto');
    const btnLeer = document.getElementById('btnLeer');
    const hintEspacio = document.getElementById('hintEspacio');

    // ========== ESTADO GENERAL ==========
    let botonVivo = false;
    let posX = 0, posY = 0, velX = 0, velY = 0;
    let animFrameEscapa = null;
    let confettiPieces = [];
    let confettiActive = false;

    // ========== ESTADO ESPACIO ==========
    let espacioActivo = false;
    let espacioAnimId = null;
    let galaxyAngle = 0;
    let heartAngle = 0;
    let heartTilt = 0.35; // inclinación 3D
    let stars = [];
    let flyGalaxies = [];      // cúmulo por el que pasamos en el zoom
    let comets = [];
    let heartStarsOuter = [];
    let heartStarsInner = [];
    let galaxyParticles = [];
    let planetData = [];
    let activePlanet = null;
    let tooltipPinned = false;

    // Fase del viaje: 'viaje' | 'llegando' | 'centrada'
    let fase = 'viaje';
    let viajeT = 0;           // 0 → 1 progreso del zoom
    let mainGalaxyAlpha = 0;  // fade-in de la galaxia principal
    let planetsVisible = false;
    let viajeStart = 0;
    const VIAJE_MS = 5200;

    const MEMORIES = [
        'La hamaca',
        'La primera vez que nos agarramos de la mano',
        'El primer beso',
        'Kitty',
        'Las 9 cartas',
        'Tus cumple',
        'La primera vez que terminamos (qué recuerdo)',
        'El terremoto'
    ];

    // ========== UTILS ==========
    function resizeConfetti() {
        canvasConfetti.width = window.innerWidth;
        canvasConfetti.height = window.innerHeight;
    }
    resizeConfetti();
    window.addEventListener('resize', () => {
        resizeConfetti();
        if (espacioActivo) resizeEspacio();
    });

    function cambiarVentana(desde, hacia) {
        const actual = ventanas[desde];
        const siguiente = ventanas[hacia];
        actual.classList.add('saliendo');
        actual.classList.remove('activa');
        setTimeout(() => {
            actual.classList.add('oculta');
            actual.classList.remove('saliendo');
            siguiente.classList.remove('oculta');
            void siguiente.offsetWidth;
            siguiente.classList.add('activa');
        }, 380);
    }

    // ========== CORAZONES FONDO ==========
    function crearCorazonFondo() {
        if (document.body.classList.contains('modo-espacio')) return;
        const el = document.createElement('div');
        el.className = 'particula';
        el.textContent = Math.random() > 0.5 ? '💕' : '💗';
        el.style.left = Math.random() * 100 + '%';
        el.style.bottom = '-5%';
        el.style.fontSize = (0.8 + Math.random() * 1.1) + 'rem';
        el.style.animationDuration = (6 + Math.random() * 5) + 's';
        el.style.animationDelay = Math.random() * 2 + 's';
        particulas.appendChild(el);
        setTimeout(() => el.remove(), 12000);
    }
    for (let i = 0; i < 4; i++) setTimeout(crearCorazonFondo, i * 800);
    setInterval(crearCorazonFondo, 2200);

    // ========== CONFETTI ==========
    const colores = ['#ff3366', '#ff6b9d', '#ffb7c5', '#ff85a2', '#ffe0e9', '#ffffff', '#ff4d6d'];

    function lanzarConfetti() {
        confettiPieces = [];
        const cantidad = Math.min(120, Math.floor(window.innerWidth / 7));
        for (let i = 0; i < cantidad; i++) {
            confettiPieces.push({
                x: Math.random() * canvasConfetti.width,
                y: Math.random() * canvasConfetti.height * -0.4 - 20,
                w: 6 + Math.random() * 8,
                h: 6 + Math.random() * 8,
                color: colores[Math.floor(Math.random() * colores.length)],
                vx: (Math.random() - 0.5) * 6,
                vy: 2 + Math.random() * 5,
                rot: Math.random() * 360,
                rotVel: (Math.random() - 0.5) * 12,
                shape: Math.random() > 0.55 ? 'heart' : 'rect'
            });
        }
        confettiActive = true;
        requestAnimationFrame(animarConfetti);
    }

    function animarConfetti() {
        if (!confettiActive) return;
        ctxConfetti.clearRect(0, 0, canvasConfetti.width, canvasConfetti.height);
        let vivos = 0;
        for (const p of confettiPieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.rot += p.rotVel;
            p.vx *= 0.99;
            if (p.y < canvasConfetti.height + 40) {
                vivos++;
                ctxConfetti.save();
                ctxConfetti.translate(p.x, p.y);
                ctxConfetti.rotate((p.rot * Math.PI) / 180);
                ctxConfetti.fillStyle = p.color;
                if (p.shape === 'heart') {
                    const s = p.w * 0.5;
                    ctxConfetti.beginPath();
                    ctxConfetti.moveTo(0, s * 0.3);
                    ctxConfetti.bezierCurveTo(-s, -s * 0.5, -s * 1.4, s * 0.6, 0, s * 1.4);
                    ctxConfetti.bezierCurveTo(s * 1.4, s * 0.6, s, -s * 0.5, 0, s * 0.3);
                    ctxConfetti.fill();
                } else {
                    ctxConfetti.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                }
                ctxConfetti.restore();
            }
        }
        if (vivos > 0) requestAnimationFrame(animarConfetti);
        else {
            confettiActive = false;
            ctxConfetti.clearRect(0, 0, canvasConfetti.width, canvasConfetti.height);
        }
    }

    // ========== IR AL AMOR → ESPACIO ==========
    function irAlAmor() {
        if (botonVivo) {
            botonVivo = false;
            if (animFrameEscapa) cancelAnimationFrame(animFrameEscapa);
            btnEscapa.classList.remove('vivo', 'corriendo');
            const zona = document.getElementById('zonaBotones3');
            if (zona && !zona.contains(btnEscapa)) {
                zona.appendChild(btnEscapa);
                btnEscapa.style.cssText = '';
            }
        }

        Object.values(ventanas).forEach(v => {
            v.classList.remove('activa');
            v.classList.add('saliendo');
        });

        setTimeout(() => {
            Object.values(ventanas).forEach(v => {
                v.classList.add('oculta');
                v.classList.remove('saliendo');
            });
            iniciarEspacio();
        }, 420);
    }

    document.querySelectorAll('[data-action="amor"]').forEach(btn => {
        btn.addEventListener('click', irAlAmor);
    });

    btnNo1.addEventListener('click', () => cambiarVentana(1, 2));
    btnNo2.addEventListener('click', () => cambiarVentana(2, 3));

    // ========== BOTÓN ESCAPA ==========
    function despertarBoton(e) {
        if (botonVivo) return;
        e.preventDefault();
        e.stopPropagation();
        botonVivo = true;
        const rect = btnEscapa.getBoundingClientRect();
        document.body.appendChild(btnEscapa);
        btnEscapa.style.position = 'fixed';
        btnEscapa.style.left = rect.left + 'px';
        btnEscapa.style.top = rect.top + 'px';
        btnEscapa.style.zIndex = '200';
        btnEscapa.style.margin = '0';
        posX = rect.left;
        posY = rect.top;
        velX = 0;
        velY = 0;
        btnEscapa.classList.add('vivo');
        const texto = btnEscapa.querySelector('.texto-btn');
        if (texto) setTimeout(() => { texto.textContent = '¡No me atrapas!'; }, 400);
        animFrameEscapa = requestAnimationFrame(actualizarFisica);
    }

    btnEscapa.addEventListener('click', despertarBoton);
    btnEscapa.addEventListener('touchstart', despertarBoton, { passive: false });

    function huirDe(clientX, clientY) {
        if (!botonVivo) return;
        const rect = btnEscapa.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radio = 180;
        if (dist < radio && dist > 0) {
            const fuerza = (radio - dist) / radio;
            const angulo = Math.atan2(dy, dx);
            velX -= Math.cos(angulo) * fuerza * 14;
            velY -= Math.sin(angulo) * fuerza * 14;
            if (velX < -1) viento.className = 'viento izq';
            else if (velX > 1) viento.className = 'viento der';
            btnEscapa.classList.add('corriendo');
        }
    }

    function actualizarFisica() {
        if (!botonVivo) return;
        velX *= 0.88;
        velY *= 0.88;
        posX += velX;
        posY += velY;
        const margen = 16;
        const maxX = window.innerWidth - btnEscapa.offsetWidth - margen;
        const maxY = window.innerHeight - btnEscapa.offsetHeight - margen;
        if (posX < margen) { posX = margen; velX = Math.abs(velX) * 0.6; }
        else if (posX > maxX) { posX = maxX; velX = -Math.abs(velX) * 0.6; }
        if (posY < margen) { posY = margen; velY = Math.abs(velY) * 0.6; }
        else if (posY > maxY) { posY = maxY; velY = -Math.abs(velY) * 0.6; }
        btnEscapa.style.left = posX + 'px';
        btnEscapa.style.top = posY + 'px';
        if (Math.abs(velX) < 0.4 && Math.abs(velY) < 0.4) {
            btnEscapa.classList.remove('corriendo');
        }
        animFrameEscapa = requestAnimationFrame(actualizarFisica);
    }

    document.addEventListener('mousemove', (e) => {
        if (!botonVivo) return;
        huirDe(e.clientX, e.clientY);
        moverPupilas(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        if (!botonVivo || !e.touches[0]) return;
        const t = e.touches[0];
        huirDe(t.clientX, t.clientY);
        moverPupilas(t.clientX, t.clientY);
    }, { passive: true });

    function moverPupilas(clientX, clientY) {
        pupilas.forEach(pupila => {
            const ojo = pupila.parentElement;
            const r = ojo.getBoundingClientRect();
            const ox = r.left + r.width / 2;
            const oy = r.top + r.height / 2;
            const ang = Math.atan2(clientY - oy, clientX - ox);
            const max = 7;
            pupila.style.transform = `translate(${Math.cos(ang) * max}px, ${Math.sin(ang) * max}px)`;
        });
    }

    // =====================================================
    //                    ESCENA ESPACIO
    // =====================================================

    function resizeEspacio() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvasEspacio.width = w * dpr;
        canvasEspacio.height = h * dpr;
        canvasEspacio.style.width = w + 'px';
        canvasEspacio.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initStars(w, h) {
        stars = [];
        const count = Math.min(380, Math.floor((w * h) / 2800));
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.5 + 0.25,
                baseAlpha: 0.15 + Math.random() * 0.75,
                phase: Math.random() * Math.PI * 2,
                speed: 0.006 + Math.random() * 0.022
            });
        }
    }

    // Cúmulo denso de galaxias por el que “volamos”
    function initFlyGalaxies(w, h) {
        flyGalaxies = [];
        // Muchas galaxias repartidas en profundidad (z: 0 cerca → 1 muy lejos)
        for (let i = 0; i < 28; i++) {
            flyGalaxies.push({
                // posición en el “túnel” de viaje (offset lateral)
                lx: (Math.random() - 0.5) * 2.4,   // -1.2 … 1.2
                ly: (Math.random() - 0.5) * 1.8,
                z: 0.08 + Math.random() * 0.92,    // profundidad
                size: 30 + Math.random() * 110,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.015,
                arms: 2 + Math.floor(Math.random() * 3),
                hue: Math.random() > 0.5 ? 320 : 260 + Math.random() * 40,
                // la última/casi última será “nuestra” referencia visual
                isTarget: false
            });
        }
        // Una galaxia objetivo al fondo del viaje (z bajo = cerca al final)
        flyGalaxies.push({
            lx: 0,
            ly: 0.02,
            z: 0.02,
            size: 160,
            angle: 0.4,
            spin: 0.003,
            arms: 4,
            hue: 330,
            isTarget: true
        });
        // Ordenar de lejos a cerca para pintar bien
        flyGalaxies.sort((a, b) => b.z - a.z);
    }

    function heartPoint(t) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        return { x, y };
    }

    function initHeartStars() {
        heartStarsOuter = [];
        heartStarsInner = [];
        const outerCount = 90;
        const innerCount = 70;

        for (let i = 0; i < outerCount; i++) {
            const t = (i / outerCount) * Math.PI * 2;
            const p = heartPoint(t);
            heartStarsOuter.push({
                ox: p.x * 1.18,
                oy: p.y * 1.18,
                r: 1.2 + Math.random() * 1.0,
                phase: Math.random() * Math.PI * 2,
                // ligera variación de “profundidad” para look 3D
                z: (Math.random() - 0.5) * 0.35
            });
        }
        for (let i = 0; i < innerCount; i++) {
            const t = (i / innerCount) * Math.PI * 2 + 0.04;
            const p = heartPoint(t);
            heartStarsInner.push({
                ox: p.x * 0.82,
                oy: p.y * 0.82,
                r: 1.0 + Math.random() * 0.8,
                phase: Math.random() * Math.PI * 2,
                z: (Math.random() - 0.5) * 0.25
            });
        }
    }

    function initGalaxyParticles() {
        galaxyParticles = [];
        const ARMS = 4;
        const spiralTightness = 4.2;

        // Bulge / núcleo denso
        for (let i = 0; i < 320; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.pow(Math.random(), 0.5) * 55;
            galaxyParticles.push({
                arm: -1,
                baseAngle: a,
                radius: r,
                size: 0.9 + Math.random() * 2.0,
                alpha: 0.55 + Math.random() * 0.45,
                color: Math.random() > 0.35 ? '#ffd0e4' : '#fff6ea',
                z: (Math.random() - 0.5) * 0.2
            });
        }

        // 4 brazos densos
        for (let arm = 0; arm < ARMS; arm++) {
            const armOffset = (arm / ARMS) * Math.PI * 2;
            for (let i = 0; i < 520; i++) {
                const t = i / 520;
                const radius = 40 + t * 280;
                const angle = armOffset + t * spiralTightness + (Math.random() - 0.5) * 0.18;
                const spread = (Math.random() - 0.5) * (14 + t * 36);
                galaxyParticles.push({
                    arm,
                    baseAngle: angle,
                    radius: radius + spread * 0.12,
                    size: (0.7 + Math.random() * 1.6) * (1 - t * 0.35),
                    alpha: (0.3 + Math.random() * 0.55) * (1 - t * 0.4),
                    color: t < 0.25
                        ? (Math.random() > 0.45 ? '#ffb3d0' : '#ffe4f0')
                        : t < 0.55
                            ? (Math.random() > 0.5 ? '#e8d0ff' : '#d4e8ff')
                            : (Math.random() > 0.55 ? '#c8d4ff' : '#f0e8ff'),
                    z: (Math.random() - 0.5) * (0.15 + t * 0.25)
                });
            }
            // Capa extra de polvo en el brazo
            for (let i = 0; i < 180; i++) {
                const t = Math.random();
                const radius = 45 + t * 260;
                const angle = armOffset + t * spiralTightness + (Math.random() - 0.5) * 0.5;
                galaxyParticles.push({
                    arm,
                    baseAngle: angle,
                    radius,
                    size: 0.4 + Math.random() * 0.9,
                    alpha: 0.12 + Math.random() * 0.25,
                    color: '#ffc0d8',
                    z: (Math.random() - 0.5) * 0.3
                });
            }
        }
    }

    function spiralPos(armIndex, t, ang, cx, cy, scale) {
        const ARMS = 4;
        const armOffset = (armIndex / ARMS) * Math.PI * 2;
        const radius = (40 + t * 280) * scale;
        const angle = armOffset + t * 4.2 + ang;
        // Proyección 3D ligera (elipse + profundidad)
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.58;
        return { x: cx + x, y: cy + y };
    }

    function initPlanets() {
        planetData = [];
        planetasLayer.innerHTML = '';
        planetsVisible = false;

        // 4 brazos × 2 planetas = 8
        const configs = [
            { arm: 0, t: 0.28 },
            { arm: 0, t: 0.62 },
            { arm: 1, t: 0.35 },
            { arm: 1, t: 0.72 },
            { arm: 2, t: 0.28 },
            { arm: 2, t: 0.62 },
            { arm: 3, t: 0.35 },
            { arm: 3, t: 0.72 }
        ];

        configs.forEach((cfg, idx) => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'planeta';
            el.dataset.idx = idx;
            el.setAttribute('aria-label', MEMORIES[idx]);
            el.style.opacity = '0';
            el.style.transform = 'scale(0)';
            el.style.pointerEvents = 'none';
            planetasLayer.appendChild(el);

            planetData.push({
                el,
                arm: cfg.arm,
                t: cfg.t,
                label: MEMORIES[idx],
                isCenter: false,
                idx
            });

            el.addEventListener('mouseenter', () => showTooltip(planetData[idx]));
            el.addEventListener('mouseleave', () => hideTooltipSoon());
            el.addEventListener('focus', () => showTooltip(planetData[idx]));
            el.addEventListener('blur', () => hideTooltipSoon());
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                showTooltip(planetData[idx], true);
            });
            el.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                showTooltip(planetData[idx], true);
            }, { passive: true });
        });

        // Agujero negro central
        const centerEl = document.createElement('button');
        centerEl.type = 'button';
        centerEl.className = 'agujero';
        centerEl.setAttribute('aria-label', 'Mi amor');
        centerEl.style.opacity = '0';
        centerEl.style.transform = 'scale(0)';
        centerEl.style.pointerEvents = 'none';
        planetasLayer.appendChild(centerEl);

        const centerData = {
            el: centerEl,
            arm: -1,
            t: 0,
            label: 'Mi amor',
            isCenter: true,
            idx: -1
        };
        planetData.push(centerData);

        centerEl.addEventListener('mouseenter', () => showTooltip(centerData));
        centerEl.addEventListener('mouseleave', () => hideTooltipSoon());
        centerEl.addEventListener('focus', () => showTooltip(centerData));
        centerEl.addEventListener('blur', () => hideTooltipSoon());
        centerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            showTooltip(centerData, true);
        });
        centerEl.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            showTooltip(centerData, true);
        }, { passive: true });
    }

    function revealPlanets() {
        if (planetsVisible) return;
        planetsVisible = true;
        planetData.forEach((p, i) => {
            const delay = p.isCenter ? 200 : 80 + i * 70;
            setTimeout(() => {
                p.el.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.34, 1.4, 0.64, 1)';
                p.el.style.opacity = '1';
                p.el.style.transform = 'scale(1)';
                p.el.style.pointerEvents = 'auto';
            }, delay);
        });
    }

    let hideTimer = null;
    function showTooltip(data, pin = false) {
        if (!planetsVisible) return;
        clearTimeout(hideTimer);
        activePlanet = data;
        tooltipPinned = pin;
        tooltipTexto.textContent = data.label;
        const btnText = btnLeer.querySelector('.btn-leer-texto');
        if (btnText) btnText.textContent = data.isCenter ? 'Final' : 'Leer';
        planetData.forEach(p => p.el.classList.remove('activo'));
        data.el.classList.add('activo');
        tooltip.classList.remove('oculta');
        requestAnimationFrame(() => tooltip.classList.add('visible'));
    }

    function hideTooltipSoon() {
        if (tooltipPinned) return;
        hideTimer = setTimeout(() => {
            tooltip.classList.remove('visible');
            if (activePlanet) activePlanet.el.classList.remove('activo');
            activePlanet = null;
            setTimeout(() => {
                if (!activePlanet) tooltip.classList.add('oculta');
            }, 250);
        }, 180);
    }

    document.addEventListener('click', (e) => {
        if (!espacioActivo) return;
        if (tooltip.contains(e.target)) return;
        if (e.target.classList.contains('planeta') || e.target.classList.contains('agujero')) return;
        tooltipPinned = false;
        hideTooltipSoon();
    });

    btnLeer.addEventListener('click', (e) => {
        e.stopPropagation();
        btnLeer.style.transform = 'scale(0.94)';
        setTimeout(() => { btnLeer.style.transform = ''; }, 150);
    });

    function spawnComet(w, h) {
        const fromLeft = Math.random() > 0.5;
        const y = Math.random() * h * 0.75 + h * 0.1;
        comets.push({
            x: fromLeft ? -60 : w + 60,
            y,
            vx: fromLeft ? 5 + Math.random() * 6 : -(5 + Math.random() * 6),
            vy: (Math.random() - 0.5) * 1.8,
            len: 50 + Math.random() * 80,
            life: 1,
            decay: 0.005 + Math.random() * 0.005
        });
    }

    // Dibuja una galaxia del cúmulo con deformación por velocidad de paso
    function drawFlyGalaxy(g, screenX, screenY, scale, stretch, alpha) {
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(g.angle);
        // Deformación: estirar en dirección del movimiento (eje X local)
        ctx.scale(1 + stretch * 1.8, Math.max(0.25, 1 - stretch * 0.55));
        ctx.globalAlpha = alpha;

        const s = g.size * scale;

        // Halo
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
        halo.addColorStop(0, `hsla(${g.hue}, 70%, 75%, 0.35)`);
        halo.addColorStop(0.5, `hsla(${g.hue}, 60%, 50%, 0.12)`);
        halo.addColorStop(1, 'transparent');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.18);
        core.addColorStop(0, 'rgba(255,245,250,0.9)');
        core.addColorStop(0.4, `hsla(${g.hue}, 80%, 70%, 0.5)`);
        core.addColorStop(1, 'transparent');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Brazos
        ctx.lineCap = 'round';
        for (let a = 0; a < g.arms; a++) {
            const off = (a / g.arms) * Math.PI * 2;
            ctx.beginPath();
            for (let i = 0; i <= 50; i++) {
                const t = i / 50;
                const r = t * s * 0.85;
                const ang = off + t * 3.0;
                const x = Math.cos(ang) * r;
                const y = Math.sin(ang) * r * 0.55;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `hsla(${g.hue}, 65%, 70%, 0.35)`;
            ctx.lineWidth = Math.max(1.2, s * 0.035);
            ctx.stroke();
        }

        ctx.restore();
        g.angle += g.spin;
    }

    function drawMainGalaxy(cx, cy, scale, alpha) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow volumétrico 3D
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 * scale);
        glow.addColorStop(0, 'rgba(255, 100, 150, 0.28)');
        glow.addColorStop(0.25, 'rgba(200, 60, 120, 0.12)');
        glow.addColorStop(0.55, 'rgba(120, 40, 100, 0.05)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 170 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Disco / elipse de perspectiva
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.58); // inclinación 3D fuerte
        const disk = ctx.createRadialGradient(0, 0, 10 * scale, 0, 0, 290 * scale);
        disk.addColorStop(0, 'rgba(255, 200, 220, 0.08)');
        disk.addColorStop(0.4, 'rgba(180, 100, 160, 0.04)');
        disk.addColorStop(1, 'transparent');
        ctx.fillStyle = disk;
        ctx.beginPath();
        ctx.arc(0, 0, 290 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Partículas ordenadas por “profundidad” aproximada (y)
        // Para look 3D simple: las de atrás (ángulo) se dibujan primero
        const sorted = galaxyParticles.slice().sort((a, b) => {
            const ay = Math.sin(a.baseAngle + galaxyAngle);
            const by = Math.sin(b.baseAngle + galaxyAngle);
            return ay - by;
        });

        for (const p of sorted) {
            const angle = p.baseAngle + galaxyAngle;
            const rx = Math.cos(angle) * p.radius * scale;
            const ry = Math.sin(angle) * p.radius * scale * 0.58;
            // Parallax de profundidad
            const depth = 1 + (p.z || 0) * 0.15;
            const x = cx + rx * depth;
            const y = cy + ry * depth;

            // Sombreado según “lado” (iluminación 3D simple)
            const light = 0.65 + 0.35 * Math.cos(angle - 0.8);

            ctx.beginPath();
            ctx.arc(x, y, p.size * scale * 0.95 * depth, 0, Math.PI * 2);
            ctx.globalAlpha = alpha * p.alpha * light * (0.8 + 0.2 * Math.sin(Date.now() * 0.0015 + p.radius));
            ctx.fillStyle = p.color;
            ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function drawHeart3D(cx, cy, scale, alpha) {
        if (alpha <= 0.01) return;
        const hx = cx;
        const hy = cy - 70 * scale;
        const s = 3.1 * scale;

        ctx.save();
        ctx.translate(hx, hy);
        ctx.globalAlpha = alpha;

        // Rotación Y simulada + tilt
        const cosA = Math.cos(heartAngle);
        const sinA = Math.sin(heartAngle);

        function project(ox, oy, oz) {
            // rotación alrededor de Y
            const x1 = ox * cosA - oz * sinA;
            const z1 = ox * sinA + oz * cosA;
            // tilt (rotación X)
            const y1 = oy * Math.cos(heartTilt) - z1 * Math.sin(heartTilt);
            const z2 = oy * Math.sin(heartTilt) + z1 * Math.cos(heartTilt);
            // perspectiva
            const persp = 1 + z2 * 0.012;
            return { x: x1 * s * persp, y: y1 * s * persp, z: z2, persp };
        }

        // Ordenar por profundidad
        const all = [];
        heartStarsOuter.forEach(st => {
            all.push({ ...st, layer: 'outer' });
        });
        heartStarsInner.forEach(st => {
            all.push({ ...st, layer: 'inner' });
        });

        const projected = all.map(st => {
            const pr = project(st.ox, st.oy, (st.z || 0) * 8);
            return { st, pr };
        });
        projected.sort((a, b) => a.pr.z - b.pr.z);

        for (const { st, pr } of projected) {
            const tw = 0.6 + 0.4 * Math.sin(Date.now() * 0.003 + st.phase);
            const r = st.r * scale * tw * pr.persp;
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
            if (st.layer === 'outer') {
                ctx.fillStyle = `rgba(190, 30, 80, ${0.8 * tw})`;
            } else {
                ctx.fillStyle = `rgba(255, 185, 205, ${0.92 * tw})`;
            }
            ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function updatePlanetPositions(cx, cy, scale) {
        for (const p of planetData) {
            let x, y;
            if (p.isCenter) {
                x = cx;
                y = cy;
            } else {
                const pos = spiralPos(p.arm, p.t, galaxyAngle, cx, cy, scale);
                x = pos.x;
                y = pos.y;
            }
            p.el.style.left = x + 'px';
            p.el.style.top = y + 'px';
            if (activePlanet === p) {
                tooltip.style.left = x + 'px';
                tooltip.style.top = y + 'px';
            }
        }
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function loopEspacio(now) {
        if (!espacioActivo) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w * 0.5;
        const cy = h * 0.48;

        ctx.clearRect(0, 0, w, h);

        // Progreso del viaje
        if (fase === 'viaje' || fase === 'llegando') {
            viajeT = Math.min(1, (now - viajeStart) / VIAJE_MS);
        }

        const et = easeInOutCubic(viajeT);

        // --- Estrellas de fondo (fijas, parpadean) ---
        for (const s of stars) {
            s.phase += s.speed;
            const a = s.baseAlpha * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase)));
            // Durante el viaje, un poco de motion streak
            const streak = fase !== 'centrada' ? (1 - et) * 2.5 : 0;
            if (streak > 0.3) {
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x, s.y + streak * 8);
                ctx.strokeStyle = `rgba(255, 240, 250, ${a * 0.5})`;
                ctx.lineWidth = s.r * 0.8;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 240, 250, ${a})`;
            ctx.fill();
        }

        // --- Cúmulo de galaxias en el viaje ---
        // Cámara avanza en Z: zCam de ~1.2 (lejos) a ~0 (cerca)
        const zCam = 1.15 - et * 1.12;
        const blurFeel = (1 - et) * 8; // para opacidad/stretch

        if (fase !== 'centrada' || mainGalaxyAlpha < 0.99) {
            for (const g of flyGalaxies) {
                // profundidad relativa a la cámara
                const relZ = g.z - zCam + 0.15;
                if (relZ <= 0.02) continue; // ya la pasamos

                // perspectiva
                const persp = 1 / relZ;
                const screenX = cx + g.lx * w * 0.42 * persp;
                const screenY = cy + g.ly * h * 0.38 * persp;
                const sc = persp * 0.55;

                // stretch = deformación al pasar rápido (más cerca = más stretch si la estamos dejando atrás)
                const speedFactor = (1 - et) * 1.4 + 0.15;
                const stretch = Math.max(0, (0.25 - relZ) * 3) * speedFactor;

                let alpha = Math.min(1, persp * 0.35) * (0.3 + et * 0.5);
                if (g.isTarget) {
                    // la objetivo se funde con la principal
                    alpha *= (1 - Math.min(1, mainGalaxyAlpha * 1.5));
                }
                if (alpha < 0.02) continue;

                // Si está muy cerca y lateral, más deformada
                drawFlyGalaxy(g, screenX, screenY, sc, stretch, alpha * (0.7 + 0.3 * (1 - stretch)));
            }
        }

        // --- Galaxia principal (aparece al final del viaje) ---
        if (viajeT > 0.55) {
            mainGalaxyAlpha = Math.min(1, (viajeT - 0.55) / 0.4);
        }
        if (fase === 'centrada') {
            mainGalaxyAlpha = 1;
        }

        const mainScale = Math.min(w, h) / 520; // más grande que antes
        drawMainGalaxy(cx, cy, mainScale, mainGalaxyAlpha);
        drawHeart3D(cx, cy, mainScale, mainGalaxyAlpha);

        // Cometas (solo cuando ya estamos centrados o casi)
        if (fase === 'centrada' || viajeT > 0.75) {
            if (Math.random() < 0.01) spawnComet(w, h);
            for (let i = comets.length - 1; i >= 0; i--) {
                const c = comets[i];
                c.x += c.vx;
                c.y += c.vy;
                c.life -= c.decay;
                if (c.life <= 0 || c.x < -120 || c.x > w + 120) {
                    comets.splice(i, 1);
                    continue;
                }
                const tailX = c.x - Math.sign(c.vx) * c.len;
                const grad = ctx.createLinearGradient(c.x, c.y, tailX, c.y - c.vy * 8);
                grad.addColorStop(0, `rgba(255, 220, 240, ${0.9 * c.life})`);
                grad.addColorStop(0.4, `rgba(255, 150, 180, ${0.4 * c.life})`);
                grad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(tailX, c.y - c.vy * 6);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.2;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${c.life})`;
                ctx.fill();
            }
        }

        // Rotaciones (solo cuando se ve la galaxia)
        if (mainGalaxyAlpha > 0.2) {
            galaxyAngle += 0.0014;
            heartAngle += 0.008;
        }

        // Planetas: actualizar posición siempre (aunque transparentes)
        updatePlanetPositions(cx, cy, mainScale);

        // Transición de fase
        if (fase === 'viaje' && viajeT >= 1) {
            fase = 'centrada';
            // Pequeña pausa y luego revelar planetas
            setTimeout(() => {
                revealPlanets();
                hintEspacio.classList.add('visible');
                setTimeout(() => hintEspacio.classList.remove('visible'), 5000);
            }, 400);
        }

        espacioAnimId = requestAnimationFrame(loopEspacio);
    }

    function iniciarEspacio() {
        document.body.classList.add('modo-espacio');
        espacio.classList.remove('oculta');
        espacio.setAttribute('aria-hidden', 'false');
        espacioActivo = true;
        fase = 'viaje';
        viajeT = 0;
        mainGalaxyAlpha = 0;
        planetsVisible = false;
        viajeStart = performance.now();

        resizeEspacio();
        const w = window.innerWidth;
        const h = window.innerHeight;

        initStars(w, h);
        initFlyGalaxies(w, h);
        initHeartStars();
        initGalaxyParticles();
        initPlanets();
        comets = [];
        galaxyAngle = 0.6;
        heartAngle = 0;

        // Sin la animación CSS vieja — el zoom lo hace el loop con perspectiva
        zoomCapa.classList.remove('zoom-intro');
        zoomCapa.style.transform = 'none';
        zoomCapa.style.filter = 'none';
        zoomCapa.style.opacity = '1';

        // Motion blur agresivo al inicio vía CSS filter, se quita al terminar
        zoomCapa.style.filter = 'blur(10px) brightness(0.55)';
        zoomCapa.style.transition = 'filter 5.2s cubic-bezier(0.2, 0.7, 0.2, 1)';
        requestAnimationFrame(() => {
            zoomCapa.style.filter = 'blur(0px) brightness(1)';
        });

        espacioAnimId = requestAnimationFrame(loopEspacio);
    }
});
