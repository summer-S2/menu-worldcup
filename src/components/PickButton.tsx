import { useState, type ReactNode } from "react";

type Ripple = { id: number; x: number; y: number; size: number };
let rippleId = 0;

// 누른 자리에서 물결이 퍼지는 선택 버튼
export default function PickButton({
  className,
  disabled,
  onClick,
  children,
}: {
  className: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = { id: ++rippleId, x: e.clientX - rect.left, y: e.clientY - rect.top, size };
    setRipples((r) => [...r, ripple]);
  };

  return (
    <button className={className} disabled={disabled} onPointerDown={onPointerDown} onClick={onClick}>
      <span className="pick-label">{children}</span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x - r.size / 2, top: r.y - r.size / 2, width: r.size, height: r.size }}
          onAnimationEnd={() => setRipples((all) => all.filter((x) => x.id !== r.id))}
        />
      ))}
    </button>
  );
}
