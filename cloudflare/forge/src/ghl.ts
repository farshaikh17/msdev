/** GoHighLevel: the link to a demo on an account's GHL page, and the snippet that page runs. */

export function ghlLink(pageUrl: string, slug: string): string {
  if (!pageUrl) return "";
  try {
    const u = new URL(pageUrl);
    u.searchParams.set("d", slug);
    return u.toString();
  } catch {
    return "";
  }
}

/** The code pasted into GoHighLevel: shows the demo site full-screen for whatever ?d= names. */
export function ghlSnippet(sitesBase: string): string {
  return `<style>html,body{margin:0;height:100%;overflow:hidden}#forge-site{position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#fff}</style>
<iframe id="forge-site" title="Website" allow="clipboard-write"></iframe>
<script>
(function () {
  var d = new URLSearchParams(location.search).get("d");
  var f = document.getElementById("forge-site");
  if (!d || !/^[a-z0-9-]{3,64}$/.test(d)) { f.srcdoc = '<p style="font:16px system-ui;text-align:center;padding:80px 20px;color:#475569">Open this page from a Forge demo link (it ends in ?d=...).</p>'; return; }
  f.src = ${JSON.stringify(sitesBase)} + d;
})();
</script>`;
}

/** Where demo sites live: the forge-sites Worker, or the app itself at /s/ when SITES_ORIGIN is unset. */
export const sitesBase = (sitesOrigin: string | undefined, appOrigin: string) => (sitesOrigin ? `${sitesOrigin.replace(/\/+$/, "")}/` : `${appOrigin}/s/`);
