import { normalizeSettings } from "../../src/types.ts";
import { loadCups } from "../lib/cups.mts";

// 공개 API: 활성 월드컵의 메뉴와 문구만 돌려준다 (비활성 월드컵은 관리자 API로만)
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req: Request) => {
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
  const { activeId, cups } = await loadCups();
  const active = cups.find((c) => c.id === activeId);
  return json({ tree: active?.tree ?? null, settings: active?.settings ?? normalizeSettings(null) });
};

export const config = { path: "/api/menu" };
