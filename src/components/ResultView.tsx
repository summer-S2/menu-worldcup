import { useEffect, useState } from "react";
import type { MenuNode } from "../types";
import { safeUrl } from "../api";
import LinkPreview from "./LinkPreview";
import FallingParty from "./FallingParty";
import ShareButton from "./ShareButton";

// 두구두구 동안 돌아가는 이모지 (메뉴 이름이나 선택지는 결과 전까지 숨김)
const SLOT_EMOJIS = ["🍜", "🍕", "🍣", "🍔", "🍝", "🥘", "🍛", "🍱", "🥟", "🌮", "🍗", "🥩", "🍤", "🍙", "🥗", "🍩"];

// 결과: 음식 이모지가 슬롯머신처럼 돌다가 멈추면 메뉴가 나오고 토끼와 폭죽이 터진다
export default function ResultView({
  menu,
  trail,
  onRestart,
}: {
  menu: MenuNode;
  trail: string[];
  onRestart: () => void;
}) {
  const [rolling, setRolling] = useState(true);
  const [shown, setShown] = useState("");

  useEffect(() => {
    const pool = SLOT_EMOJIS;
    let delay = 55;
    let i = Math.floor(Math.random() * pool.length);
    let timer: number;
    setRolling(true);

    const step = () => {
      i = (i + 1) % pool.length;
      setShown(pool[i]);
      navigator.vibrate?.(5);
      delay *= 1.13; // 점점 느려지기
      if (delay > 380) {
        timer = window.setTimeout(() => {
          setRolling(false);
          navigator.vibrate?.([30, 40, 60]);
        }, 300);
      } else {
        timer = window.setTimeout(step, delay);
      }
    };
    step();
    return () => clearTimeout(timer);
  }, [menu.id]);

  const url = safeUrl(menu.url);

  if (rolling) {
    return (
      <div className="result">
        <div className="step">두구두구두구...🥁</div>
        <div className="slot">
          <span key={shown}>{shown}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="result">
      <FallingParty />
      <div className="step">오늘의 메뉴는</div>
      <div className="big">{menu.name || "???"}!</div>
      <div className="result-rest">
        {url && (
          <div className="row" style={{ marginBottom: 12 }}>
            <LinkPreview url={url} />
          </div>
        )}
        <div className="row">
          <ShareButton menuName={menu.name} />
          <button className="btn" onClick={onRestart}>
            다시 하기
          </button>
        </div>
        {trail.length > 0 && <div className="trail">{trail.join(" → ")}</div>}
      </div>
    </div>
  );
}
