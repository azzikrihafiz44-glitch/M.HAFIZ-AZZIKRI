import React, { useCallback, useEffect, useRef, useState } from 'react';

interface IntroSplashProps {
  brandName?: string;
  introVideoUrl?: string;
  skip?: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  twinklePhase: number;
  speed: number;
  color: string;
}

interface BurstRay {
  angle: number;
  speed: number;
  length: number;
  width: number;
  hue: 'cyan' | 'gold' | 'white';
  delay: number;
}

interface OrbitalParticle {
  angle: number;
  radiusScale: number;
  tilt: number;
  speed: number;
  size: number;
  color: string;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({
  brandName = 'Hafiz Education',
  introVideoUrl = '',
  skip = false,
}) => {
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState<boolean>(() => {
    if (skip) return true;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('autostart') === '1';
    } catch {
      return false;
    }
  });
  const [phase, setPhase] = useState<'zoom' | 'aura' | 'burst' | 'orbit'>('zoom');
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const emblemRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const exitTimersRef = useRef<{ fade?: number; remove?: number }>({});

  const hasCustomVideo = Boolean(introVideoUrl?.trim()) && !videoFailed;

  const triggerExit = useCallback(() => {
    if (exitTimersRef.current.fade) return;
    setExiting(true);
    exitTimersRef.current.remove = window.setTimeout(() => {
      setDone(true);
    }, 480);
  }, []);

  const handleSkip = useCallback(() => {
    if (exitTimersRef.current.fade) {
      window.clearTimeout(exitTimersRef.current.fade);
    }
    if (exitTimersRef.current.remove) {
      window.clearTimeout(exitTimersRef.current.remove);
    }
    setExiting(true);
    window.setTimeout(() => setDone(true), 240);
  }, []);

  useEffect(() => {
    setVideoFailed(false);
  }, [introVideoUrl]);

