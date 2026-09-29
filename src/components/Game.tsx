import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { findNode, type MenuNode, type Option, type QuestionNode, type TreeNode } from "../types";
import FloatingEmojis from "./FloatingEmojis";
import PickButton from "./PickButton";
import ResultView from "./ResultView";

const pathOf = (node: QuestionNode | MenuNode) => `/${node.kind === "q" ? "q" : "r"}/${node.id}`;
const PICK_ANIM_MS = 420; // 고른 뒤 다음 화면으로 넘어가기까지 (전환 효과 시간)

// 주소: /start       첫 질문
//       /q/:id       중간 질문
//       /r/:id       결과 (공유용)
export default function Game({ tree }: { tree: TreeNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // 아직 비어 있는 칸을 고른 경우 (주소 없이 화면에만 표시)
  const [pending, setPending] = useState<string | null>(null);
  // 방금 고른 선택지 (전환 효과 중)
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    setPending(null);
    setPicked(null);
  }, [pathname]);

  const restart = () => navigate("/start");

  if (!tree) {
    return <section className="card empty">아직 등록된 메뉴가 없어요 🥲</section>;
  }

  // 주소 → 현재 노드
  let current: QuestionNode | MenuNode;
  let trail: string[] = [];
  const m = pathname.match(/^\/(q|r)\/([a-z0-9]+)\/?$/);
  if (pathname === "/start") {
    current = tree;
  } else {
    const found = m && findNode(tree, m[2]);
    if (!found) {
      return (
        <section className="card result">
          <p className="empty">없어진 링크예요 🫥</p>
          <div className="row">
            <button className="btn primary" onClick={restart}>
              처음부터
            </button>
          </div>
        </section>
      );
    }
    current = found.node;
    trail = found.trail;
  }

  // 주소 종류(q/r)와 실제 노드가 다르면 올바른 주소로
  const want = pathOf(current);
  if (pathname !== want && !(pathname === "/start" && current.kind === "q")) {
    return <Navigate to={want} replace />;
  }

  const choose = (opt: Option, i: number) => {
    if (picked !== null) return;
    setPicked(i);
    navigator.vibrate?.(15);
    window.setTimeout(() => {
      if (opt.node) navigate(pathOf(opt.node));
      else {
        setPicked(null);
        setPending(opt.label);
      }
    }, PICK_ANIM_MS);
  };

  const pickClass = (i: number) =>
    `pick c${i % 5}` + (picked === null ? "" : picked === i ? " chosen" : " dropped");

  let body;
  if (pending !== null) {
    body = (
      <div className="result">
        <p className="empty">여기는 아직 준비 중이에요 🚧</p>
        <div className="row">
          <button className="btn primary" onClick={restart}>
            처음부터
          </button>
        </div>
      </div>
    );
    trail = [...trail, pending];
  } else if (current.kind === "menu") {
    body = <ResultView key={current.id} menu={current} trail={trail} onRestart={restart} />;
  } else {
    const q = current;
    body = (
      <>
        <FloatingEmojis />
        {/* key가 바뀌면 다시 그려지면서 옆에서 미끄러져 들어온다 */}
        <div key={q.id} className="q-enter">
          <div className="step">{trail.length + 1}번째 선택</div>
          {q.title.trim() && <h2 className="question">{q.title}</h2>}
          {q.options.length === 2 ? (
            <div className="vs">
              <PickButton className={pickClass(0)} disabled={picked !== null} onClick={() => choose(q.options[0], 0)}>
                {q.options[0].label || "A"}
              </PickButton>
              <span className={`vs-badge${picked !== null ? " hide" : ""}`}>VS</span>
              <PickButton className={pickClass(1)} disabled={picked !== null} onClick={() => choose(q.options[1], 1)}>
                {q.options[1].label || "B"}
              </PickButton>
            </div>
          ) : (
            <div className="picks">
              {q.options.map((opt, i) => (
                <PickButton key={i} className={pickClass(i)} disabled={picked !== null} onClick={() => choose(opt, i)}>
                  {opt.label || String.fromCharCode(65 + (i % 26))}
                </PickButton>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <section className="card">
      {body}
      {/* 결과 화면은 두구두구가 끝난 뒤 ResultView 안에서 보여줌 */}
      {current.kind !== "menu" && trail.length > 0 && <div className="trail">{trail.join(" → ")}</div>}
    </section>
  );
}
