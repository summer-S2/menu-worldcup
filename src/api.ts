import { normalizeNode, normalizeSettings, type Settings, type TreeNode } from "./types";

export type SiteData = { tree: TreeNode; settings: Settings };

export async function fetchData(): Promise<SiteData> {
  const res = await fetch("/api/menu");
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { tree: unknown; settings?: unknown };
  return { tree: normalizeNode(data.tree), settings: normalizeSettings(data.settings) };
}

// 암호 확인. 맞으면 true, 틀리면 false, 그 외 오류는 throw
export async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch("/api/menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, verifyOnly: true }),
  });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error(String(res.status));
  return true;
}

export async function saveData(password: string, data: SiteData): Promise<void> {
  const res = await fetch("/api/menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, tree: data.tree, settings: data.settings }),
  });
  if (!res.ok) throw new Error(String(res.status));
}

export const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null);
