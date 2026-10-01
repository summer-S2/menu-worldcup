// 메뉴 트리
// 질문: 질문 문장(title)과 2개 이상의 선택지. 하나를 고르면 다음 노드로 이동
// 메뉴: 최종 결과
// null: 아직 비어 있는 칸
// id: 주소(/q/:id, /r/:id)에 쓰는 추측 불가능한 랜덤 값
export type Option = { label: string; node: TreeNode };
export type QuestionNode = { kind: "q"; id: string; title: string; options: Option[] };

export const MIN_OPTIONS = 2;
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
    if (!Array.isArray(n.options) || n.options.length < MIN_OPTIONS) return false;
    return n.options.every((opt) => {
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
    // 예전 형식(left/right)도 options 배열로 변환
    const raw: unknown[] = Array.isArray(n.options) ? n.options : [n.left, n.right];
    const options = raw.map(opt);
    while (options.length < MIN_OPTIONS) options.push({ label: "", node: null });
    return { kind: "q", id, title: str(n.title), options };
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
  for (const opt of node.options) {
    const found = findNode(opt.node, id, [...trail, opt.label]);
    if (found) return found;
  }
  return null;
}

// 사이트 문구 (관리 화면에서 수정). 빈 값이면 기본 문구를 보여준다
export type Settings = { introText: string; title: string; subtitle: string };

export const DEFAULT_SETTINGS: Settings = {
  introText: "메뉴를 골라볼까요?",
  title: "오늘 뭐 먹지?",
  subtitle: "하나만 골라요",
};

export const MAX_TEXT = 100;

export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_TEXT) : "");
  return { introText: str(r.introText), title: str(r.title), subtitle: str(r.subtitle) };
}

// 화면에 보여줄 문구 (빈 칸은 기본값으로)
export function displaySettings(s: Settings): Settings {
  return {
    introText: s.introText.trim() || DEFAULT_SETTINGS.introText,
    title: s.title.trim() || DEFAULT_SETTINGS.title,
    subtitle: s.subtitle.trim() || DEFAULT_SETTINGS.subtitle,
  };
}

// ── 월드컵 목록 ──
// 관리자는 여러 월드컵을 저장하고, 활성화한 1개만 공개 페이지에 나온다
export type Cup = { id: string; name: string; tree: TreeNode; settings: Settings; updatedAt: number };
export type CupSummary = { id: string; name: string; menuCount: number; complete: boolean; updatedAt: number };
export type CupsData = { activeId: string | null; cups: Cup[] };

export const MAX_CUP_NAME = 40;

export function countMenus(node: TreeNode): number {
  if (!node) return 0;
  if (node.kind === "menu") return 1;
  return node.options.reduce((n, o) => n + countMenus(o.node), 0);
}

// 복제용: 내용은 그대로, 질문/메뉴 id만 새로 발급 (원본과 공유 링크가 섞이지 않게)
export function cloneWithNewIds(node: TreeNode): TreeNode {
  if (!node) return null;
  if (node.kind === "menu") return { ...node, id: newId() };
  return {
    ...node,
    id: newId(),
    options: node.options.map((o) => ({ label: o.label, node: cloneWithNewIds(o.node) })),
  };
}

export function normalizeCup(raw: unknown): Cup | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name.slice(0, MAX_CUP_NAME) : "",
    tree: normalizeNode(r.tree),
    settings: normalizeSettings(r.settings),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

// ── 미완성 검사 ──
// 덜 만든 월드컵도 저장은 되지만, 미완성이면 활성화(사이트 공개)할 수 없다
export const optionName = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");

export function treeProblems(node: TreeNode, path = ""): string[] {
  const at = (s: string) => (path ? `${path} → ${s}` : s);
  if (node === null) return [path ? `${path} → 다음 질문이나 메뉴를 붙여 주세요` : "첫 질문이나 메뉴를 붙여 주세요"];
  if (node.kind === "menu") {
    const p: string[] = [];
    if (!node.name.trim()) p.push(at("메뉴 이름을 써 주세요"));
    if (node.url.trim() && !/^https?:\/\//i.test(node.url.trim())) p.push(at("지도 URL은 http로 시작해야 해요"));
    return p;
  }
  // 질문 문장(title)은 선택 항목이라 검사하지 않음
  return node.options.flatMap((opt, i) => {
    const name = opt.label.trim() || optionName(i);
    const p = opt.label.trim() ? [] : [at(`선택지 ${name} 이름을 써 주세요`)];
    return [...p, ...treeProblems(opt.node, path ? `${path} → ${name}` : name)];
  });
}
