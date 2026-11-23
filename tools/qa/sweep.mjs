/*
 * Browser QA sweep (docs/testing.md). Read-only: it signs in and
 * opens pages but never saves anything, so it is safe against any environment
 * that has the demo data.
 *
 *  - Storefronts: crawled from the home page and the sitemap at 1440, 1024,
 *    768 and 360 px. Console errors, failed API calls, broken images, images
 *    without alt, sideways overflow, links that reach the 404 page, one <h1>,
 *    a title, tel:/mailto: formats, and accessibility (axe) at 1440 and 360.
 *  - Admin: every screen opened as every demo role. Each must open or show
 *    "Your role can't open this page" exactly as the role allows; the owner's
 *    run also checks 1440/768/390 px and accessibility.
 *
 * Environment (all optional):
 *   QA_ORIGIN        web app, default http://localhost:5173
 *   QA_API           API base, default {QA_ORIGIN}/api/v1 (the dev proxy)
 *   QA_STOREFRONTS   slugs crawled by host name, default northern-trails,silk-route-tours
 *   QA_PASSWORD      demo team password, default Password123
 *   QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD  super admin, default admin@example.com / Admin@123
 *   QA_BROWSER       installed browser channel: chrome | msedge (default chrome)
 *   QA_BROWSER_PATH  or an explicit browser executable
 *   QA_OUT           report folder, default ./report
 *
 * Exits 1 when anything was found. Results: {QA_OUT}/summary.md, findings.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const ORIGIN = (process.env.QA_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
const API = process.env.QA_API ?? `${ORIGIN}/api/v1`;
const SLUGS = (process.env.QA_STOREFRONTS ?? "northern-trails").split(",").map((s) => s.trim());
const PASSWORD = process.env.QA_PASSWORD ?? "Password123";
const OUT = process.env.QA_OUT ?? fileURLToPath(new URL("./report", import.meta.url));
const WIDTHS = [1440, 1024, 768, 360];
const AXE_WIDTHS = new Set([1440, 360]);
const PER_SITE_LIMIT = 45;
/** The session check allows 30 refreshes a minute; a full page load uses one. */
const RELOAD_SPACING_MS = 2100;
mkdirSync(OUT, { recursive: true });

const findings = [];
const add = (kind, where, detail, width) => findings.push({ kind, where, width, detail });
const stats = { pages: 0, loads: 0, axeRuns: 0, adminChecks: 0 };
const save = () => writeFileSync(`${OUT}/findings.json`, JSON.stringify({ stats, findings }, null, 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── API (read-only) ────────────────────────────────────────────────── */

/** Signs in, waiting out the login rate limit (it is meant to bite). */
async function login(email, password, post) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await post(`${API}/auth/login`, { email, password });
    if (res.status === 200) return res.body.data.accessToken;
    if (res.status !== 429) throw new Error(`login ${email}: ${res.status}`);
    console.log(`login rate-limited (${email}); waiting a minute`);
    await sleep(61_000);
  }
  throw new Error(`login ${email}: still rate-limited`);
}
const fetchPost = (url, data) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

const owner = await login(`owner@${SLUGS[0]}.example`, PASSWORD, fetchPost);
const get = (path, token = owner) =>
  fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
const organization = (await get("/admin/me/organizations")).data.find((r) => r.slug === SLUGS[0]);
if (!organization) throw new Error(`owner@${SLUGS[0]}.example has no access to ${SLUGS[0]}`);
const R = `/admin/organizations/${organization.id}`;
const first = async (path) => {
  const data = (await get(`${R}${path}`)).data;
  return (data?.items?.[0] ?? data?.[0])?.id;
};
const ids = {
  customer: await first("/customers?pageSize=1"),
};

/* ── Browser ────────────────────────────────────────────────────────── */

const browser = await chromium.launch({
  headless: true,
  ...(process.env.QA_BROWSER_PATH
    ? { executablePath: process.env.QA_BROWSER_PATH }
    : { channel: process.env.QA_BROWSER ?? "chrome" }),
});
const emptyBucket = () => ({ console: [], api: [], network: [], images: [] });

