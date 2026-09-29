// 메뉴 트리
// 질문: 질문 문장(title)과 두 선택지. 하나를 고르면 다음 노드로 이동
// 메뉴: 최종 결과
// null: 아직 비어 있는 칸
// id: 주소(/q/:id, /r/:id)에 쓰는 추측 불가능한 랜덤 값
export type Option = { label: string; node: TreeNode };
export type QuestionNode = { kind: "q"; id: string; title: string; left: Option; right: Option };
export type MenuNode = { kind: "menu"; id: string; name: string; url: string };
export type TreeNode = QuestionNode | MenuNode | null;

const ID_RE = /^[a-z0-9]{8,16}$/;
const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

export function isValidNode(node: unknown, depth = 0): node is TreeNode {
  if (depth > 50) return false;
  if (node === null) return true;
  if (typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  if (typeof n.id !== "string" || !ID_RE.test(n.id)) return false;
  if (n.kind === "menu") {
    return typeof n.name === "string" && typeof n.url === "string";
  }
  if (n.kind === "q") {
    if (typeof n.title !== "string") return false;
    return [n.left, n.right].every((opt) => {
      if (!opt || typeof opt !== "object") return false;
      const o = opt as Record<string, unknown>;
      return typeof o.label === "string" && isValidNode(o.node, depth + 1);
    });
  }
  return false;
}

// 예전 형식이나 항목이 빠진 데이터를 현재 형식으로 맞춘다 (빠진 칸은 빈 값, 빠진/중복 id는 새로 발급)
export function normalizeNode(node: unknown, seen = new Set<string>(), depth = 0): TreeNode {
  if (depth > 50 || !node || typeof node !== "object") return null;
  const n = node as Record<string, any>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  let id = typeof n.id === "string" && ID_RE.test(n.id) && !seen.has(n.id) ? n.id : newId();
  while (seen.has(id)) id = newId();
  seen.add(id);
  if (n.kind === "menu") return { kind: "menu", id, name: str(n.name), url: str(n.url) };
  if (n.kind === "q") {
    const opt = (o: any): Option => ({ label: str(o?.label), node: normalizeNode(o?.node, seen, depth + 1) });
    return { kind: "q", id, title: str(n.title), left: opt(n.left), right: opt(n.right) };
  }
  return null;
}

// id로 노드를 찾고, 거기까지 고른 선택지 이름들을 함께 돌려준다
export function findNode(
  node: TreeNode,
  id: string,
  trail: string[] = []
): { node: QuestionNode | MenuNode; trail: string[] } | null {
  if (!node) return null;
  if (node.id === id) return { node, trail };
  if (node.kind === "menu") return null;
  for (const opt of [node.left, node.right]) {
    const found = findNode(opt.node, id, [...trail, opt.label]);
    if (found) return found;
  }
  return null;
}
