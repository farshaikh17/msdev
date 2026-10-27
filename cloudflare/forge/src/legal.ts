/**
 * Privacy Policy and Terms and Conditions pages. These are our own draft wording,
 * filled in with the business's details (not written by Claude), and marked as
 * needing the business's review before launch, as the design SOP requires.
 */
import { esc } from "../../../src/forge/render";
import type { Intake } from "../../../src/forge/schema";
import type { PageDraft } from "./designer";

const tel = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : d;
};

function legal(i: Intake, title: string, sections: [string, string][]): PageDraft {
  const name = esc(i.businessName);
  const contact = i.phone ? `call us at <a href="tel:${esc(tel(i.phone))}">${esc(i.phone)}</a> or use our <a href="/contact">contact form</a>` : `use our <a href="/contact">contact form</a>`;
  const body = `<main class="legal-page"><article class="legal">
<p class="legal-eyebrow">Legal</p>
<h1>${esc(title)}</h1>
<p class="legal-note"><strong>Draft for review.</strong> This is standard wording prepared for ${name}'s website. ${name} should review and approve it (and add its business address and email) before the site goes live.</p>
${sections.map(([h, t]) => `<h2>${esc(h)}</h2>\n${t.replace(/\{name\}/g, name).replace(/\{contact\}/g, contact)}`).join("\n")}
</article></main>`;
  return { title: `${title} | ${i.businessName}`, description: `${title} for ${i.businessName}.`, css: "", body };
}

export function privacyPage(i: Intake): PageDraft {
  return legal(i, "Privacy Policy", [
    ["Who we are", "<p>This website is operated by {name} (\"we\", \"us\"). This policy explains what personal information we collect through this website, how we use it, and the choices you have.</p>"],
    [
      "What we collect",
      "<ul><li>Details you send us through our forms or chat, such as your name, phone number, email address, address or town, and a description of the work you need.</li><li>Basic technical information your browser sends when you visit, such as your device type and the pages you view.</li></ul>",
    ],
    [
      "How we use it",
      "<ul><li>To reply to your enquiry, prepare quotes and schedule work.</li><li>To keep records of the services we provide.</li><li>To improve our website and services.</li></ul><p>We don't sell your personal information.</p>",
    ],
    [
      "Who we share it with",
      "<p>We share your information only with service providers who help us run our business (for example, our website, chat and customer-management tools), and only as needed to provide our services, or when the law requires it.</p>",
    ],
    ["Chat and messaging", "<p>If you use the chat on this site, your messages and contact details are handled by our messaging provider so we can reply to you. If you give us your phone number, we may contact you by phone or text about your enquiry. You can ask us to stop at any time.</p>"],
    ["How long we keep it", "<p>We keep your information only as long as we need it for the purposes above, or as required by law.</p>"],
    ["Your choices", "<p>You can ask to see, correct or delete the personal information we hold about you. To make a request, {contact}.</p>"],
    ["Changes to this policy", "<p>We may update this policy from time to time. The latest version will always be on this page.</p>"],
    ["Contact us", "<p>Questions about this policy? Please {contact}.</p>"],
  ]);
}

export function termsPage(i: Intake): PageDraft {
  return legal(i, "Terms and Conditions", [
    ["About these terms", "<p>These terms apply to your use of this website, operated by {name}. By using the site, you agree to them.</p>"],
    [
      "Information on this website",
      "<p>We work to keep the information on this site accurate and up to date, but it is for general information only. Descriptions of services are not an offer. Any quote, price or schedule is confirmed only in writing for your specific job.</p>",
    ],
    [
      "Quotes and services",
      "<p>Requesting a quote doesn't commit you to anything. The scope, price and timing of any work are agreed with you before it starts, and separate written terms may apply to that work.</p>",
    ],
    ["Using this website", "<p>Please don't misuse the site, for example by trying to access it without permission, sending harmful code, or submitting false information through our forms.</p>"],
    ["Content and trademarks", "<p>The text, images and design of this website belong to {name} or are used with permission. Please don't copy them without our consent.</p>"],
    ["Links to other websites", "<p>Links to other websites are provided for convenience. We aren't responsible for their content or their privacy practices.</p>"],
    ["Limitation of liability", "<p>To the extent the law allows, we aren't liable for any loss arising from use of this website or reliance on its content.</p>"],
    ["Changes", "<p>We may update these terms from time to time. The latest version will always be on this page.</p>"],
    ["Contact us", "<p>Questions about these terms? Please {contact}.</p>"],
  ]);
}