async function newPage(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await context.newPage();
  const state = { bucket: emptyBucket() };
  p.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      state.bucket.console.push(`[${m.type()}] ${m.text().slice(0, 220)}`);
    }
  });
  p.on("pageerror", (e) => state.bucket.console.push(`[pageerror] ${e.message.slice(0, 220)}`));
  p.on("response", (r) => {
    const url = r.url();
    if (r.status() >= 400 && url.includes("/api/")) {
      state.bucket.api.push(`${r.status()} ${r.request().method()} ${url.replace(/^https?:\/\/[^/]+/, "")}`);
    }
    if (r.status() >= 400 && r.request().resourceType() === "image") {
      state.bucket.images.push(`${r.status()} ${url}`);
    }
  });
  p.on("requestfailed", (r) => {
    const text = r.failure()?.errorText ?? "";
    if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(text)) state.bucket.network.push(`${text} ${r.url()}`);
  });
  return { context, p, state };
}

async function settle(p) {
  await p.waitForLoadState("networkidle").catch(() => {});
  // Scroll through so lazy images load, then back to the top.
  await p.evaluate(async () => {
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(250);
}

function inspect(p, width) {
  return p.evaluate((w) => {
    const images = [...document.images];
    const leaf = (el) => {
      const r = el.getBoundingClientRect();
      return r.right > w + 1 && r.width > 0 && ![...el.children].some((c) => c.getBoundingClientRect().right > w + 1);
    };
    const overflow = document.documentElement.scrollWidth > w + 1;
    return {
      title: document.title,
      h1: document.querySelectorAll("h1").length,
      brokenImages: images
        .filter((i) => i.getAttribute("src") && i.complete && i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.src),
      noAlt: images.filter((i) => !i.hasAttribute("alt")).map((i) => i.src),
      overflow,
      scrollWidth: document.documentElement.scrollWidth,
      wide: overflow
        ? [...document.querySelectorAll("body *")]
            .filter(leaf)
            .slice(0, 3)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} "${(el.textContent ?? "").trim().slice(0, 40)}"`)
        : [],
      links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
      is404: document.title.startsWith("Page not found"),
      noAccess: document.body.innerText.includes("Your role can't open this page"),
      adminNotFound: document.body.innerText.includes("This page doesn't exist"),
      sessionCheckFailed: document.body.innerText.includes("We couldn’t check your session"),
    };
  }, width);
}

async function runAxe(p) {
  // Evaluated through the DevTools protocol, not as an inline <script>: the
  // site's Content-Security-Policy (rightly) refuses inline scripts, and the
  // sweep must not weaken it to measure the page.
  if (!(await p.evaluate(() => "axe" in window))) await p.evaluate(AXE);
  stats.axeRuns += 1;
  return p.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const result = await axe.run(document, { resultTypes: ["violations"] });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      count: v.nodes.length,
    }));
  });
}

function report(where, width, bucket, facts, axe) {
  for (const line of bucket.console) add("console", where, line, width);
  for (const line of bucket.api) add("api", where, line, width);
  for (const line of bucket.network) add("network", where, line, width);
  for (const line of bucket.images) add("image-request", where, line, width);
  for (const src of facts.brokenImages) add("broken-image", where, src, width);
  for (const src of facts.noAlt) add("img-no-alt", where, src, width);
  if (facts.overflow) add("overflow", where, `scrollWidth ${facts.scrollWidth}: ${facts.wide.join(" | ")}`, width);
  if (facts.sessionCheckFailed) add("session", where, "session check failed screen", width);
  for (const v of axe ?? []) {
    add(`a11y-${v.impact}`, where, `${v.id} (${v.count}): ${v.help} → ${v.targets.join(" ; ")}`, width);
  }
}

/* ── Storefronts ────────────────────────────────────────────────────── */

const port = new URL(ORIGIN).port;
const SITES = [
  ...SLUGS.map((slug) => ({
    name: `${slug} (host)`,
    origin: `http://${slug}.localhost${port ? `:${port}` : ""}`,
    base: "",
  })),
  { name: `${SLUGS[0]} (path)`, origin: ORIGIN, base: `/s/${SLUGS[0]}` },
];
const SKIP = /^\/(admin|api|uploads)(\/|$)|\.(xml|txt|png|jpe?g|webp|svg)$/;
const external = new Set();

function checkHref(href, where) {
  if (!href) return null;
  if (href.startsWith("tel:")) {
    if (!/^tel:\+?\d{6,15}$/.test(href)) add("bad-link", where, href);
    return null;
  }
  if (href.startsWith("mailto:")) {
    if (!/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/.test(href)) add("bad-link", where, href);
    return null;
  }
  if (/^https?:\/\//.test(href)) {
    try {
      external.add(new URL(href).host);
    } catch {
      add("bad-link", where, href);
    }
    return null;
  }
  if (href.startsWith("javascript:")) add("bad-link", where, href);
  if (href.startsWith("#") || href.startsWith("javascript:")) return null;
  return href.split("#")[0];
}

async function crawl(site) {
  const queue = [`${site.base}/`];
  const { context, p, state } = await newPage(1440);
  if (!site.base) {
    // Fetched by the browser: Node can't resolve *.localhost.
    const sitemap = await p.goto(`${site.origin}/sitemap.xml`);
    if (!sitemap?.ok()) add("seo", site.name, `sitemap.xml ${sitemap?.status()}`);
    const xml = sitemap?.ok() ? await sitemap.text() : "";
    const robots = await p.goto(`${site.origin}/robots.txt`);
    if (!robots?.ok()) add("seo", site.name, `robots.txt ${robots?.status()}`);
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = new URL(loc);
      if (url.host !== new URL(site.origin).host) add("seo", site.name, `sitemap host ${url.host}`);
      queue.push(url.pathname);
    }
  }
  const seen = new Set();
  const linkedFrom = new Map();
  const groups = new Map();
  while (queue.length && seen.size < PER_SITE_LIMIT) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    // A few of each kind of page is enough.
    const group = path.split("/").slice(0, site.base ? 5 : 3).join("/");
    if ((groups.get(group) ?? 0) >= 4) continue;
    groups.set(group, (groups.get(group) ?? 0) + 1);
    seen.add(path);
    stats.pages += 1;
    const where = `${site.name} ${path}`;
    for (const width of WIDTHS) {
      state.bucket = emptyBucket();
      await p.setViewportSize({ width, height: 900 });
      await p.goto(`${site.origin}${path}`, { waitUntil: "domcontentloaded" });
      stats.loads += 1;
      await settle(p);
      const facts = await inspect(p, width);
      report(where, width, state.bucket, facts, AXE_WIDTHS.has(width) ? await runAxe(p) : []);
      if (width !== 1440) continue;
      if (facts.is404) {
        add("broken-link", where, `404 page; linked from ${[...(linkedFrom.get(path) ?? ["(start)"])].slice(0, 3).join(", ")}`);
      }
      if (!facts.title) add("seo", where, "empty <title>");
      if (facts.h1 !== 1 && !facts.is404) add("structure", where, `${facts.h1} <h1> elements`);
      for (const href of facts.links) {
        const local = checkHref(href, where);
        if (!local || SKIP.test(local)) continue;
        if (site.base && !local.startsWith(site.base)) {
          add("bad-link", where, `${local} leaves the path-mode site`);
          continue;
        }
        if (!linkedFrom.has(local)) linkedFrom.set(local, new Set());
        linkedFrom.get(local).add(path);
        if (!seen.has(local)) queue.push(local);
      }
    }
  }
  await context.close();
  console.log(`crawled ${site.name}: ${seen.size} pages`);
  save();
}

