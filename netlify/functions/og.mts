// 지도 URL의 OG(제목/설명/이미지) 정보를 가져온다.
// 브라우저에서는 CORS 때문에 다른 사이트 HTML을 읽을 수 없어서 서버에서 대신 읽는다.

const MAX_HTML = 1_000_000;
const TIMEOUT_MS = 6000;

const json = (data: unknown, status = 200, cache = "public, max-age=86400") =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();

// <meta property="og:title" content="..."> (속성 순서 무관)
function meta(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i);
    const value = content?.[1] ?? content?.[2];
    if (value) return decode(value);
  }
  return null;
}

async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_HTML) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  const buf = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.length, size - offset)), offset);
    offset += c.length;
  }
  return new TextDecoder("utf-8").decode(buf);
}

export default async (req: Request) => {
  const target = new URL(req.url).searchParams.get("url") ?? "";
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return json({ error: "bad url" }, 400, "no-store");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return json({ error: "bad url" }, 400, "no-store");
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)",
        accept: "text/html",
      },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) {
      return json({ error: "no html" }, 200, "public, max-age=3600");
    }
    const html = await readLimited(res);

    const title = meta(html, "og:title") ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
    const description = meta(html, "og:description") ?? meta(html, "description");
    let image = meta(html, "og:image");
    if (image) {
      try {
        image = new URL(image, res.url).href;
      } catch {
        image = null;
      }
    }

    return json({ title: title || null, description, image, siteName: meta(html, "og:site_name") });
  } catch {
    return json({ error: "fetch failed" }, 200, "public, max-age=600");
  }
};

export const config = { path: "/api/og" };
