"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  s: number;
  c: string;
}
interface Shoot {
  x: number;
  y: number;
  len: number;
  vx: number;
  vy: number;
  life: number;
}

/** Animated galaxy / starfield canvas behind the whole app. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let shoot: Shoot | null = null;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(170, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        a: Math.random(),
        s: Math.random() * 0.02 + 0.004,
        c:
          Math.random() > 0.85
            ? "255,140,210"
            : Math.random() > 0.5
              ? "140,230,255"
              : "255,255,255",
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.a += s.s;
        const tw = 0.4 + Math.abs(Math.sin(s.a)) * 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fillStyle = `rgba(${s.c},${tw})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${s.c},${tw})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (!shoot && Math.random() < 0.004) {
        shoot = {
          x: Math.random() * w * 0.6,
          y: Math.random() * h * 0.4,
          len: 0,
          vx: 6 + Math.random() * 4,
          vy: 2 + Math.random() * 2,
          life: 1,
        };
      }
      if (shoot) {
        const g = ctx.createLinearGradient(
          shoot.x,
          shoot.y,
          shoot.x - shoot.len,
          shoot.y - shoot.len * 0.5
        );
        g.addColorStop(0, "rgba(140,230,255,0.9)");
        g.addColorStop(1, "rgba(140,230,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(shoot.x - shoot.len, shoot.y - shoot.len * 0.5);
        ctx.stroke();
        shoot.x += shoot.vx;
        shoot.y += shoot.vy;
        shoot.len = Math.min(160, shoot.len + 14);
        shoot.life -= 0.012;
        if (shoot.life <= 0 || shoot.x > w) shoot = null;
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="night-bg fixed inset-0 -z-20 animate-drift" />
      <div
        className="fixed inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,140,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,140,255,0.05) 1px,transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage:
            "radial-gradient(circle at 50% 30%,#000 0%,transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 30%,#000 0%,transparent 80%)",
        }}
      />
      <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10" />
    </>
  );
}