for (const site of SITES) await crawl(site);

{
  const { context, p, state } = await newPage(1440);
  for (const width of WIDTHS) {
    state.bucket = emptyBucket();
    await p.setViewportSize({ width, height: 900 });
    await p.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    await settle(p);
    report("platform directory /", width, state.bucket, await inspect(p, width), AXE_WIDTHS.has(width) ? await runAxe(p) : []);
  }
  await context.close();
}

/* ── Admin: every role, every screen ────────────────────────────────── */

const ROUTES = [
  ["dashboard", "dashboard.view"],
  ["customers", "customer.view"],
  [`customers/${ids.customer}`, "customer.view"],
  ["inbox", "inquiry.view"],
  ["website/home", "content.view"],
  ["website/banners", "content.view"],
  ["website/gallery", "content.view"],
  ["website/testimonials", "content.view"],
  ["website/faqs", "content.view"],
  ["website/pages/about", "content.view"],
  ["media", "media.view"],
  ["settings/profile", "organization.view"],
  ["settings/branding", "organization.view"],
  ["settings/website", "organization.view"],
  ["team", "team.view"],
  ["audit", "audit.view"],
].filter(([path]) => !path.includes("undefined"));

const domain = `${SLUGS[0]}.example`;
const ACCOUNTS = [
  [`owner@${domain}`, PASSWORD, true],
  [`admin@${domain}`, PASSWORD, false],
  [`manager@${domain}`, PASSWORD, false],
  [`member@${domain}`, PASSWORD, false],
  [process.env.QA_ADMIN_EMAIL ?? "admin@example.com", process.env.QA_ADMIN_PASSWORD ?? "Admin@123", false],
];

