import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Shared Claude client + one helper that returns validated JSON.
// Reads ANTHROPIC_API_KEY from the environment (Vercel, or frontend/.env.local).

export const MODEL = "claude-opus-5-5";

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export function aiEnabled() {
  return client !== null;
}

type Effort = "low" | "medium" | "high";

export async function askClaude<S extends z.ZodType>(opts: {
  system: string;
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: S;
  effort?: Effort;
  webSearch?: boolean;
}): Promise<z.infer<S>> {
  if (!client) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // If a request is declined by a safety classifier, re-run it on Anthropic's
    // recommended fallback model instead of failing.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    ...(opts.webSearch ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 5 }] } : {}),
  });

  if (res.stop_reason === "refusal") throw new Error(`Claude declined: ${res.stop_details?.category ?? "unknown"}`);
  if (res.parsed_output == null) throw new Error(`No structured output (stop_reason: ${res.stop_reason})`);
  return res.parsed_output as z.infer<S>;
}

// Try Claude; if there's no key or anything fails, use the simple fallback so
// the app never breaks mid-demo.
export async function withFallback<T>(name: string, real: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (!aiEnabled()) return fallback();
  try {
    return await real();
  } catch (err) {
    console.error(`[ai] ${name} failed, using fallback:`, err instanceof Error ? err.message : err);
    return fallback();
  }
}
