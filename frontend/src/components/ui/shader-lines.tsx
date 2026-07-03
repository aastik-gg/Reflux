import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Line {
  x: number;
  y: number;
  len: number;
  angle: number;
  speed: number;
  alpha: number;
}

export function ShaderAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const cx = () => w / 2;
    const cy = () => h / 2;

    const spawn = (): Line => {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      if (edge === 0) { x = Math.random() * w; y = -20; }
      else if (edge === 1) { x = w + 20; y = Math.random() * h; }
      else if (edge === 2) { x = Math.random() * w; y = h + 20; }
      else { x = -20; y = Math.random() * h; }
      return {
        x, y,
        len: 20 + Math.random() * 50,
        angle: Math.atan2(cy() - y, cx() - x),
        speed: 0.6 + Math.random() * 1.2,
        alpha: 0.12 + Math.random() * 0.25,
      };
    };

    const COUNT = 80;
    const lines: Line[] = Array.from({ length: COUNT }, () => {
      const l = spawn();
      const t = Math.random() * 0.85;
      l.x = l.x + (cx() - l.x) * t;
      l.y = l.y + (cy() - l.y) * t;
      l.angle = Math.atan2(cy() - l.y, cx() - l.x);
      return l;
    });

    let frame = 0;
    const draw = () => {
      frame++;
      if (frame % 2 !== 0) return;

      ctx.clearRect(0, 0, w, h);
      const centerX = cx();
      const centerY = cy();
      for (const l of lines) {
        l.x += Math.cos(l.angle) * l.speed;
        l.y += Math.sin(l.angle) * l.speed;
        l.angle = Math.atan2(centerY - l.y, centerX - l.x);

        const dx = centerX - l.x;
        const dy = centerY - l.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const deadZone = Math.min(w, h) * 0.18;
        const fadeStart = deadZone + 80;
        const fade = dist < deadZone ? 0 : dist < fadeStart ? (dist - deadZone) / (fadeStart - deadZone) : 1;
        const a = l.alpha * fade;

        if (a > 0.005) {
          const ex = l.x + Math.cos(l.angle) * l.len;
          const ey = l.y + Math.sin(l.angle) * l.len;

          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (dist < deadZone) Object.assign(l, spawn());
      }
    };

    gsap.ticker.add(draw);
    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full absolute top-0 left-0" />;
}
