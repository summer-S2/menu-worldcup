import { useNavigate } from "react-router";

const TEXT = "메뉴를 골라볼까요?";
const TOP_FOODS = ["🍕", "🍔", "🍣", "🍜", "🍝", "🍛", "🍱", "🥟", "🌮", "🍗", "🥩", "🍤", "🍙", "🥘"];
const BOTTOM_FOODS = ["🍩", "🍰", "🧋", "🍦", "🥐", "🧁", "🍪", "🥞", "🍡", "🍓", "🍮", "🥨", "🍫", "🍧"];

// 음식 띠: 같은 목록을 두 번 이어 붙이고 절반만큼 이동시켜 끊김 없이 반복
function FoodStrip({ foods, direction }: { foods: string[]; direction: "left" | "right" }) {
  const items = [...foods, ...foods];
  return (
    <div className={`strip strip-${direction}`} aria-hidden="true">
      <div className="strip-track">
        {items.map((f, i) => (
          <span key={i}>{f}</span>
        ))}
      </div>
    </div>
  );
}

export default function Intro() {
  const navigate = useNavigate();

  return (
    <div className="intro">
      <FoodStrip foods={TOP_FOODS} direction="left" />

      <div className="intro-center">
        <h1 className="bounce-text" aria-label={TEXT}>
          {Array.from(TEXT).map((ch, i) => (
            <span key={i} aria-hidden="true" style={{ animationDelay: `${i * 0.09}s` }}>
              {ch === " " ? " " : ch}
            </span>
          ))}
        </h1>
        <button className="btn primary start-btn" onClick={() => navigate("/start")}>
          시작하기
        </button>
      </div>

      <FoodStrip foods={BOTTOM_FOODS} direction="right" />
    </div>
  );
}
