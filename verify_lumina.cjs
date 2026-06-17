const { chromium } = require('playwright');
const fs = require('fs');

const SHOTS = 'C:/Users/diego/AppData/Local/Temp/lumina_verify';
fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  // Step 1: Login page
  await page.goto('http://localhost:3001/auth/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SHOTS}/01_login.png` });
  const bodyBg1 = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  console.log('LOGIN PAGE body bg:', bodyBg1);

  // Step 2: Login
  await page.fill('input[type="email"]', 'alex@finanzasdev.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('URL after login:', page.url());
  await page.screenshot({ path: `${SHOTS}/02_dashboard.png`, fullPage: false });

  // Step 3: Style audit
  const styles = await page.evaluate(() => {
    const r = {};
    r.bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const header = document.querySelector('header');
    r.headerPos = header ? window.getComputedStyle(header).position : 'NO HEADER';
    r.headerBg = header ? window.getComputedStyle(header).backgroundColor : '-';
    const nav = document.querySelector('nav');
    r.navPos = nav ? window.getComputedStyle(nav).position : 'NO NAV';
    const glass = document.querySelector('.glass-card');
    r.hasGlassCard = !!glass;
    r.glassBg = glass ? window.getComputedStyle(glass).backgroundColor : 'none';
    r.glassBackdrop = glass ? window.getComputedStyle(glass).backdropFilter : 'none';
    // CSS custom props from @theme
    r.cssVarPrimary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    r.cssVarSecondary = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim();
    r.cssVarSurface = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
    // Check h1 text color
    const h1 = document.querySelector('h1');
    r.h1Color = h1 ? window.getComputedStyle(h1).color : 'none';
    return r;
  });
  console.log('STYLE AUDIT:', JSON.stringify(styles, null, 2));
  
  // Full page screenshot
  await page.screenshot({ path: `${SHOTS}/03_dashboard_full.png`, fullPage: true });

  // Step 4: Navigate to Gastos
  const gastosLink = await page.$('a[href="/gastos"]');
  if (gastosLink) {
    await gastosLink.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/04_gastos.png`, fullPage: false });
    console.log('Gastos page loaded');
  }

  // Step 5: Navigate to Deudas
  const deudasLink = await page.$('a[href="/deudas"]');
  if (deudasLink) {
    await deudasLink.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/05_deudas.png`, fullPage: false });
    console.log('Deudas page loaded');
  }

  await browser.close();
  console.log('DONE. Screenshots in:', SHOTS);
})();
