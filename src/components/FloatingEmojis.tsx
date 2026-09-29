import { useEffect, useRef } from "react";

const COUNT = 18;
const POP_EMOJIS = ["😋", "🤤", "🤩", "😮", "🥳", "😆", "😍", "🤔"];
const FLEE_RADIUS = 130; // 이 거리 안으로 마우스/손가락이 오면 도망
const POP_MS = 450;

type Item = {
  el: HTMLSpanElement;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  base: number; // 원래 속도 (도망친 뒤 이 속도로 돌아옴)
  rot: number;
  vr: number;
  popAt: number | null; // 터진 시각
  swapped: boolean;
};

// 🤔가 제각각 방향/속도/크기로 떠다니다가 화면 끝에서 튕기는 배경.
// 마우스/손가락을 피해 도망가고, 누르면 펑 터지면서 다른 이모지로 바뀐다.
export default function FloatingEmojis({ emoji = "🤔" }: { emoji?: string }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current!;
    // 폰처럼 좁은 화면에서는 이모지를 조금 작게
    const scale = Math.min(1, Math.max(0.6, window.innerWidth / 700));
    const pointer = { x: -9999, y: -9999 };

    const items: Item[] = Array.from({ length: COUNT }, () => {
      const size = (18 + Math.random() * 54) * scale;
      const speed = 30 + Math.random() * 150; // px/초
      const angle = Math.random() * Math.PI * 2;
      const el = document.createElement("span");
      el.textContent = emoji;
      el.style.fontSize = `${size}px`;
      root.append(el);
      const item: Item = {
        el,
        size,
        x: Math.random() * (window.innerWidth - size),
        y: Math.random() * (window.innerHeight - size),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        base: speed,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 240, // 도/초
        popAt: null,
        swapped: false,
      };
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (item.popAt !== null) return;
        item.popAt = performance.now();
        item.swapped = false;
        navigator.vibrate?.(10);
      });
      return item;
    });

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    // 손가락은 떼면 그 자리에 계속 있는 게 아니므로 위치를 지운다
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (const it of items) {
        // 도망가기: 가까울수록 세게 밀어낸다
        const cx = it.x + it.size / 2;
        const cy = it.y + it.size / 2;
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < FLEE_RADIUS && dist > 0.1) {
          const push = (1 - dist / FLEE_RADIUS) * 2200 * dt;
          it.vx += (dx / dist) * push;
          it.vy += (dy / dist) * push;
        }
        // 빨라진 속도는 천천히 원래대로
        const speed = Math.hypot(it.vx, it.vy) || 1;
        const max = 520;
        const target = speed > it.base ? Math.max(it.base, speed - speed * 1.2 * dt) : speed;
        const k = Math.min(target, max) / speed;
        it.vx *= k;
        it.vy *= k;

        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        if (it.x < 0) (it.x = 0), (it.vx = Math.abs(it.vx));
        if (it.x > w - it.size) (it.x = w - it.size), (it.vx = -Math.abs(it.vx));
        if (it.y < 0) (it.y = 0), (it.vy = Math.abs(it.vy));
        if (it.y > h - it.size) (it.y = h - it.size), (it.vy = -Math.abs(it.vy));

        // 펑: 커지면서 사라졌다가 다른 이모지로 다시 톡 나타남
        let s = 1;
        let opacity = "";
        if (it.popAt !== null) {
          const t = (now - it.popAt) / POP_MS;
          if (t < 0.5) {
            s = 1 + t * 1.6;
            opacity = String(1 - t * 2);
          } else if (t < 1) {
            if (!it.swapped) {
              const choices = POP_EMOJIS.filter((e) => e !== it.el.textContent);
              it.el.textContent = choices[Math.floor(Math.random() * choices.length)];
              it.swapped = true;
            }
            const u = (t - 0.5) * 2;
            s = u < 0.7 ? (u / 0.7) * 1.2 : 1.2 - ((u - 0.7) / 0.3) * 0.2;
            opacity = "1";
          } else {
            it.popAt = null;
          }
        }
        it.el.style.opacity = opacity;
        it.el.style.transform = `translate(${it.x}px, ${it.y}px) rotate(${it.rot}deg) scale(${s})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      root.replaceChildren();
    };
  }, [emoji]);

  return <div className="float-layer" ref={layer} aria-hidden="true" />;
}
