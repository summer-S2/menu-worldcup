import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { findNode, type MenuNode, type Option, type QuestionNode, type TreeNode } from "../types";
import { safeUrl } from "../api";
import LinkPreview from "./LinkPreview";
import FloatingEmojis from "./FloatingEmojis";
import FallingParty from "./FallingParty";
import ShareButton from "./ShareButton";

const pathOf = (node: QuestionNode | MenuNode) => `/${node.kind === "q" ? "q" : "r"}/${node.id}`;

// 주소: /start       첫 질문
//       /q/:id       중간 질문
//       /r/:id       결과 (공유용)
export default function Game({ tree }: { tree: TreeNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // 아직 비어 있는 칸을 고른 경우 (주소 없이 화면에만 표시)
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);

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

  const choose = (opt: Option) => {
    if (opt.node) navigate(pathOf(opt.node));
    else setPending(opt.label);
  };

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
    const url = safeUrl(current.url);
    body = (
      <div className="result">
        <FallingParty />
        <div className="step">오늘의 메뉴는</div>
        <div className="big">{current.name || "???"}!</div>
        {url && (
          <div className="row" style={{ marginBottom: 12 }}>
            <LinkPreview url={url} />
          </div>
        )}
        <div className="row">
          <ShareButton menuName={current.name} />
          <button className="btn" onClick={restart}>
            다시 하기
          </button>
        </div>
      </div>
    );
  } else {
    const q = current;
    body = (
      <>
        <FloatingEmojis />
        <div className="step">{trail.length + 1}번째 선택</div>
        <h2 className="question">{q.title}</h2>
        <div className="vs">
          <button className="pick a" onClick={() => choose(q.left)}>
            {q.left.label || "A"}
          </button>
          <span>VS</span>
          <button className="pick b" onClick={() => choose(q.right)}>
            {q.right.label || "B"}
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="card">
      {body}
      {trail.length > 0 && <div className="trail">{trail.join(" → ")}</div>}
    </section>
  );
}
