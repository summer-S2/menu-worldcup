import { useState } from "react";
import type { Option, TreeNode } from "../types";
import { safeUrl } from "../api";

export default function Game({ tree }: { tree: TreeNode }) {
  const [current, setCurrent] = useState<TreeNode>(tree);
  const [trail, setTrail] = useState<string[]>([]);

  const restart = () => {
    setCurrent(tree);
    setTrail([]);
  };

  const choose = (opt: Option) => {
    setTrail((t) => [...t, opt.label]);
    setCurrent(opt.node);
  };

  if (!tree) {
    return <section className="card empty">아직 등록된 메뉴가 없어요 🥲</section>;
  }

  let body;
  if (current === null) {
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
  } else if (current.kind === "menu") {
    const url = safeUrl(current.url);
    body = (
      <div className="result">
        <div className="step">오늘의 메뉴는</div>
        <div className="big">{current.name || "???"}!</div>
        <div className="row">
          {url && (
            <a className="btn primary" href={url} target="_blank" rel="noopener noreferrer">
              📍 지도 보기
            </a>
          )}
          <button className="btn" onClick={restart}>
            다시 하기
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="step">{trail.length + 1}번째 선택</div>
        <div className="vs">
          <button className="pick a" onClick={() => choose(current.left)}>
            {current.left.label || "A"}
          </button>
          <span>VS</span>
          <button className="pick b" onClick={() => choose(current.right)}>
            {current.right.label || "B"}
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
