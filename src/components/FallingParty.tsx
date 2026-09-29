import { useMemo, type CSSProperties } from "react";

const EMOJIS = ["🐰", "🐰", "🐰", "🎆", "🎇", "🎉"];
const COUNT = 36;

// 토끼랑 폭죽이 빙글빙글 돌면서 하늘에서 계속 떨어지는 배경
export default function FallingParty() {
  const drops = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const duration = 3 + Math.random() * 4;
        return {
          emoji: EMOJIS[i % EMOJIS.length],
          left: Math.random() * 100,
          size: 20 + Math.random() * 36,
          duration,
          delay: Math.random() * duration, // 순차적으로 쏟아지도록 시작 시점을 흩뿌림
          spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
          sway: (Math.random() - 0.5) * 120,
        };
      }),
    []
  );

  return (
    <div className="fall-layer" aria-hidden="true">
      {drops.map((d, i) => (
        <span
          key={i}
          style={
            {
              left: `${d.left}%`,
              fontSize: `${d.size}px`,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
              "--spin": `${d.spin}deg`,
              "--sway": `${d.sway}px`,
            } as CSSProperties
          }
        >
          {d.emoji}
        </span>
      ))}
    </div>
  );
}
