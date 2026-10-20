import logger from "../utils/winston";

/**
 * Finds a product photo on the web for a tyre model.
 *
 * Provider: Google Programmable Search (Custom Search JSON API), image mode.
 *   GOOGLE_CSE_API_KEY  – API key from https://console.cloud.google.com/apis/credentials
 *   GOOGLE_CSE_CX       – Search engine ID from https://programmablesearchengine.google.com
 *                         (enable "Image search" and "Search the entire web" on the engine)
 * Free tier: 100 queries/day.
 */

export type ImageCandidate = {
  url: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  source: string;
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 300;

export const isSearchConfigured = () =>
  Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX);

type GoogleItem = {
  link: string;
  mime?: string;
  displayLink?: string;
  image?: { width?: number; height?: number; byteSize?: number };
};

/**
 * Query Google image search and return candidates that look like a usable
 * product photo (right mime, big enough, not too heavy).
 */
export async function searchImages(
  query: string,
  opts: { licensedOnly?: boolean; count?: number } = {},
): Promise<ImageCandidate[]> {
  if (!isSearchConfigured()) {
    throw new Error("GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX are not set");
  }

  const params = new URLSearchParams({
    key: process.env.GOOGLE_CSE_API_KEY as string,
    cx: process.env.GOOGLE_CSE_CX as string,
    q: query,
    searchType: "image",
    num: String(Math.min(opts.count ?? 10, 10)),
    imgType: "photo",
    imgSize: "large",
    safe: "active",
    fileType: "jpg,png,webp",
  });
  if (opts.licensedOnly) {
    params.set("rights", "cc_publicdomain,cc_attribute,cc_sharealike");
  }

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { items?: GoogleItem[] };
  const items = json.items ?? [];

  return items
    .map<ImageCandidate>((it) => ({
      url: it.link,
      mime: it.mime ?? "",
      width: it.image?.width ?? 0,
      height: it.image?.height ?? 0,
      bytes: it.image?.byteSize ?? 0,
      source: it.displayLink ?? "",
    }))
    .filter(
      (c) =>
        /^https:\/\//.test(c.url) &&
        (c.mime === "" || ALLOWED_MIME.has(c.mime)) &&
        c.width >= MIN_SIDE &&
        c.height >= MIN_SIDE &&
        (c.bytes === 0 || c.bytes <= MAX_BYTES),
    );
}

/**
 * Download an image URL into a Buffer, verifying it really is an image of an
 * acceptable type and size. Returns null when the URL is unusable.
 */
export async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Many CDNs refuse requests without a browser-like UA
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      logger.warn(`download ${url} -> HTTP ${res.status}`);
      return null;
    }

    const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_MIME.has(mime)) {
      logger.warn(`download ${url} -> unsupported content-type ${mime || "(none)"}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5_000 || buffer.length > MAX_BYTES) {
      logger.warn(`download ${url} -> bad size ${buffer.length} bytes`);
      return null;
    }

    return { buffer, mime };
  } catch (error) {
    logger.warn(`download ${url} -> ${(error as Error).message}`);
    return null;
  }
}
