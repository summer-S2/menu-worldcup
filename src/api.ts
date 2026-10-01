import {
  normalizeCup,
  normalizeNode,
  normalizeSettings,
  type Cup,
  type CupSummary,
  type Settings,
  type TreeNode,
} from "./types";

export type SiteData = { tree: TreeNode; settings: Settings };

// 공개: 활성 월드컵
export async function fetchData(): Promise<SiteData> {
  const res = await fetch("/api/menu");
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { tree: unknown; settings?: unknown };
  return { tree: normalizeNode(data.tree), settings: normalizeSettings(data.settings) };
}

// ── 관리자 ──
export class AdminError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function admin<T>(password: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AdminError(res.status, (data as { error?: string }).error ?? String(res.status));
  return data as T;
}

// 암호 확인. 맞으면 true, 틀리면 false, 그 외 오류는 throw
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    await admin(password, "verify");
    return true;
  } catch (e) {
    if (e instanceof AdminError && e.status === 401) return false;
    throw e;
  }
}

export const listCups = (password: string) =>
  admin<{ activeId: string | null; cups: CupSummary[] }>(password, "list");

export async function getCup(password: string, id: string): Promise<{ cup: Cup; active: boolean }> {
  const data = await admin<{ cup: unknown; active: boolean }>(password, "get", { id });
  const cup = normalizeCup(data.cup);
  if (!cup) throw new AdminError(500, "bad cup");
  return { cup, active: data.active };
}

export const createCup = (password: string, name: string, copyFrom?: string) =>
  admin<{ id: string }>(password, "create", { name, copyFrom });

export const updateCup = (
  password: string,
  id: string,
  patch: { name?: string; tree?: TreeNode; settings?: Settings }
) => admin<{ ok: true }>(password, "update", { id, ...patch });

export const deleteCup = (password: string, id: string) => admin<{ ok: true }>(password, "delete", { id });

export const activateCup = (password: string, id: string) => admin<{ ok: true }>(password, "activate", { id });

export const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null);