// The sign-in page itself, once, through the form.
{
  const { context, p, state } = await newPage(1440);
  await p.goto(`${ORIGIN}/admin/sign-in`, { waitUntil: "networkidle" });
  const facts = await inspect(p, 1440);
  const axe = await runAxe(p);
  await p.fill("input[type=email]", `owner@${domain}`);
  await p.fill("input[type=password]", PASSWORD);
  await p.click("button[type=submit]");
  const landed = await p.waitForURL(/\/admin\/\d+/, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!landed) add("auth", "admin sign-in", "the form did not sign the owner in");
  // Signed out, the session check answers 401 by design.
  state.bucket.api = state.bucket.api.filter((line) => !/^401 POST \/api\/v1\/auth\/refresh/.test(line));
  state.bucket.console = state.bucket.console.filter((line) => !/401 \(Unauthorized\)/.test(line));
  report("admin /admin/sign-in", 1440, state.bucket, facts, axe);
  await context.close();
}

let lastLoad = 0;
for (const [email, password, deep] of ACCOUNTS) {
  for (const width of deep ? [1440, 768, 390] : [1440]) {
    const { context, p, state } = await newPage(width);
    // One sign-in per browser: the refresh cookie lands in this context's jar.
    const post = (url, data) =>
      context.request.post(url, { data }).then(async (r) => ({ status: r.status(), body: await r.json() }));
    const token = await login(email, password, post);
    const access = await context.request
      .get(`${API}/admin/me/organizations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json());
    const isSuper = email === (process.env.QA_ADMIN_EMAIL ?? "admin@example.com");
    const permissions = new Set(access.data.find((r) => r.id === organization.id)?.permissions ?? []);
    const list = [
      ...ROUTES.map(([path, permission]) => [`${organization.id}/${path}`, permission]),
      ...(isSuper ? ["platform", "platform/organizations", "platform/users", "platform/audit"] : []).map((path) => [path, null]),
      ["account", null],
    ];
    for (const [path, permission] of list) {
      // Real page loads, spaced under the session-check rate limit.
      const wait = lastLoad + RELOAD_SPACING_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastLoad = Date.now();
      state.bucket = emptyBucket();
      await p.goto(`${ORIGIN}/admin/${path}`, { waitUntil: "domcontentloaded" });
      await settle(p);
      stats.adminChecks += 1;
      const where = `admin ${email.split("@")[0]} /admin/${path}`;
      const facts = await inspect(p, width);
      const allowed = permission === null || permissions.has(permission);
      if (allowed && facts.noAccess) add("access", where, `should open (${permission})`, width);
      if (!allowed && !facts.noAccess) add("access", where, `should be refused (${permission})`, width);
      if (facts.adminNotFound) add("broken-link", where, "admin 404 page", width);
      const axe = deep && width !== 768 ? await runAxe(p) : [];
      report(where, width, state.bucket, facts, axe);
    }
    await context.close();
  }
  console.log(`admin swept: ${email}`);
  save();
}

await browser.close();

/* ── Summary ────────────────────────────────────────────────────────── */

const byKind = {};
for (const f of findings) (byKind[f.kind] ??= []).push(f);
const lines = [
  `# QA sweep — ${new Date().toISOString()}`,
  "",
  `${stats.pages} storefront pages, ${stats.loads} loads, ${stats.axeRuns} accessibility runs, ${stats.adminChecks} admin checks.`,
  findings.length ? `**${findings.length} findings.**` : "**No findings.**",
];
for (const [kind, list] of Object.entries(byKind).sort()) {
  lines.push("", `## ${kind}: ${list.length}`);
  const grouped = new Map();
  for (const f of list) {
    if (!grouped.has(f.detail)) grouped.set(f.detail, []);
    grouped.get(f.detail).push(`${f.where}${f.width ? ` @${f.width}` : ""}`);
  }
  for (const [detail, where] of grouped) {
    lines.push(`- ${detail}`, `  - ${where.length}×: ${where.slice(0, 4).join(" | ")}`);
  }
}
lines.push("", `External hosts linked: ${[...external].join(", ") || "none"}`);
save();
writeFileSync(`${OUT}/summary.md`, `${lines.join("\n")}\n`);
console.log(lines.join("\n"));
process.exitCode = findings.length ? 1 : 0;
