import { getStore } from "@netlify/blobs";
import { isValidNode } from "../../src/types.ts";

const MAX_BODY = 200_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req: Request) => {
  const store = getStore("menu-worldcup");

  if (req.method === "GET") {
    const tree = await store.get("tree", { type: "json" });
    return json({ tree: tree ?? null });
  }

  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "too large" }, 413);

    let body: { password?: unknown; verifyOnly?: unknown; tree?: unknown };
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
    await store.setJSON("tree", body.tree);
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/menu" };
