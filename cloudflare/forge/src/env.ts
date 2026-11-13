export interface Env {
  DB: D1Database;
  /** Background page builds (Cloudflare Queue). */
  BUILDS: Queue<BuildJob | VideoJob>;
  /** Hero video files synced from Google Drive (key "v:<drive file id>"). */
  VIDEOS: KVNamespace;
  /** The team password for signing in. */
  FORGE_PASSWORD?: string;
  /** Anthropic API key; without it, sites are drafted from the trade template. */
  ANTHROPIC_API_KEY?: string;
  /** Overrides the design model (default claude-opus-5-5). */
  CLAUDE_MODEL?: string;
  /** "off" turns off the art director's pass on Studio sites (on by default). */
  FORGE_ART_PASS?: string;
  /** Overrides the model for the inner pages (default claude-haiku-5-5; the design kit and home page use CLAUDE_MODEL). */
  CLAUDE_PAGE_MODEL?: string;
  /** Overrides the design model's effort: low (default), medium or high. Higher costs more. */
  CLAUDE_EFFORT?: string;
  /** Workers AI: generates preview photos (absent on forge-sites, which only serves them). */
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  /**
   * "sites": this Worker only serves demo websites, at /<slug>/<page> (the forge-sites Worker).
   * Its own origin keeps AI-written pages away from the team app, so they can run unsandboxed
   * (the chat widget needs storage).
   */
  ROLE?: string;
  /** Where the forge-sites Worker lives, e.g. https://forge-sites.example.workers.dev. Unset: sites are served here at /s/<slug>. */
  SITES_ORIGIN?: string;
  /** Cloudflare Images and Media Transformations (Studio cut-outs and turning frames; see media.ts). Absent: Studio heroes use stills. */
  IMAGES?: unknown;
  MEDIA?: unknown;
  /** Cloudflare Browser Run (screenshots for the automatic review). Absent: sites go live without a review. */
  BROWSER?: unknown;
}

// Minimal D1 types (avoids pulling in @cloudflare/workers-types).
export interface D1Result<T> { results: T[] }
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}
export interface D1Database { prepare(sql: string): D1PreparedStatement }
export interface Ctx { waitUntil(p: Promise<unknown>): void }
export interface KVNamespace {
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  put(key: string, value: ArrayBuffer | Uint8Array | string): Promise<void>;
  delete(key: string): Promise<void>;
}

/** "kit": design the site (CSS, header, footer, script), then queue one "page" job per page. */
export type BuildJob =
  | { slug: string; version: string; stage: "kit" }
  | { slug: string; version: string; stage: "page"; path: string }
  /** Studio: the first screen alone, looked at in a browser before the rest of the home page is written. */
  | { slug: string; version: string; stage: "hero" }
  /** After go-live: screenshot, check and critique the site, and fix the home page if needed. */
  | { slug: string; version: string; stage: "review" }
  /** Add illustrative before/after photos to a live site (the gallery and home page are rewritten around them). */
  | { slug: string; version: string; stage: "pairs" }
  /** A change request on one page of the live site. */
  | { slug: string; version: string; stage: "change"; path: string; instruction: string };
/** Copy one clip from the team's Google Drive folder into the video library. */
export interface VideoJob { stage: "video"; driveId: string }
export interface Queue<T> { send(body: T, opts?: { delaySeconds?: number }): Promise<void> }
export interface Message<T> { body: T; attempts: number; ack(): void; retry(opts?: { delaySeconds?: number }): void }
export interface MessageBatch<T> { messages: Message<T>[] }

// Workers' streaming HTML parser (global in the runtime).
interface HTMLText { text: string; lastInTextNode: boolean }
export interface HTMLElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  setInnerContent(content: string, opts?: { html: boolean }): void;
  append(content: string, opts?: { html: boolean }): void;
  after(content: string, opts?: { html: boolean }): void;
  prepend(content: string, opts?: { html: boolean }): void;
  onEndTag(fn: () => void): void;
}
interface HTMLHandlers { element?(e: HTMLElement): void; text?(t: HTMLText): void }
declare global {
  class HTMLRewriter {
    on(selector: string, handlers: HTMLHandlers): HTMLRewriter;
    transform(res: Response): Response;
  }
}
