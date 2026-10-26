export interface Env {
  DB: D1Database;
  /** Background page builds (Cloudflare Queue). */
  BUILDS: Queue<BuildJob>;
  /** The team password for signing in. */
  FORGE_PASSWORD?: string;
  /** Anthropic API key; without it, sites are drafted from the trade template. */
  ANTHROPIC_API_KEY?: string;
  /** Overrides the model (default claude-opus-5-5). */
  CLAUDE_MODEL?: string;
}

// Minimal D1 types (avoids pulling in @cloudflare/workers-types).
export interface D1Result<T> { results: T[] }
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
export interface D1Database { prepare(sql: string): D1PreparedStatement }
export interface Ctx { waitUntil(p: Promise<unknown>): void }

export interface BuildJob { slug: string }
export interface Queue<T> { send(body: T): Promise<void> }
export interface Message<T> { body: T; ack(): void; retry(): void }
export interface MessageBatch<T> { messages: Message<T>[] }

// Workers' streaming HTML parser (global in the runtime).
interface HTMLText { text: string; lastInTextNode: boolean }
interface HTMLElement { getAttribute(name: string): string | null; onEndTag(fn: () => void): void }
interface HTMLHandlers { element?(e: HTMLElement): void; text?(t: HTMLText): void }
declare global {
  class HTMLRewriter {
    on(selector: string, handlers: HTMLHandlers): HTMLRewriter;
    transform(res: Response): Response;
  }
}
