import { useState } from "react";
import {
  DEFAULT_SETTINGS,
  MAX_TEXT,
  MIN_OPTIONS,
  newId,
  type Option,
  type QuestionNode,
  type Settings,
  type TreeNode,
} from "../types";
import { safeUrl, saveData, type SiteData } from "../api";

type Props = {
  password: string;
  tree: TreeNode;
  settings: Settings;
  onSaved: (data: SiteData) => void;
  onExit: () => void;
};

type Msg = { kind: "" | "ok" | "err"; text: string };

const newQuestion = (): QuestionNode => ({
  kind: "q",
  id: newId(),
  title: "",
  options: [
    { label: "", node: null },
    { label: "", node: null },
  ],
});

// 선택지 이름표: A, B, C, ...
const optName = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
const EXAMPLES = ["고기", "면", "밥", "빵"];

// 비어있는 칸 / 누락 항목 찾기
function findProblems(node: TreeNode, path = "처음"): string[] {
  if (node === null) return [`${path}: 비어 있음`];
  if (node.kind === "menu") {
    const p: string[] = [];
    if (!node.name.trim()) p.push(`${path}: 메뉴 이름 없음`);
    if (node.url.trim() && !safeUrl(node.url)) p.push(`${path}: 지도 URL은 http로 시작해야 함`);
    return p;
  }
  // 질문 문장(title)은 선택 항목이라 검사하지 않음
  return node.options.flatMap((opt, i) => {
    const name = opt.label.trim() || optName(i);
    const p = opt.label.trim() ? [] : [`${path} → ${name}: 선택지 이름 없음`];
    return [...p, ...findProblems(opt.node, `${path} → ${name}`)];
  });
}

export default function Admin({ password, tree, settings, onSaved, onExit }: Props) {
  const [draft, setDraft] = useState<TreeNode>(tree);
  const [texts, setTexts] = useState<Settings>(settings);
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
      await saveData(password, { tree: draft, settings: texts });
      onSaved({ tree: draft, settings: texts });
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
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="qhead">✏️ 사이트 문구</div>
        <div className="texts">
          {(
            [
              ["introText", "인트로 문구"],
              ["title", "제목"],
              ["subtitle", "부제"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="hint">{label}</span>
              <input
                type="text"
                maxLength={MAX_TEXT}
                placeholder={DEFAULT_SETTINGS[key]}
                value={texts[key]}
                onChange={(e) => setTexts({ ...texts, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <p className="hint" style={{ margin: "8px 0 0" }}>
          비워 두면 흐린 글씨의 기본 문구가 보여요.
        </p>
      </div>
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

  const setOption = (i: number, opt: Option) =>
    onChange({ ...node, options: node.options.map((o, j) => (j === i ? opt : o)) });
  const addOption = () => onChange({ ...node, options: [...node.options, { label: "", node: null }] });
  const removeOption = (i: number) => onChange({ ...node, options: node.options.filter((_, j) => j !== i) });

  return (
    <div className="qbox">
      <div className="qhead">
        <span>❓ 질문</span>
        {remove}
      </div>
      <input
        type="text"
        placeholder="질문 (선택, 예: 오늘은 뭐가 당겨?)"
        value={node.title}
        onChange={(e) => onChange({ ...node, title: e.target.value })}
      />
      {node.options.map((opt, i) => (
        <OptionEditor
          key={i}
          color={i % 5}
          placeholder={`선택지 ${optName(i)}${EXAMPLES[i] ? ` (예: ${EXAMPLES[i]})` : ""}`}
          option={opt}
          onChange={(o) => setOption(i, o)}
          onRemove={node.options.length > MIN_OPTIONS ? () => removeOption(i) : undefined}
        />
      ))}
      <div className="choose" style={{ marginTop: 10 }}>
        <button className="btn small" onClick={addOption}>
          + 선택지 추가
        </button>
      </div>
    </div>
  );
}

type OptionEditorProps = {
  color: number;
  placeholder: string;
  option: Option;
  onChange: (o: Option) => void;
  onRemove?: () => void; // 최소 개수보다 많을 때만 삭제 가능
};

function OptionEditor({ color, placeholder, option, onChange, onRemove }: OptionEditorProps) {
  return (
    <div className="opt">
      <div className="opt-label">
        <span className={`dot c${color}`} />
        <input
          type="text"
          placeholder={placeholder}
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
        />
        {onRemove && (
          <button className="btn small danger" onClick={onRemove} aria-label="선택지 삭제">
            ✕
          </button>
        )}
      </div>
      <div className="node">
        <NodeEditor node={option.node} onChange={(n) => onChange({ ...option, node: n })} />
      </div>
    </div>
  );
}
