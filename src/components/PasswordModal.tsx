import { useState } from "react";
import { verifyPassword } from "../api";

type Props = {
  onClose: () => void;
  onSuccess: (password: string) => void;
};

export default function PasswordModal({ onClose, onSuccess }: Props) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setMsg("");
    try {
      if (await verifyPassword(pw)) onSuccess(pw);
      else setMsg("땡! 🙅");
    } catch {
      setMsg("서버 오류가 났어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <p style={{ marginTop: 0 }}>
          <b>🤫 비밀번호</b>
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <p className="msg err">{msg}</p>
        <div className="row">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
