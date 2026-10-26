export interface Env {
  DB: D1Database;
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
