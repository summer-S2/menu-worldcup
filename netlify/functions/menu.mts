import { getStore } from "@netlify/blobs";
import { isValidNode, normalizeNode, normalizeSettings } from "../../src/types.ts";

const MAX_BODY = 200_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req: Request) => {
  const store = getStore("menu-worldcup");

  if (req.method === "GET") {
    const raw = await store.get("tree", { type: "json" });
    const tree = normalizeNode(raw);
    // 예전 형식(id 없음 등)이면 한 번 고쳐서 저장해 두어야 공유 링크의 id가 매번 바뀌지 않는다
    if (raw && JSON.stringify(raw) !== JSON.stringify(tree)) await store.setJSON("tree", tree);
    const settings = normalizeSettings(await store.get("settings", { type: "json" }));
    return json({ tree, settings });
  }

  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "too large" }, 413);

    let body: { password?: unknown; verifyOnly?: unknown; tree?: unknown; settings?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "bad json" }, 400);
    }

    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) return json({ error: "ADMIN_PASSWORD not set" }, 500);
    if (body.password !== secret) return json({ error: "wrong password" }, 401);

    if (body.verifyOnly) return json({ ok: true });

    if (!isValidNode(body.tree)) return json({ error: "invalid tree" }, 400);
    await store.setJSON("tree", normalizeNode(body.tree));
    if (body.settings !== undefined) await store.setJSON("settings", normalizeSettings(body.settings));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/menu" };
