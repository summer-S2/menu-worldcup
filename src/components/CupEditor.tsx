import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  DEFAULT_SETTINGS,
  MAX_CUP_NAME,
  MAX_TEXT,
  MIN_OPTIONS,
  newId,
  optionName,
  treeProblems,
  type Option,
  type QuestionNode,
  type Settings,
  type TreeNode,
} from "../types";
import { getCup, updateCup } from "../api";

type Props = {
  password: string;
  onChanged: () => void; // 저장 후 공개 페이지 데이터 다시 불러오기
};

type Msg = { kind: "" | "ok" | "err" | "warn"; text: string };

const newQuestion = (): QuestionNode => ({
  kind: "q",
  id: newId(),
  title: "",
  options: [
    { label: "", node: null },
    { label: "", node: null },
  ],
});

const EXAMPLES = ["고기", "면", "밥", "빵"];

const summarize = (problems: string[]) =>
  problems.slice(0, 3).join(" / ") + (problems.length > 3 ? ` 외 ${problems.length - 3}곳` : "");

// 월드컵 하나 편집: 이름, 사이트 문구, 메뉴 트리
export default function CupEditor({ password, onChanged }: Props) {
  const { cupId = "" } = useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [active, setActive] = useState(false);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<TreeNode>(null);
  const [texts, setTexts] = useState<Settings>({ introText: "", title: "", subtitle: "" });
  const [msg, setMsg] = useState<Msg>({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false); // 저장을 누른 뒤 비어 있는 자리를 빨갛게 표시

  useEffect(() => {
    setLoaded("loading");
    getCup(password, cupId)
      .then(({ cup, active }) => {
        setName(cup.name);
        setDraft(cup.tree);
        setTexts(cup.settings);
        setActive(active);
        setLoaded("ok");
      })
      .catch((e) => setLoaded(e?.status === 404 ? "missing" : "error"));
  }, [password, cupId]);

  const save = async () => {
    if (!name.trim()) {
      setMsg({ kind: "err", text: "월드컵 이름을 입력해 주세요" });
      return;
    }
    const problems = treeProblems(draft);
    setShowErrors(problems.length > 0);
    // 활성 월드컵은 사이트에 바로 나가므로 미완성으로 저장할 수 없음
    if (active && problems.length) {
      setMsg({ kind: "err", text: `활성 월드컵은 다 채워야 저장할 수 있어요: ${summarize(problems)}` });
      return;
    }
    setBusy(true);
    setMsg({ kind: "", text: "저장 중..." });
    try {
      await updateCup(password, cupId, { name, tree: draft, settings: texts });
      if (active) onChanged();
      setMsg(
        problems.length
          ? { kind: "warn", text: `저장했어요. 미완성 ${problems.length}곳이 있어서 아직 활성화할 수 없어요: ${summarize(problems)}` }
          : { kind: "ok", text: "저장했어요 ✅" }
      );
    } catch (e) {
      setMsg({ kind: "err", text: `저장에 실패했어요 (${(e as Error).message})` });
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button className="btn" onClick={() => navigate("/admin")}>
      ← 목록
    </button>
  );

  if (loaded !== "ok") {
    const text =
      loaded === "loading" ? "불러오는 중..." : loaded === "missing" ? "없는 월드컵이에요 🫥" : "불러오지 못했어요 😵";
    return (
      <section>
        <div className="admin-bar">
          <b>🔧 월드컵 편집</b>
          <div className="row">{back}</div>
        </div>
        <div className="card empty">{text}</div>
      </section>
    );
  }

  return (
    <section>
      <div className="admin-bar">
        <b>
          🔧 월드컵 편집 {active && <span className="badge">활성</span>}
        </b>
        <div className="row">
          {back}
          <button className="btn primary" onClick={save} disabled={busy}>
            저장
          </button>
        </div>
      </div>
      <p className={`msg ${msg.kind}`}>{msg.text}</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="texts">
          <span className="qhead" style={{ margin: 0 }}>🏷️ 월드컵 이름</span>
          <input type="text" maxLength={MAX_CUP_NAME} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
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
          비워 두면 흐린 글씨의 기본 문구가 보여요. 이 월드컵이 활성일 때만 사이트에 나와요.
        </p>
      </div>
      <div className={`card${showErrors ? " show-errors" : ""}`}>
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
      <div className="choose empty-slot">
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
          required
          placeholder="메뉴 이름 (예: 삼겹살)"
          value={node.name}
          onChange={(e) => onChange({ ...node, name: e.target.value })}
        />
        <input
          type="url"
          pattern="https?://.*"
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
          placeholder={`선택지 ${optionName(i)}${EXAMPLES[i] ? ` (예: ${EXAMPLES[i]})` : ""}`}
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
          required
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
