import { useState } from "react";
import { newId, type Option, type QuestionNode, type TreeNode } from "../types";
import { safeUrl, saveTree } from "../api";

type Props = {
  password: string;
  tree: TreeNode;
  onSaved: (tree: TreeNode) => void;
  onExit: () => void;
};

type Msg = { kind: "" | "ok" | "err"; text: string };

const newQuestion = (): QuestionNode => ({
  kind: "q",
  id: newId(),
  title: "",
  left: { label: "", node: null },
  right: { label: "", node: null },
});

// 비어있는 칸 / 누락 항목 찾기
function findProblems(node: TreeNode, path = "처음"): string[] {
  if (node === null) return [`${path}: 비어 있음`];
  if (node.kind === "menu") {
    const p: string[] = [];
    if (!node.name.trim()) p.push(`${path}: 메뉴 이름 없음`);
    if (node.url.trim() && !safeUrl(node.url)) p.push(`${path}: 지도 URL은 http로 시작해야 함`);
    return p;
  }
  const own = node.title.trim() ? [] : [`${path}: 질문 문장 없음`];
  return own.concat(
    (["left", "right"] as const).flatMap((key) => {
      const opt = node[key];
      const name = opt.label.trim() || (key === "left" ? "A" : "B");
      const p = opt.label.trim() ? [] : [`${path} → ${name}: 선택지 이름 없음`];
      return [...p, ...findProblems(opt.node, `${path} → ${name}`)];
    })
  );
}

export default function Admin({ password, tree, onSaved, onExit }: Props) {
  const [draft, setDraft] = useState<TreeNode>(tree);
  const [msg, setMsg] = useState<Msg>({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const problems = draft === null ? [] : findProblems(draft);
    if (problems.length) {
      const more = problems.length > 3 ? ` 외 ${problems.length - 3}개` : "";
      setMsg({ kind: "err", text: `채워야 할 곳이 있어요: ${problems.slice(0, 3).join(" / ")}${more}` });
      return;
    }
    setBusy(true);
    setMsg({ kind: "", text: "저장 중..." });
    try {
      await saveTree(password, draft);
      onSaved(draft);
      setMsg({ kind: "ok", text: "저장했어요 ✅" });
    } catch (e) {
      setMsg({ kind: "err", text: `저장에 실패했어요 (${(e as Error).message})` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="admin-bar">
        <b>🔧 메뉴 관리</b>
        <div className="row">
          <button className="btn" onClick={onExit}>
            나가기
          </button>
          <button className="btn primary" onClick={save} disabled={busy}>
            저장
          </button>
        </div>
      </div>
      <p className={`msg ${msg.kind}`}>{msg.text}</p>
      <div className="card">
        <div className="hint" style={{ marginBottom: 8 }}>
          첫 질문
        </div>
        <NodeEditor node={draft} onChange={setDraft} />
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        각 선택지 끝에 <b>질문</b>을 붙이면 계속 고르고, <b>메뉴</b>를 붙이면 결과가 나와요. 저장을 눌러야
        반영돼요.
      </p>
    </section>
  );
}

function NodeEditor({ node, onChange }: { node: TreeNode; onChange: (n: TreeNode) => void }) {
  if (node === null) {
    return (
      <div className="choose">
        <button className="btn small" onClick={() => onChange(newQuestion())}>
          + 질문 붙이기
        </button>
        <button className="btn small" onClick={() => onChange({ kind: "menu", id: newId(), name: "", url: "" })}>
          + 메뉴 붙이기
        </button>
      </div>
    );
  }

  const remove = (
    <button className="btn small danger" onClick={() => onChange(null)}>
      삭제
    </button>
  );

  if (node.kind === "menu") {
    return (
      <div className="menubox">
        <div className="qhead">
          <span>🍴 메뉴</span>
          {remove}
        </div>
        <input
          type="text"
          placeholder="메뉴 이름 (예: 삼겹살)"
          value={node.name}
          onChange={(e) => onChange({ ...node, name: e.target.value })}
        />
        <input
          type="url"
          placeholder="지도 URL (https://...)"
          value={node.url}
          onChange={(e) => onChange({ ...node, url: e.target.value })}
        />
      </div>
    );
  }

  const setOption = (key: "left" | "right", opt: Option) => onChange({ ...node, [key]: opt });

  return (
    <div className="qbox">
      <div className="qhead">
        <span>❓ 질문</span>
        {remove}
      </div>
      <input
        type="text"
        placeholder="질문 (예: 오늘은 뭐가 당겨?)"
        value={node.title}
        onChange={(e) => onChange({ ...node, title: e.target.value })}
      />
      <OptionEditor dot="a" placeholder="선택지 A (예: 고기)" option={node.left} onChange={(o) => setOption("left", o)} />
      <OptionEditor dot="b" placeholder="선택지 B (예: 면)" option={node.right} onChange={(o) => setOption("right", o)} />
    </div>
  );
}

type OptionEditorProps = {
  dot: "a" | "b";
  placeholder: string;
  option: Option;
  onChange: (o: Option) => void;
};

function OptionEditor({ dot, placeholder, option, onChange }: OptionEditorProps) {
  return (
    <div className="opt">
      <div className="opt-label">
        <span className={`dot ${dot}`} />
        <input
          type="text"
          placeholder={placeholder}
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
        />
      </div>
      <div className="node">
        <NodeEditor node={option.node} onChange={(n) => onChange({ ...option, node: n })} />
      </div>
    </div>
  );
}
