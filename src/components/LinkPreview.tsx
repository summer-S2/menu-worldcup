import { useEffect, useState } from "react";

type Og = { title: string | null; description: string | null; image: string | null; siteName: string | null };

// 지도 URL의 OG 카드. OG를 못 가져오면 버튼만 보여준다.
export default function LinkPreview({ url }: { url: string }) {
  const [og, setOg] = useState<Og | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setOg(null);
    setImgOk(true);
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => alive && setOg(d.error ? null : d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [url]);

  if (loading) return <div className="og og-loading">미리보기 불러오는 중...</div>;

  if (!og?.title) {
    return (
      <a className="btn primary" href={url} target="_blank" rel="noopener noreferrer">
        📍 지도 보기
      </a>
    );
  }

  return (
    <a className="og" href={url} target="_blank" rel="noopener noreferrer">
      {og.image && imgOk && (
        <img src={og.image} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)} />
      )}
      <div className="og-body">
        {og.siteName && <div className="og-site">{og.siteName}</div>}
        <div className="og-title">{og.title}</div>
        {og.description && <div className="og-desc">{og.description}</div>}
        <div className="og-go">📍 지도 보기 →</div>
      </div>
    </a>
  );
}
