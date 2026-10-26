const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
  // Trust only the generated fixture public key, never disable certificate checks globally.
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--ignore-certificate-errors-spki-list='+process.env.TEST_CERT_SPKI]});
  try {
    const app=process.env.TEST_APP, ged=process.env.TEST_GED;
    const context=await browser.newContext();
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if ([app,ged].includes(url.origin)) return route.continue();
      const file=url.href==='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'?'js':url.href==='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'?'css':null;
      if(file && process.env.TEST_LEAFLET_DIR) return route.fulfill({contentType:file==='js'?'application/javascript':'text/css',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(process.env.TEST_LEAFLET_DIR+'/leaflet.'+file)});
      return route.abort();
    });
    const page=await context.newPage();
    await page.goto(app+'/');
    await page.locator('#corporate-login').waitFor({state:'visible'});
    await page.locator('#corporate-login').click();
    await page.locator('#corporate-logout').waitFor({state:'visible'});
    assert.equal(new URL(page.url()).origin,app);
    assert.equal(new URL(page.url()).search,'');
    const cookie=(await context.cookies(app)).find(c=>c.name==='__Host-plaswill_session');
    assert(cookie.secure && cookie.httpOnly && cookie.sameSite==='Lax');
    const result=await page.evaluate(async()=>{
      const response=await window.entregasFetch('api/save_route.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:[{id:'synthetic-browser-oauth',status:'pending',lat:-28.2,lon:-53.5}]})});
      return response.status;
    });
    assert.equal(result,process.env.TEST_READ_ONLY==='1'?403:200);
    if(process.env.TEST_READ_ONLY==='1') assert((await page.locator('#corporate-session-status').innerText()).includes('somente leitura'));
    await page.locator('#corporate-logout').click();
    await page.locator('#corporate-login').waitFor({state:'visible'});
    const resultAfterLogout=await page.evaluate(async()=> (await window.entregasFetch('api/get_history.php')).status);
    assert.equal(resultAfterLogout,401);
    await context.close();
    console.log('PASS HTTPS OAuth browser: GED redirect, native session cookie, CSRF-aware fetch, role permission and logout');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
