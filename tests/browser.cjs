const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const context=await browser.newContext({serviceWorkers:'allow'});
  await context.route('https://**/*',route=>route.abort());
  let page=await context.newPage(); const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});page.on('response',r=>{if(r.url().includes('/api/'))console.log('API',r.status(),r.url());});
  const base=process.env.TEST_BASE, id=process.env.TEST_ROUTE, token=process.env.TEST_TOKEN;
  await page.goto(`${base}/motorista.html?r=${id}#token=${token}`);
  await page.waitForSelector('.stop-card');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();await page.waitForSelector('.stop-card');
  assert.equal(await page.evaluate(()=>location.hash),'');
  assert.equal(await page.evaluate(()=>!!navigator.serviceWorker.controller),true);
  await context.setOffline(true);
  await page.locator('.btn-toggle-delivered').nth(0).click();
  await page.locator('.btn-toggle-delivered').nth(1).click();
  assert.equal(await page.evaluate(()=>driverApp.outbox.items.length),2);
  await page.close(); page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/motorista.html?r=${id}`);await page.waitForSelector('.stop-card');
  assert.equal(await page.evaluate(()=>driverApp.outbox.items.length),2);
  await context.setOffline(false);await page.evaluate(()=>driverApp.sync(true));
  await page.waitForFunction(()=>driverApp.outbox.items.length===0);
  assert.equal(await page.locator('.stop-card.is-delivered').count(),2);
  await context.setOffline(true);await page.locator('.btn-toggle-delivered').nth(0).click();
  assert.equal(await page.evaluate(()=>driverApp.outbox.items[0].status),'pending');
  await context.setOffline(false);await page.evaluate(()=>driverApp.sync(true));
  await page.waitForFunction(()=>driverApp.outbox.items.length===0);
  assert.equal(await page.locator('.stop-card.is-delivered').count(),1);
  // An independent device changes the same stop. The queued event must remain on 409.
  await context.setOffline(true);await page.locator('.btn-toggle-delivered').nth(0).click();
  const res=await fetch(base+'/api/update_route_status.php',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({route_id:id,stop_id:'synthetic-a',status:'delivered',operation_id:'second-device-operation',expected_version:2})});
  assert.equal(res.status,200);
  await context.setOffline(false);await page.evaluate(()=>driverApp.sync(true));
  assert.equal(await page.evaluate(()=>driverApp.outbox.items[0].state),'conflict');
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Atualizar sincronização'}).click();
  await page.waitForFunction(()=>driverApp.outbox.items.length===0);
  await context.setOffline(true);await page.locator('.btn-toggle-delivered').nth(1).click();
  const closed=await fetch(base+'/api/finish_route.php',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({route_id:id})});
  assert.equal(closed.status,200);
  await context.setOffline(false);await page.evaluate(()=>driverApp.sync(true));
  assert.equal(await page.evaluate(()=>driverApp.outbox.items[0].state),'conflict');
  await page.evaluate(()=>driverApp.finishCurrentRoute());
  assert.equal(await page.evaluate(()=>driverApp.outbox.items.length),1);
  // CacheStorage must hold static resources only.
  const keys=await page.evaluate(async()=>{const c=await caches.open('plaswill-driver-v2');return (await c.keys()).map(r=>r.url);});
  assert(keys.length>0);
  assert(keys.every(k=>!k.includes('/api/')&&!k.includes('token=')));
  assert.deepEqual(errors,[]);
  if (process.env.TEST_LEAFLET_DIR) {
    const fs=require('node:fs');
    const op=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
    await op.route('https://**/*',r=>r.abort());
    await op.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',r=>r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/javascript',body:fs.readFileSync(process.env.TEST_LEAFLET_DIR+'/leaflet.js')}));
    await op.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',r=>r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},contentType:'text/css',body:fs.readFileSync(process.env.TEST_LEAFLET_DIR+'/leaflet.css')}));
    const p=await op.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
    await p.addInitScript(()=>localStorage.setItem('plaswill_deliveries_v1',JSON.stringify([
      {id:'synthetic-desktop-a',lat:-28.2,lon:-53.5,status:'pending',destinatario:'Synthetic A',logradouro:'Synthetic street'},
      {id:'synthetic-desktop-b',lat:-28.2,lon:-53.5,status:'pending',destinatario:'Synthetic B',logradouro:'Synthetic street'}
    ])));
    await p.goto(base+'/');await p.waitForFunction(()=>window.planner?.map && window.planner.deliveries.length===2);
    await p.click('#nav-planning');
    assert.equal(await p.locator('.leaflet-container').count(),1);
    await p.evaluate(async()=>{
      const values={'form-destinatario':'Synthetic Manual','form-logradouro':'Synthetic Street','form-numero':'1','form-lat':'-28.25','form-lon':'-53.51'};
      for(const [id,value] of Object.entries(values))document.getElementById(id).value=value;
      await planner.submitManualDelivery({preventDefault(){}});
    });
    assert.equal(await p.evaluate(()=>planner.deliveries.length),3);
    await p.route('**/api/process_danfe.php',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,delivery:{id:'synthetic-danfe',lat:-28.24,lon:-53.52,status:'pending',destinatario:'Synthetic Invoice',logradouro:'Synthetic Street',geocoded_by:'nominatim_exact'}})}));
    await p.evaluate(()=>planner.handleDanfeUpload(new File([new Uint8Array([1,2,3])],'synthetic.png',{type:'image/png'})));
    await p.waitForFunction(()=>!!planner.pendingDanfeDelivery);
    await p.evaluate(()=>planner.confirmDanfeStop());
    assert.equal(await p.evaluate(()=>planner.deliveries.length),4);
    await p.evaluate(()=>planner.optimizeSequence());
    await p.evaluate(()=>planner.openExportModal());
    const share=await p.inputValue('#export-share-url-input');assert(share.includes('#token='));
    assert(await p.locator('a[href*="api.whatsapp.com"]').count()>0);
    assert(await p.locator('#export-qrcode-box canvas').count()>0);
    assert(await p.locator('a[href*="waze.com/ul"]').count()>0);
    await p.evaluate(()=>{window.print=()=>{window.printInvoked=true;};planner.printRomaneio();});
    assert.equal(await p.evaluate(()=>window.printInvoked),true);
    await p.evaluate(()=>planner.confirmFinishRotina());
    assert.equal(await p.evaluate(()=>planner.deliveries.length),0);
    await p.evaluate(()=>planner.openHistoryModal());
    assert((await p.locator('#rotinas-history-container').innerText()).includes('ROT-'));
    assert.deepEqual(errs,[]);await op.close();
    console.log('PASS browser desktop: real Leaflet with local verified assets, manual entry, mocked DANFE import, duplicate-address markers, optimization, dispatch link, navigation links, print and history');
  }
  await context.close(); console.log('PASS browser: driver loading, SW offline reopen, persistent queue, reconnect, undo, two-device conflict and explicit rebase; static-only cache');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
