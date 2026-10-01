import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { displaySettings, type Settings, type TreeNode } from "./types";
import { fetchData } from "./api";
import Game from "./components/Game";
import AdminList from "./components/AdminList";
import CupEditor from "./components/CupEditor";
import PasswordModal from "./components/PasswordModal";
import Intro from "./components/Intro";

type LoadState = "loading" | "ready" | "error";

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [tree, setTree] = useState<TreeNode>(null);
  const [settings, setSettings] = useState<Settings>({ introText: "", title: "", subtitle: "" });
  const [load, setLoad] = useState<LoadState>("loading");
  const [password, setPassword] = useState<string | null>(null);

  // 활성 월드컵 불러오기 (관리자가 저장/활성화를 바꾸면 다시 호출)
  const refresh = () =>
    fetchData()
      .then((d) => {
        setTree(d.tree);
        setSettings(d.settings);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));

  useEffect(() => {
    refresh();
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

  const text = displaySettings(settings);

  // 인트로는 제목/카드 없이 화면 전체를 쓴다 (문구는 불러온 뒤에 표시해서 기본 문구가 잠깐 보였다 바뀌지 않게)
  if (pathname === "/") return <Intro text={load === "loading" ? "" : text.introText} />;

  // 관리 화면은 암호를 확인한 뒤에만
  const adminGate = (el: React.ReactNode) =>
    password ? el : <PasswordModal onClose={() => navigate("/start")} onSuccess={setPassword} />;

  let content;
  if (load === "loading") content = <section className="card empty">불러오는 중...</section>;
  else if (load === "error") content = <section className="card empty">메뉴를 불러오지 못했어요 😵</section>;
  else
    content = (
      <Routes>
        <Route path="/admin" element={adminGate(<AdminList password={password!} onChanged={refresh} onExit={exitAdmin} />)} />
        <Route path="/admin/:cupId" element={adminGate(<CupEditor password={password!} onChanged={refresh} />)} />
        <Route path="*" element={<Game tree={tree} />} />
      </Routes>
    );

  return (
    <main>
      <h1>
        <span className="egg" onClick={onEggClick}>
          🍽️
        </span>{" "}
        <span className="title-text">{load === "loading" ? " " : text.title}</span>
      </h1>
      <p className="sub">{load === "loading" ? " " : text.subtitle}</p>
      {content}
    </main>
  );
}
