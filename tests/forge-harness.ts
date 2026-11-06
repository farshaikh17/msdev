/**
 * Shared by the Forge integration tests: the app's real routes against a database built from the
 * real migrations (in-memory SQLite standing in for D1), with recorded queue sends and no network.
 */
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { expect } from "vitest";
import worker from "../cloudflare/forge/src/index";
import type { Env } from "../cloudflare/forge/src/env";
import { getUserByEmail } from "../cloudflare/forge/src/tenants";

export const TEAM_PASSWORD = "the-old-team-password";
export const ADMIN = { email: "boss@mianro.test", password: "admin-password-1" };

export interface Harness {
  env: Env;
  db: DatabaseSync;
  queued: { body: unknown; opts?: unknown }[];
}

export function makeHarness(): Harness {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync("cloudflare/forge/migrations").sort()) db.exec(readFileSync(`cloudflare/forge/migrations/${f}`, "utf8"));
  const queued: Harness["queued"] = [];
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const st = {
        bind: (...a: unknown[]) => ((args = a), st),
        first: async () => (db.prepare(sql).get(...(args as never[])) as never) ?? null,
        all: async () => ({ results: db.prepare(sql).all(...(args as never[])) as never[] }),
        run: async () => {
          const r = db.prepare(sql).run(...(args as never[]));
          return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
        },
      };
      return st;
    },
  };
  const env = {
    DB,
    BUILDS: { send: async (body: unknown, opts?: unknown) => void queued.push({ body, opts }) },
    VIDEOS: { get: async () => null, put: async () => undefined, delete: async () => undefined },
    FORGE_PASSWORD: TEAM_PASSWORD,
    ANTHROPIC_API_KEY: "test-key",
    SITES_ORIGIN: "https://sites.test",
  } as unknown as Env;
  return { env, db, queued };
}

export const ctx = { waitUntil: () => undefined };

export interface CallOpts {
  method?: string;
  form?: Record<string, string>;
  json?: unknown;
  cookie?: string;
  bearer?: string;
  ip?: string;
}

export async function call(h: Harness, path: string, o: CallOpts = {}): Promise<Response> {
  const headers: Record<string, string> = { "cf-connecting-ip": o.ip ?? "203.0.113.5" };
  let body: string | undefined;
  if (o.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(o.form).toString();
  } else if (o.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(o.json);
  }
  if (o.cookie) headers.cookie = o.cookie;
  if (o.bearer) headers.authorization = `Bearer ${o.bearer}`;
  const method = o.method ?? (body !== undefined ? "POST" : "GET");
  return worker.fetch(new Request(`https://app.test${path}`, { method, headers, body }), h.env, ctx);
}

export const cookieOf = (r: Response) => (r.headers.get("set-cookie") ?? "").split(";")[0];
/** Where a redirect goes, with its message readable (spaces decoded). */
export const loc = (r: Response) => decodeURIComponent(r.headers.get("location") ?? "");
export const html = async (r: Response) => await r.text();

/** Set up the first admin and return their cookie. */
export async function setupAdmin(h: Harness): Promise<string> {
  const r = await call(h, "/setup", { form: { team: TEAM_PASSWORD, email: ADMIN.email, password: ADMIN.password, confirm: ADMIN.password } });
  expect(r.status).toBe(303);
  return cookieOf(r);
}

/** Admin makes an account; returns its id, the owner's cookie and the owner's email. */
export async function makeAccount(h: Harness, admin: string, name: string, email: string, credits = 2): Promise<{ id: number; cookie: string }> {
  const r = await call(h, "/admin/tenants", { cookie: admin, form: { name, email, credits: String(credits) } });
  const page = await html(r);
  const token = page.match(/\/invite\/([A-Za-z0-9_-]{20,80})/)?.[1];
  expect(token, "an invite link is shown").toBeTruthy();
  const accept = await call(h, `/invite/${token}`, { form: { password: "owner-password-1", confirm: "owner-password-1" } });
  expect(accept.status).toBe(303);
  const u = await getUserByEmail(h.env, email);
  return { id: u!.tenantId, cookie: cookieOf(accept) };
}

export const build = (h: Harness, cookie: string, name: string) => call(h, "/demos", { cookie, form: { businessName: name, city: "Orlando, FL" } });
export const slugOf = (r: Response) => loc(r).match(/\/demos\/([a-z0-9-]+)/)?.[1] ?? "";

