const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const base=process.env.TEST_BASE;
  const context=await browser.newContext();await context.route('https://**/*',r=>r.abort());
  const created=await context.request.post(base+'/api/save_route.php',{headers:{'X-Test-Identity':'operator',Origin:base},data:{stops:[
   {id:'pwa-a',destinatario:'Synthetic A',lat:-28.2,lon:-53.5,status:'pending'},
   {id:'pwa-b',destinatario:'Synthetic B',lat:-28.3,lon:-53.4,status:'pending'}]}});
  assert.equal(created.status(),200);const route=await created.json();
  const first=await context.newPage();first.on('dialog',d=>d.accept());
  await first.goto(base+'/'+route.share_url);await first.waitForSelector('.stop-card');await first.evaluate(()=>navigator.serviceWorker.ready);
  const second=await context.newPage();second.on('dialog',d=>d.accept());
  await second.goto(base+'/motorista.html?r='+route.route_id);await second.waitForSelector('.stop-card');
  assert(await second.locator('.btn-toggle-delivered').first().isDisabled());
  await context.setOffline(true);
  await first.evaluate(()=>driverApp.toggleDeliveryStatus('pwa-a',1));
  await second.evaluate(()=>driverApp.toggleDeliveryStatus('pwa-b',2));
  const durable=await first.evaluate(()=>JSON.parse(localStorage.getItem(driverApp.outbox.key)));
  assert.deepEqual(durable.map(e=>e.stop_id),['pwa-a'],'The second tab must not overwrite the first tab pending operation');
  assert.match(await second.locator('#sync-status').innerText(),/outra aba|somente leitura/i);
  await first.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  await second.evaluate(()=>driverApp.sync(true));
  await first.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  assert.equal(await first.evaluate(()=>driverApp.outboxWritable),false,'A restored page cannot regain ownership while the other tab owns it');
  await first.close();
  await second.evaluate(()=>driverApp.toggleDeliveryStatus('pwa-b',2));
  assert.deepEqual(await second.evaluate(()=>JSON.parse(localStorage.getItem(driverApp.outbox.key)).map(e=>e.stop_id)),['pwa-a','pwa-b']);
  await context.setOffline(false);await second.evaluate(()=>driverApp.sync(true));await second.waitForFunction(()=>driverApp.outbox.items.length===0);
  const revoked=await context.request.post(base+'/api/revoke_route.php',{headers:{'X-Test-Identity':'operator',Origin:base},data:{route_id:route.route_id}});
  assert.equal(revoked.status(),200);await second.evaluate(()=>driverApp.loadRoute(true));
  assert.equal(await second.locator('.stop-card').count(),0,'A known revoked route must not leave operational cards visible');
  assert.match(await second.locator('#error-message-text').innerText(),/revogado|expirado/);
  assert.equal(await second.evaluate(()=>driverApp.outbox.items.length),0);
  await context.setOffline(true);await second.reload();
  await second.waitForFunction(()=>document.getElementById('driver-error').style.display==='block');
  assert.equal(await second.locator('.stop-card').count(),0,'A known revocation must remain effective when reopened offline');
  await context.close();
  const unsupported=await browser.newContext();
  await unsupported.route('https://**/*',r=>r.abort());
  await unsupported.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));
  const readonly=await unsupported.newPage();readonly.on('dialog',d=>d.accept());
  // Use a fresh route so the read-only message is not masked by revocation.
  const next=await unsupported.request.post(base+'/api/save_route.php',{headers:{'X-Test-Identity':'operator',Origin:base},data:{stops:[{id:'pwa-readonly',lat:-28.2,lon:-53.5,status:'pending'}]}});
  const nextRoute=await next.json();await readonly.goto(base+'/'+nextRoute.share_url);await readonly.waitForSelector('.stop-card');
  assert.match(await readonly.locator('#sync-status').innerText(),/navegador.*HTTPS/i);
  await readonly.evaluate(()=>driverApp.toggleDeliveryStatus('pwa-readonly',1));
  assert.equal(await readonly.evaluate(()=>driverApp.outbox.items.length),0);
  await readonly.evaluate(()=>localStorage.setItem(driverApp.outbox.key,'{}'));await readonly.reload();
  await readonly.waitForFunction(()=>document.getElementById('driver-error').style.display==='block');
  assert.equal(await readonly.evaluate(()=>localStorage.getItem('plaswill_outbox_v1_'+driverApp.routeId)),'{}');
  await readonly.click('#btn-refresh-route');
  assert.equal(await readonly.locator('.stop-card').count(),0);
  await unsupported.close();
  console.log('PASS PWA ownership: second tab read-only, handoff preserves queue, revoked access removes operational view');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
