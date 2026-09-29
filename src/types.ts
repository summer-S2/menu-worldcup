// 메뉴 트리
// 질문: 두 선택지 중 하나를 고르면 다음 노드로 이동
// 메뉴: 최종 결과
// null: 아직 비어 있는 칸
export type Option = { label: string; node: TreeNode };
export type QuestionNode = { kind: "q"; left: Option; right: Option };
export type MenuNode = { kind: "menu"; name: string; url: string };
export type TreeNode = QuestionNode | MenuNode | null;

export function isValidNode(node: unknown, depth = 0): node is TreeNode {
  if (depth > 50) return false;
  if (node === null) return true;
  if (typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  if (n.kind === "menu") {
    return typeof n.name === "string" && typeof n.url === "string";
  }
  if (n.kind === "q") {
    return [n.left, n.right].every((opt) => {
      if (!opt || typeof opt !== "object") return false;
      const o = opt as Record<string, unknown>;
      return typeof o.label === "string" && isValidNode(o.node, depth + 1);
    });
  }
  return false;
}
