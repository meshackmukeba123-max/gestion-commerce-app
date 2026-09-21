import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "guide");
const BASE_URL = process.env.GUIDE_BASE_URL || "https://gestion-commerce-app.vercel.app";
const EMAIL = process.env.GUIDE_EMAIL || "admin@demo.com";
const PASSWORD = process.env.GUIDE_PASSWORD || "demo1234";

const PAGES = [
  { path: "/dashboard", file: "dashboard.png", fullPage: true },
  { path: "/ventes", file: "vente.png", clipHeight: 520 },
  { path: "/stock", file: "stock.png", clipHeight: 460 },
  { path: "/utilisateurs", file: "utilisateurs.png", clipHeight: 420 },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("vous@boutique.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.waitForTimeout(1000);

  for (const p of PAGES) {
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const dest = path.join(OUT_DIR, p.file);
    if (p.fullPage) {
      await page.screenshot({ path: dest, fullPage: true });
    } else {
      await page.screenshot({ path: dest, clip: { x: 0, y: 0, width: 1440, height: p.clipHeight } });
    }
    console.log("saved", dest);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
