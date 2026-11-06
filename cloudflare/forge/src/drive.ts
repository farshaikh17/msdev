/**
 * Hero videos from the design team's Google Drive folder. The folder is shared by link, so no
 * Google key is needed: its public listing gives the file IDs and each file downloads directly.
 * New clips are copied into Workers KV (the sites Worker plays them from there) and given a trade
 * from their file name; clips removed from the folder leave the library.
 */
import { deleteDriveVideo, driveVideoIds, getSetting, listSharedVideos, saveDriveVideo } from "./db";
import { classifyClip } from "./designer";
import type { Env } from "./env";

/** The team's folder (Settings can point at another). */
export const DEFAULT_FOLDER = "1vOIKvNmw2oj72lrHYu7QVKbbr88MQ82f";
export const FOLDER_KEY = "videoFolder";
/** KV values are capped at 25 MB; hero clips are 2–10 MB. */
const MAX_BYTES = 24 * 1024 * 1024;

export const videoKey = (driveId: string) => `v:${driveId}`;

/** A folder ID from a pasted folder link (or the ID itself). */
export function folderId(raw: string): string {
  const v = raw.trim();
  return v.match(/folders\/([A-Za-z0-9_-]{10,})/)?.[1] ?? (/^[A-Za-z0-9_-]{10,}$/.test(v) ? v : "");
}

/** The video files in a public folder: [{ id, name }] (names may be shortened with "…"). */
export async function listFolder(folder: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folder)}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Google Drive didn't list the folder (${res.status}). Is it shared as "Anyone with the link"?`);
  return parseFolder(await res.text());
}

/** The video files listed on a folder's public page. */
export function parseFolder(html: string): { id: string; name: string }[] {
  const files = new Map<string, string>();
  for (const m of html.matchAll(/href="https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})\/[^"]*"[\s\S]*?flip-entry-title">([^<]+)</g)) {
    const name = m[2].replace(/&amp;/g, "&").trim();
    if (/\.(mp4|mov|webm|m4v)$/i.test(name)) files.set(m[1], name);
  }
  return [...files].map(([id, name]) => ({ id, name }));
}

/** One file's bytes and full name. */
async function download(id: string): Promise<{ name: string; bytes: ArrayBuffer }> {
  const res = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`, { signal: AbortSignal.timeout(120000) });
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("video/")) throw new Error(`Download failed (${res.status} ${res.headers.get("content-type")})`);
  const size = Number(res.headers.get("content-length") ?? 0);
  if (size > MAX_BYTES) throw new Error(`Too big for the library (${Math.round(size / 1e6)} MB; the limit is 24 MB)`);
  const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? id;
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) throw new Error("Too big for the library");
  return { name, bytes };
}

/** Compare the folder with the library: queue new clips, drop removed ones. */
export async function syncFolder(env: Env): Promise<{ added: number; removed: number; total: number }> {
  const folder = folderId(await getSetting(env, FOLDER_KEY)) || DEFAULT_FOLDER;
  const [files, known] = await Promise.all([listFolder(folder), driveVideoIds(env)]);
  const inFolder = new Set(files.map((f) => f.id));
  const added = files.filter((f) => !known.includes(f.id));
  const removed = known.filter((id) => !inFolder.has(id));
  for (const f of added) await env.BUILDS.send({ stage: "video", driveId: f.id });
  for (const id of removed) {
    await deleteDriveVideo(env, id);
    await env.VIDEOS.delete(videoKey(id));
  }
  console.log("video sync", JSON.stringify({ folder, files: files.length, added: added.length, removed: removed.length }));
  return { added: added.length, removed: removed.length, total: files.length };
}

/** Queue job: copy one clip into KV and add it to the library with a trade from its name. */
export async function importClip(env: Env, driveId: string): Promise<void> {
  if ((await driveVideoIds(env)).includes(driveId)) return;
  const { name, bytes } = await download(driveId);
  await env.VIDEOS.put(videoKey(driveId), bytes);
  const trades = [...new Set((await listSharedVideos(env)).map((v) => v.name).filter((t) => t !== "Unsorted"))];
  const { trade, keywords } = await classifyClip(env, name, trades).catch(() => ({ trade: "Unsorted", keywords: [] as string[] }));
  const base = env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : "";
  await saveDriveVideo(env, { driveId, fileName: name, name: trade, keywords, url: `${base}/_v/${driveId}.mp4` });
  console.log("video imported", JSON.stringify({ driveId, name, trade, mb: +(bytes.byteLength / 1e6).toFixed(1) }));
}

/**
 * Serve a clip from KV (forge-sites). Supports Range requests: Safari won't play a video
 * without them, and browsers fetch large clips in pieces.
 */
export async function serveVideo(req: Request, env: Env, driveId: string): Promise<Response> {
  const data = await env.VIDEOS.get(videoKey(driveId), "arrayBuffer");
  if (!data) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = { "content-type": "video/mp4", "accept-ranges": "bytes", "cache-control": "public, max-age=86400" };
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (!range || (!range[1] && !range[2])) return new Response(req.method === "HEAD" ? null : data, { headers: { ...headers, "content-length": String(data.byteLength) } });
  const size = data.byteLength;
  let start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  let end = range[1] && range[2] ? Number(range[2]) : size - 1;
  end = Math.min(end, size - 1);
  start = Math.min(start, end);
  if (start >= size) return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } });
  const part = data.slice(start, end + 1);
  return new Response(req.method === "HEAD" ? null : part, {
    status: 206,
    headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(part.byteLength) },
  });
}
