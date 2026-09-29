import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import type { TreeNode } from "./types";
import { fetchTree } from "./api";
import Game from "./components/Game";
import Admin from "./components/Admin";
import PasswordModal from "./components/PasswordModal";
import Intro from "./components/Intro";

type LoadState = "loading" | "ready" | "error";

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [tree, setTree] = useState<TreeNode>(null);
  const [load, setLoad] = useState<LoadState>("loading");
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    fetchTree()
      .then((t) => {
        setTree(t);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);

  // 이스터에그: 아이콘을 1.5초 안에 5번 누르면 관리 화면(암호 입력)으로
  const taps = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const onEggClick = () => {
    taps.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => (taps.current = 0), 1500);
    if (taps.current >= 5) {
      taps.current = 0;
      navigate("/admin");
    }
  };

  const exitAdmin = () => {
    setPassword(null);
    navigate("/start");
  };

  // 인트로는 제목/카드 없이 화면 전체를 쓴다
  if (pathname === "/") return <Intro />;

  let content;
  if (load === "loading") content = <section className="card empty">불러오는 중...</section>;
  else if (load === "error") content = <section className="card empty">메뉴를 불러오지 못했어요 😵</section>;
  else
    content = (
      <Routes>
        <Route
          path="/admin"
          element={
            password ? (
              <Admin password={password} tree={tree} onSaved={setTree} onExit={exitAdmin} />
            ) : (
              <PasswordModal onClose={() => navigate("/start")} onSuccess={setPassword} />
            )
          }
        />
        <Route path="*" element={<Game tree={tree} />} />
      </Routes>
    );

  return (
    <main>
      <h1>
        <span className="egg" onClick={onEggClick}>
          🍽️
        </span>{" "}
        <span className="title-text">오늘 뭐 먹지?</span>
      </h1>
      <p className="sub">둘 중 하나만 골라요</p>
      {content}
    </main>
  );
}
