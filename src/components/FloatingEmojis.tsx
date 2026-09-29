import { useEffect, useRef } from "react";

const COUNT = 18;

// 🤔가 제각각 방향/속도/크기로 떠다니다가 화면 끝에서 튕기는 배경
export default function FloatingEmojis({ emoji = "🤔" }: { emoji?: string }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current!;
    // 폰처럼 좁은 화면에서는 이모지를 조금 작게
    const scale = Math.min(1, Math.max(0.6, window.innerWidth / 700));
    const items = Array.from({ length: COUNT }, () => {
      const size = (18 + Math.random() * 54) * scale;
      const speed = 30 + Math.random() * 150; // px/초
      const angle = Math.random() * Math.PI * 2;
      const el = document.createElement("span");
      el.textContent = emoji;
      el.style.fontSize = `${size}px`;
      root.append(el);
      return {
        el,
        size,
        x: Math.random() * (window.innerWidth - size),
        y: Math.random() * (window.innerHeight - size),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 240, // 도/초
      };
    });

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (const it of items) {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        if (it.x < 0) (it.x = 0), (it.vx = Math.abs(it.vx));
        if (it.x > w - it.size) (it.x = w - it.size), (it.vx = -Math.abs(it.vx));
        if (it.y < 0) (it.y = 0), (it.vy = Math.abs(it.vy));
        if (it.y > h - it.size) (it.y = h - it.size), (it.vy = -Math.abs(it.vy));
        it.el.style.transform = `translate(${it.x}px, ${it.y}px) rotate(${it.rot}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      root.replaceChildren();
    };
  }, [emoji]);

  return <div className="float-layer" ref={layer} aria-hidden="true" />;
}
