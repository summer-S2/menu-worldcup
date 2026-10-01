import { getStore } from "@netlify/blobs";
import { newId, normalizeCup, normalizeNode, normalizeSettings, type CupsData } from "../../src/types.ts";

// 저장 형식: "cups" 키에 { activeId, cups: Cup[] }
// 예전 형식("tree" + "settings" 키)만 있으면 "기본" 월드컵 하나로 옮긴다

export const getCupsStore = () => getStore("menu-worldcup");

export async function loadCups(): Promise<CupsData> {
  const store = getCupsStore();
  const raw = (await store.get("cups", { type: "json" })) as { activeId?: unknown; cups?: unknown } | null;

  if (raw && Array.isArray(raw.cups)) {
    const cups = raw.cups.map(normalizeCup).filter((c) => c !== null);
    const activeId = typeof raw.activeId === "string" && cups.some((c) => c.id === raw.activeId) ? raw.activeId : null;
    return { activeId, cups };
  }

  // 예전 데이터 이전 (한 번만)
  const tree = normalizeNode(await store.get("tree", { type: "json" }));
  const settings = normalizeSettings(await store.get("settings", { type: "json" }));
  const first = { id: newId(), name: "기본", tree, settings, updatedAt: Date.now() };
  const data: CupsData = { activeId: first.id, cups: [first] };
  await saveCups(data);
  return data;
}

export async function saveCups(data: CupsData): Promise<void> {
  await getCupsStore().setJSON("cups", data);
}