  useEffect(() => {
    if (skip) {
      setDone(true);
      return;
    }
    if (done) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (hasCustomVideo) {
      const safetyTimer = window.setTimeout(() => {
        triggerExit();
      }, 15000);
      return () => {
        window.clearTimeout(safetyTimer);
      };
    }

    const totalMs = prefersReducedMotion ? 1300 : 4250;
    const auraTimer = window.setTimeout(() => setPhase('aura'), 850);
    const burstTimer = window.setTimeout(() => setPhase('burst'), 1750);
    const orbitTimer = window.setTimeout(() => setPhase('orbit'), 2650);

    const fadeTimer = window.setTimeout(() => {
      setExiting(true);
    }, totalMs);

    const removeTimer = window.setTimeout(() => {
      setDone(true);
    }, totalMs + 500);

    exitTimersRef.current = { fade: fadeTimer, remove: removeTimer };

    return () => {
      window.clearTimeout(auraTimer);
      window.clearTimeout(burstTimer);
      window.clearTimeout(orbitTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [done, skip, hasCustomVideo, triggerExit]);

  // Cosmic 60fps Canvas matching the 4-stage Cosmic Supernova & Twin Orbital Ring Intro Video
  useEffect(() => {
    if (done || skip || hasCustomVideo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    const startTime = performance.now();

    const stars: Star[] = Array.from({ length: 120 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.7,
      twinklePhase: i * 0.43,
      speed: 0.002 + Math.random() * 0.006,
      color:
        i % 7 === 0 ? 'rgba(253, 224, 71, 0.95)' : i % 4 === 0 ? 'rgba(125, 211, 252, 0.9)' : 'rgba(255, 255, 255, 0.85)',
    }));

    const burstRays: BurstRay[] = Array.from({ length: 140 }, (_, i) => ({
      angle: (i / 140) * Math.PI * 2 + (Math.random() - 0.5) * 0.06,
      speed: 210 + Math.random() * 480,
      length: 34 + Math.random() * 125,
      width: 1.2 + Math.random() * 2.6,
      hue: i % 3 === 0 ? 'gold' : i % 5 === 0 ? 'white' : 'cyan',
      delay: Math.random() * 0.16,
    }));

    const orbParticles: OrbitalParticle[] = Array.from({ length: 42 }, (_, i) => ({
      angle: (i / 42) * Math.PI * 2,
      radiusScale: 0.94 + Math.random() * 0.14,
      tilt: i % 2 === 0 ? -0.36 : 0.42,
      speed: (i % 2 === 0 ? 1 : -1) * (0.9 + Math.random() * 0.65),
      size: 1.5 + Math.random() * 2.2,
      color: i % 2 === 0 ? 'rgba(251, 191, 36, 0.95)' : 'rgba(103, 232, 249, 0.95)',
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawRing3D = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      rotation: number,
      colorGlow: string,
      colorOuter: string,
      colorCore: string,
      alpha: number
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Soft outer halo stroke (fast without shadowBlur)
      ctx.globalAlpha = alpha * 0.28;
      ctx.strokeStyle = colorGlow;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Main luminous ring
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = colorOuter;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Crisp inner filament
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colorCore;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const render = (now: number) => {
      const elapsedSec = prefersReducedMotion ? 3.2 : (now - startTime) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      let cx = w / 2;
      let cy = h / 2 - 72;
      let emblemHalf = Math.min(w, h) * 0.14;
      const rect = emblemRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
        emblemHalf = rect.width / 2;
      }

      ctx.clearRect(0, 0, w, h);

      // Deep space background + nebula haze
      const bgGrad = ctx.createRadialGradient(cx, cy, 16, cx, cy, Math.max(w, h) * 0.8);
      bgGrad.addColorStop(0, '#0c1c3b');
      bgGrad.addColorStop(0.45, '#070f23');
      bgGrad.addColorStop(1, '#02050d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle indigo-cyan & gold-teal cosmic nebula wisps
      const neb1 = ctx.createRadialGradient(w * 0.25, h * 0.3, 10, w * 0.25, h * 0.3, w * 0.42);
      neb1.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
      neb1.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
      neb1.addColorStop(1, 'transparent');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, w, h);

      const neb2 = ctx.createRadialGradient(w * 0.78, h * 0.7, 10, w * 0.78, h * 0.7, w * 0.45);
      neb2.addColorStop(0, 'rgba(251, 191, 36, 0.11)');
      neb2.addColorStop(0.5, 'rgba(20, 184, 166, 0.08)');
      neb2.addColorStop(1, 'transparent');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, w, h);

      // Starfield
      for (const s of stars) {
        const twinkle = 0.45 + 0.55 * Math.sin(elapsedSec * 2.6 + s.twinklePhase);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Stage 1 (0.0s - 1.3s): Bottom-left diagonal starlight flare
      if (elapsedSec < 1.45) {
        const flareAlpha = Math.max(0, 1 - elapsedSec / 1.4);
        const fx = w * 0.14 + elapsedSec * 42;
        const fy = h * 0.82 - elapsedSec * 32;
        const fg = ctx.createRadialGradient(fx, fy, 1, fx, fy, 120);
        fg.addColorStop(0, `rgba(255, 255, 255, ${flareAlpha})`);
        fg.addColorStop(0.25, `rgba(125, 211, 252, ${flareAlpha * 0.78})`);
        fg.addColorStop(1, 'transparent');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }

      // Stage 2 (0.7s - 2.35s): Swirling Golden & Cyan Plasma Lightning Rings around Emblem
      if (elapsedSec >= 0.7 && elapsedSec <= 2.35) {
        const localT = (elapsedSec - 0.7) / 1.65;
        const auraAlpha = Math.sin(Math.min(1, localT) * Math.PI);
        const ringR = emblemHalf * (1.14 + 0.06 * Math.sin(elapsedSec * 6));

        ctx.save();
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          const steps = 80;
          for (let i = 0; i <= steps; i++) {
            const ang = (i / steps) * Math.PI * 2 + elapsedSec * (k === 0 ? 2.4 : -1.9);
            const jitter =
              Math.sin(ang * 9 + elapsedSec * 14 + k * 2) * 7 +
              Math.cos(ang * 15 - elapsedSec * 11) * 4;
            const rr = ringR + jitter;
            const px = cx + Math.cos(ang) * rr;
            const py = cy + Math.sin(ang) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          ctx.globalAlpha = auraAlpha * 0.3;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.lineWidth = 9;
          ctx.stroke();

          ctx.globalAlpha = auraAlpha * 0.95;
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.95)';
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }

        // Ice-cyan electric counter-aura
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const ang = (i / 72) * Math.PI * 2 - elapsedSec * 3.1;
          const jitter = Math.sin(ang * 12 + elapsedSec * 18) * 6;
          const rr = ringR * 1.07 + jitter;
          const px = cx + Math.cos(ang) * rr;
          const py = cy + Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.globalAlpha = auraAlpha * 0.3;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.globalAlpha = auraAlpha * 0.92;
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.95)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Stage 3 (1.7s - 3.25s): Supernova Cyan & Gold Starlight Burst + Anamorphic Flare
      if (elapsedSec >= 1.7 && elapsedSec <= 3.25) {
        const burstElapsed = elapsedSec - 1.7;
        const burstFade = Math.max(0, 1 - burstElapsed / 1.45);
        const flashIntensity = Math.sin(Math.min(1, burstElapsed / 0.55) * Math.PI * 0.5) * burstFade;

        const coreGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, emblemHalf * 3.4);
        coreGlow.addColorStop(0, `rgba(224, 242, 254, ${flashIntensity * 0.92})`);
        coreGlow.addColorStop(0.35, `rgba(56, 189, 248, ${flashIntensity * 0.68})`);
        coreGlow.addColorStop(0.68, `rgba(251, 191, 36, ${flashIntensity * 0.34})`);
        coreGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGlow;
        ctx.fillRect(0, 0, w, h);

        // Horizontal anamorphic lens flare streak centered on emblem
        const flareW = w * (0.68 + burstElapsed * 0.3);
        const anamorphic = ctx.createLinearGradient(cx - flareW / 2, cy, cx + flareW / 2, cy);
        anamorphic.addColorStop(0, 'transparent');
        anamorphic.addColorStop(0.35, `rgba(56, 189, 248, ${flashIntensity * 0.45})`);
        anamorphic.addColorStop(0.5, `rgba(255, 255, 255, ${flashIntensity * 0.92})`);
        anamorphic.addColorStop(0.65, `rgba(56, 189, 248, ${flashIntensity * 0.45})`);
        anamorphic.addColorStop(1, 'transparent');
        ctx.fillStyle = anamorphic;
        ctx.fillRect(cx - flareW / 2, cy - 3.5, flareW, 7);

        ctx.save();
        for (const ray of burstRays) {
          const rt = burstElapsed - ray.delay;
          if (rt <= 0) continue;
          const dist = emblemHalf * 0.88 + rt * ray.speed;
          const tail = Math.max(emblemHalf * 0.65, dist - ray.length);
          const x1 = cx + Math.cos(ray.angle) * tail;
          const y1 = cy + Math.sin(ray.angle) * tail;
          const x2 = cx + Math.cos(ray.angle) * dist;
          const y2 = cy + Math.sin(ray.angle) * dist;

          ctx.globalAlpha = burstFade * 0.9;
          ctx.lineWidth = ray.width;
          ctx.lineCap = 'round';
          ctx.strokeStyle =
            ray.hue === 'gold'
              ? 'rgba(253, 224, 71, 0.95)'
              : ray.hue === 'white'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(103, 232, 249, 0.92)';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Stage 4 (2.45s+): Twin Intersecting 3D Golden & Ice-Blue Orbital Rings locked around Emblem
      if (elapsedSec >= 2.45) {
        const orbitProgress = Math.min(1, (elapsedSec - 2.45) / 0.55);
        const rx = emblemHalf * (1.42 + 0.08 * orbitProgress);
        const ry = rx * 0.4;
        const spinOffset = (elapsedSec - 2.45) * 0.42;

        drawRing3D(
          cx,
          cy,
          rx,
          ry,
          -0.36 + spinOffset * 0.22,
          'rgba(245, 158, 11, 0.85)',
          'rgba(251, 191, 36, 0.95)',
          'rgba(254, 249, 195, 0.98)',
          orbitProgress
        );
        drawRing3D(
          cx,
          cy,
          rx * 0.96,
          ry * 1.04,
          0.42 - spinOffset * 0.26,
          'rgba(56, 189, 248, 0.85)',
          'rgba(103, 232, 249, 0.95)',
          'rgba(224, 242, 254, 0.98)',
          orbitProgress
        );

        ctx.save();
        for (const p of orbParticles) {
          const theta = p.angle + elapsedSec * p.speed;
          const lx = Math.cos(theta) * rx * p.radiusScale;
          const ly = Math.sin(theta) * ry * p.radiusScale;
          const cosR = Math.cos(p.tilt);
          const sinR = Math.sin(p.tilt);
          const px = cx + lx * cosR - ly * sinR;
          const py = cy + lx * sinR + ly * cosR;

          ctx.globalAlpha = orbitProgress * 0.35;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, p.size * 2.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = orbitProgress;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [done, skip, hasCustomVideo]);

  if (done || skip) return null;

  return (
    <div
      id="hafiz-intro-splash"
      role="presentation"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none bg-[#02050d] transition-all duration-500 ease-out ${
        exiting ? 'opacity-0 scale-[1.04] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {hasCustomVideo ? (
        <div className="relative w-full h-full flex items-center justify-center bg-[#02050d]">
          <video
            ref={videoRef}
            src={introVideoUrl}
            autoPlay
            muted={videoMuted}
            playsInline
            onEnded={triggerExit}
            onError={() => setVideoFailed(true)}
            className="w-full h-full object-contain sm:object-cover"
          />

          <div className="absolute inset-x-0 bottom-6 px-6 flex items-center justify-between pointer-events-none">
            <button
              type="button"
              onClick={() => {
                const next = !videoMuted;
                setVideoMuted(next);
                if (videoRef.current) videoRef.current.muted = next;
              }}
              aria-label={videoMuted ? 'Aktifkan Suara Video Intro' : 'Bisukan Suara Video Intro'}
              className="pointer-events-auto px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-sky-400/30 text-xs font-semibold text-sky-100 shadow-lg backdrop-blur-md transition"
            >
              {videoMuted ? '🔇 Nyalakan Suara' : '🔊 Suara Aktif'}
            </button>

            <button
              type="button"
              id="btn-skip-intro"
              onClick={handleSkip}
              className="pointer-events-auto px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-sky-400/30 text-xs font-semibold text-sky-100 shadow-lg backdrop-blur-md transition whitespace-nowrap"
            >
              Lewati →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 60fps Cosmic Supernova & Orbital Ring Canvas */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full"
          />

          {/* Centerpiece Animated Emblem matching the 4-stage Cosmic Video */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6">
            <div
              ref={emblemRef}
              className={`relative flex items-center justify-center transition-all duration-700 ease-out ${
                phase === 'zoom'
                  ? 'w-48 h-48 sm:w-64 sm:h-64 scale-105'
                  : phase === 'aura'
                    ? 'w-44 h-44 sm:w-56 sm:h-56 scale-100'
                    : phase === 'burst'
                      ? 'w-40 h-40 sm:w-52 sm:h-52 scale-[1.03]'
                      : 'w-36 h-36 sm:w-48 sm:h-48 scale-100'
              }`}
            >
              {/* Glowing Backlight Aura */}
              <div
                aria-hidden="true"
                className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                  phase === 'burst'
                    ? 'bg-cyan-400/55 scale-125'
                    : phase === 'aura'
                      ? 'bg-amber-400/38 scale-110'
                      : phase === 'orbit'
                        ? 'bg-sky-400/32 scale-105'
                        : 'bg-sky-400/20 scale-100'
                }`}
              />

              {/* Outer Circular Emblem Ring (bright in 00:00-00:02, dissolves into translucent halo in 00:03) */}
              <div
                className={`relative w-full h-full rounded-full p-1.5 transition-all duration-700 overflow-hidden ${
                  phase === 'orbit'
                    ? 'bg-gradient-to-br from-sky-400/25 via-transparent to-amber-300/25 border border-sky-300/35 shadow-[0_0_55px_rgba(56,189,248,0.45)]'
                    : 'bg-gradient-to-br from-sky-300 via-sky-100 to-amber-200 shadow-[0_0_65px_rgba(56,189,248,0.5)]'
                }`}
              >
                <div
                  className={`w-full h-full rounded-full overflow-hidden transition-colors duration-700 ${
                    phase === 'orbit' ? 'bg-[#021d1c]/80 backdrop-blur-sm p-1.5' : 'bg-[#021d1c] p-0.5'
                  }`}
                >
                  <img
                    src="/assets/hafiz-logo.png"
                    alt={`Logo ${brandName}`}
                    className={`w-full h-full rounded-full object-cover transition-all duration-700 ${
                      phase === 'burst' ? 'brightness-110 contrast-110 drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Brand Title & Subtitle Reveal — spaced cleanly below orbital rings */}
            <div
              className={`mt-10 sm:mt-12 text-center space-y-2 transition-all duration-700 ${
                phase === 'orbit' || phase === 'burst'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-90 translate-y-1'
              }`}
            >
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-wide text-gold-gradient drop-shadow-[0_4px_24px_rgba(56,189,248,0.45)]">
                {brandName}
              </h1>
              <p className="font-hud text-[11px] sm:text-xs font-semibold uppercase tracking-[0.26em] text-sky-200/90">
                Bimbingan Belajar &amp; Arena Kuis Digital
              </p>
              <div className="pt-2 flex flex-col items-center gap-1.5">
                <div className="w-52 sm:w-64 h-1 rounded-full bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-400 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width:
                        phase === 'zoom'
                          ? '28%'
                          : phase === 'aura'
                            ? '55%'
                            : phase === 'burst'
                              ? '82%'
                              : '100%',
                    }}
                  />
                </div>
                <span className="text-[11px] text-sky-200/75 tracking-wide">
                  Memasuki Dashboard Akademik...
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-skip-intro"
            onClick={handleSkip}
            className="relative z-20 sm:absolute sm:bottom-8 sm:right-8 mt-6 sm:mt-0 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-sky-400/30 text-xs font-semibold text-sky-100 shadow-lg transition whitespace-nowrap"
          >
            Lewati →
          </button>
        </>
      )}
    </div>
  );
};
