const { chromium } = require('playwright');
const fs = require('fs');

const SHOTS = 'C:/Users/diego/AppData/Local/Temp/lumina_forms';
fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  // Login
  await page.goto('http://localhost:3001/auth/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SHOTS}/01_login.png` });

  await page.fill('input[type="email"]', 'alex@finanzasdev.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Open ingresos modal
  await page.goto('http://localhost:3001/ingresos');
  await page.waitForTimeout(1500);
  await page.click('button:has-text("Agregar")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/02_ingresos_modal.png`, fullPage: false });

  // Open gastos modal
  await page.goto('http://localhost:3001/gastos');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/03_gastos_list.png`, fullPage: false });
  await page.click('button:has-text("Agregar")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/04_gastos_modal.png`, fullPage: false });

  // Presupuestos
  await page.goto('http://localhost:3001/presupuestos');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/05_presupuestos.png`, fullPage: false });

  await browser.close();
  console.log('Done ->', SHOTS);
})();
