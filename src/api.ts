import { normalizeNode, type TreeNode } from "./types";

export async function fetchTree(): Promise<TreeNode> {
  const res = await fetch("/api/menu");
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { tree: unknown };
  return normalizeNode(data.tree);
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

export async function saveTree(password: string, tree: TreeNode): Promise<void> {
  const res = await fetch("/api/menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, tree }),
  });
  if (!res.ok) throw new Error(String(res.status));
}

export const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : null);
