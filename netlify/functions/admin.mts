import {
  MAX_CUP_NAME,
  cloneWithNewIds,
  countMenus,
  isValidNode,
  newId,
  normalizeNode,
  normalizeSettings,
  treeProblems,
  type Cup,
} from "../../src/types.ts";
import { loadCups, saveCups } from "../lib/cups.mts";

// 관리자 API: 모든 요청은 POST { password, action, ... }
//   verify                         암호 확인
//   list                           월드컵 목록 (요약)
//   get      { id }                월드컵 하나 (트리/문구 포함)
//   create   { name, copyFrom? }   새로 만들기 / 복제
//   update   { id, name?, tree?, settings? }
//   delete   { id }                활성 월드컵은 삭제 불가
//   activate { id }                미완성 월드컵은 활성화 불가
// 덜 만든(미완성) 월드컵도 저장은 되지만, 활성 월드컵은 미완성으로 저장할 수 없다

const MAX_BODY = 300_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const cleanName = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_CUP_NAME) : "");

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: "too large" }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return json({ error: "ADMIN_PASSWORD not set" }, 500);
  if (body.password !== secret) return json({ error: "wrong password" }, 401);

  const action = body.action;
  if (action === "verify") return json({ ok: true });

  const data = await loadCups();
  const find = (id: unknown) => data.cups.find((c) => c.id === id);

  switch (action) {
    case "list":
      return json({
        activeId: data.activeId,
        cups: data.cups.map((c) => ({
          id: c.id,
          name: c.name,
          menuCount: countMenus(c.tree),
          complete: treeProblems(c.tree).length === 0,
          updatedAt: c.updatedAt,
        })),
      });

    case "get": {
      const cup = find(body.id);
      return cup ? json({ cup, active: cup.id === data.activeId }) : json({ error: "not found" }, 404);
    }

    case "create": {
      const name = cleanName(body.name);
      if (!name) return json({ error: "name required" }, 400);
      let tree = null;
      let settings = normalizeSettings(null);
      if (body.copyFrom !== undefined) {
        const src = find(body.copyFrom);
        if (!src) return json({ error: "not found" }, 404);
        tree = cloneWithNewIds(src.tree);
        settings = { ...src.settings };
      }
      const cup: Cup = { id: newId(), name, tree, settings, updatedAt: Date.now() };
      data.cups.push(cup);
      if (!data.activeId) data.activeId = cup.id; // 활성 월드컵이 없으면 첫 월드컵을 활성화
      await saveCups(data);
      return json({ id: cup.id });
    }

    case "update": {
      const cup = find(body.id);
      if (!cup) return json({ error: "not found" }, 404);
      if (body.name !== undefined) {
        const name = cleanName(body.name);
        if (!name) return json({ error: "name required" }, 400);
        cup.name = name;
      }
      if (body.tree !== undefined) {
        if (!isValidNode(body.tree)) return json({ error: "invalid tree" }, 400);
        const tree = normalizeNode(body.tree);
        if (cup.id === data.activeId && treeProblems(tree).length) return json({ error: "incomplete" }, 409);
        cup.tree = tree;
      }
      if (body.settings !== undefined) cup.settings = normalizeSettings(body.settings);
      cup.updatedAt = Date.now();
      await saveCups(data);
      return json({ ok: true });
    }

    case "delete": {
      const cup = find(body.id);
      if (!cup) return json({ error: "not found" }, 404);
      if (cup.id === data.activeId) return json({ error: "active cup" }, 409);
      data.cups = data.cups.filter((c) => c.id !== cup.id);
      await saveCups(data);
      return json({ ok: true });
    }

    case "activate": {
      const cup = find(body.id);
      if (!cup) return json({ error: "not found" }, 404);
      if (treeProblems(cup.tree).length) return json({ error: "incomplete" }, 409);
      data.activeId = cup.id;
      await saveCups(data);
      return json({ ok: true });
    }
  }

  return json({ error: "unknown action" }, 400);
};

export const config = { path: "/api/admin" };
