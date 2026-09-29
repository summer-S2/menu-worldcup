import { useState } from "react";

// 폰: 기본 공유창(카톡 등) / PC: 링크 복사
export default function ShareButton({ menuName }: { menuName: string }) {
  const [msg, setMsg] = useState("");

  const share = async () => {
    const url = window.location.href;
    const text = `오늘의 메뉴는 ${menuName}! 🍽️`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "오늘 뭐 먹지?", text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // 사용자가 공유창을 닫음
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMsg("링크를 복사했어요 📋");
    } catch {
      setMsg("복사에 실패했어요. 주소창의 링크를 복사해 주세요");
    }
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <>
      <button className="btn primary" onClick={share}>
        🔗 결과 공유
      </button>
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
