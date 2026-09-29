import { useEffect, useRef, useState } from "react";
import type { TreeNode } from "./types";
import { fetchTree } from "./api";
import Game from "./components/Game";
import Admin from "./components/Admin";
import PasswordModal from "./components/PasswordModal";

type LoadState = "loading" | "ready" | "error";

export default function App() {
  const [tree, setTree] = useState<TreeNode>(null);
  const [load, setLoad] = useState<LoadState>("loading");
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    fetchTree()
      .then((t) => {
        setTree(t);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);

  // 이스터에그: 아이콘을 1.5초 안에 5번 누르면 암호 입력창
  const taps = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const onEggClick = () => {
    taps.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => (taps.current = 0), 1500);
    if (taps.current >= 5) {
      taps.current = 0;
      setPwOpen(true);
    }
  };

  return (
    <main>
      <h1>
        <span className="egg" onClick={onEggClick}>
          🍽️
        </span>{" "}
        오늘 뭐 먹지?
      </h1>
      <p className="sub">둘 중 하나만 골라요</p>

      {password ? (
        <Admin
          password={password}
          tree={tree}
          onSaved={setTree}
          onExit={() => setPassword(null)}
        />
      ) : load === "loading" ? (
        <section className="card empty">불러오는 중...</section>
      ) : load === "error" ? (
        <section className="card empty">메뉴를 불러오지 못했어요 😵</section>
      ) : (
        <Game tree={tree} />
      )}

      {pwOpen && (
        <PasswordModal
          onClose={() => setPwOpen(false)}
          onSuccess={(pw) => {
            setPwOpen(false);
            setPassword(pw);
          }}
        />
      )}
    </main>
  );
}
