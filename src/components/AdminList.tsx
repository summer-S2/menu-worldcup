import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MAX_CUP_NAME, type CupSummary } from "../types";
import { activateCup, AdminError, createCup, deleteCup, listCups } from "../api";

type Props = {
  password: string;
  onChanged: () => void; // 활성 월드컵이 바뀌면 공개 페이지 데이터 다시 불러오기
  onExit: () => void;
};

type Msg = { kind: "" | "ok" | "err"; text: string };

const formatTime = (t: number) =>
  t ? new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

// 월드컵 목록: 만들기 / 복제 / 활성화 / 삭제 (수정은 편집 화면에서)
export default function AdminList({ password, onChanged, onExit }: Props) {
  const navigate = useNavigate();
  const [cups, setCups] = useState<CupSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>({ kind: "", text: "" });

  const reload = async () => {
    const data = await listCups(password);
    setCups(data.cups);
    setActiveId(data.activeId);
  };

  useEffect(() => {
    reload().catch(() => setMsg({ kind: "err", text: "목록을 불러오지 못했어요 😵" }));
  }, [password]);

  // 버튼 동작 공통: 진행 중 표시, 실패 메시지, 끝나면 목록 새로고침
  const run = async (fn: () => Promise<void>, okText: string) => {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      await fn();
      await reload();
      setMsg({ kind: "ok", text: okText });
    } catch (e) {
      const code = e instanceof AdminError ? e.code : (e as Error).message;
      const text =
        code === "active cup"
          ? "활성 월드컵은 지울 수 없어요. 다른 걸 먼저 활성화해 주세요"
          : code === "incomplete"
            ? "미완성 월드컵은 활성화할 수 없어요. 수정에서 비어 있는 곳을 채워 주세요"
            : `실패했어요 (${code})`;
      setMsg({ kind: "err", text });
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const create = () => {
    const name = newName.trim();
    if (!name) {
      setMsg({ kind: "err", text: "새 월드컵 이름을 입력해 주세요" });
      return;
    }
    run(async () => {
      const { id } = await createCup(password, name);
      setNewName("");
      navigate(`/admin/${id}`);
    }, "만들었어요 ✅");
  };

  const duplicate = (cup: CupSummary) =>
    run(async () => {
      await createCup(password, `${cup.name} 복사본`.slice(0, MAX_CUP_NAME), cup.id);
    }, `'${cup.name}'을(를) 복제했어요 ✅`);

  const activate = (cup: CupSummary) =>
    run(async () => {
      await activateCup(password, cup.id);
      onChanged();
    }, `이제 '${cup.name}'이(가) 사이트에 나와요 ✅`);

  const remove = (cup: CupSummary) =>
    run(async () => {
      await deleteCup(password, cup.id);
    }, `'${cup.name}'을(를) 삭제했어요`);

  return (
    <section>
      <div className="admin-bar">
        <b>🔧 월드컵 목록</b>
        <div className="row">
          <button className="btn" onClick={onExit}>
            나가기
          </button>
        </div>
      </div>
      <p className={`msg ${msg.kind}`}>{msg.text}</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="qhead">➕ 새 월드컵</div>
        <div className="new-cup">
          <input
            type="text"
            maxLength={MAX_CUP_NAME}
            placeholder="이름 (예: 회식용)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button className="btn primary" onClick={create} disabled={busy}>
            만들기
          </button>
        </div>
      </div>

      {cups === null ? (
        !msg.text && <div className="card empty">불러오는 중...</div>
      ) : cups.length === 0 ? (
        <div className="card empty">저장된 월드컵이 없어요. 위에서 새로 만들어 보세요</div>
      ) : (
        <div className="cup-list">
          {cups.map((cup) => {
            const isActive = cup.id === activeId;
            return (
              <div key={cup.id} className={`card cup${isActive ? " active" : ""}`}>
                <div className="cup-info">
                  <div className="cup-name">
                    {cup.name || "(이름 없음)"} {isActive && <span className="badge">활성</span>}
                    {!cup.complete && <span className="badge incomplete">미완성</span>}
                  </div>
                  <div className="hint">
                    메뉴 {cup.menuCount}개 · 수정 {formatTime(cup.updatedAt)}
                  </div>
                </div>
                {confirmDelete === cup.id ? (
                  <div className="cup-actions">
                    <span className="hint">정말 삭제할까요?</span>
                    <button className="btn small danger" disabled={busy} onClick={() => remove(cup)}>
                      삭제
                    </button>
                    <button className="btn small" onClick={() => setConfirmDelete(null)}>
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="cup-actions">
                    <button className="btn small" onClick={() => navigate(`/admin/${cup.id}`)}>
                      수정
                    </button>
                    <button className="btn small" disabled={busy} onClick={() => duplicate(cup)}>
                      복제
                    </button>
                    {!isActive && (
                      <>
                        <button
                          className="btn small primary"
                          disabled={busy || !cup.complete}
                          title={cup.complete ? undefined : "미완성 월드컵은 활성화할 수 없어요"}
                          onClick={() => activate(cup)}
                        >
                          활성화
                        </button>
                        <button className="btn small danger" disabled={busy} onClick={() => setConfirmDelete(cup.id)}>
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="hint" style={{ marginTop: 12 }}>
        활성 월드컵 1개만 사이트에 나와요. 미완성 월드컵은 활성화할 수 없고, 활성 월드컵은 다른 걸 활성화한 뒤에 지울 수 있어요.
      </p>
    </section>
  );
}
