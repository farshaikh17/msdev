/**
 * The outreach kit for a demo: a short email, a text message and a 30-second call script written
 * by Haiku from the business's details (fractions of a cent), plus a QR code for the site link.
 */
import { renderSVG } from "uqr";
import { ask, parseParts, PAGE_MODEL } from "./designer";
import type { Stored } from "./db";
import type { Env } from "./env";

export interface Outreach {
  subject: string;
  email: string;
  sms: string;
  call: string;
  at: string;
  costUsd: number;
}

const SYSTEM = `You write short, honest sales outreach for a web studio that has just built a preview website for a local business, before the business has paid anything. The reader is the busy owner of that business. Plain, warm, specific; no hype, no buzzwords, no emoji, no exclamation marks, no fake urgency, no invented facts. US English. Sign off with the sender's name and agency only.

Reply with these parts, each starting with a line "@@@ NAME":
@@@ SUBJECT
an email subject under 60 characters that names the business
@@@ EMAIL
the email body: 4 short lines at most (who you are, what you built, the link, one question), then the sign-off
@@@ SMS
a text message under 300 characters with the link and one question
@@@ CALL
a 30-second call script: an opener, what you built, one question, and a graceful exit if they're busy (under 110 words)`;

export async function writeOutreach(env: Env, demo: Stored, siteUrl: string, sender: { name: string; agency: string }): Promise<Outreach> {
  const i = demo.intake;
  const brief = [
    `Business: ${i.businessName}`,
    i.industry && `Trade: ${i.industry}`,
    i.city && `City: ${i.city}`,
    demo.content.industry && `Industry label: ${demo.content.industry}`,
    i.websiteUrl ? `They have a website: ${i.websiteUrl}` : "They have no website we could find (don't assume; say \"a new website\").",
    `Preview link: ${siteUrl}`,
    `Sender: ${sender.name} at ${sender.agency}`,
  ]
    .filter(Boolean)
    .join("\n");
  const { text, usage } = await ask(env, `Write the outreach for this preview.\n\n${brief}`, 1200, PAGE_MODEL, "low", SYSTEM);
  const p = parseParts(text);
  const u = usage as { cost_usd?: number };
  return {
    subject: (p.SUBJECT ?? `A new website for ${i.businessName}`).trim().slice(0, 120),
    email: (p.EMAIL ?? "").trim().slice(0, 2000),
    sms: (p.SMS ?? "").trim().slice(0, 400),
    call: (p.CALL ?? "").trim().slice(0, 1500),
    at: new Date().toISOString(),
    costUsd: Number(u.cost_usd) || 0,
  };
}

/** An inline SVG QR code for a link (no external service). */
export function qrSvg(url: string): string {
  return renderSVG(url, { pixelSize: 4, border: 2, blackColor: "#172033", whiteColor: "#ffffff" });
}
