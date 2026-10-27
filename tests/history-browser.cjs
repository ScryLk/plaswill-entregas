const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    const base=process.env.TEST_BASE;
    const context=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
    await context.route('https://**/*',r=>r.abort());
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    let rejectReplacement=false;
    page.on('dialog',d=>d.type()==='confirm'&&rejectReplacement?d.dismiss():d.accept());
    await page.goto(base+'/');await page.waitForFunction(()=>window.routineManager?.canWrite);
    const fixture=await page.evaluate(async()=>{
      const post=async(path,body)=>{
        const response=await entregasFetch('api/'+path+'.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const result=await response.json();if(!response.ok)throw new Error(result.error);return result;
      };
      const stops=[{id:'history-synthetic',destinatario:'Synthetic customer',logradouro:'Synthetic street',municipio:'Synthetic city',uf:'RS',lat:-28.2,lon:-53.5,status:'pending'}];
      let r=(await post('routine_write',{action:'create',operation_id:crypto.randomUUID(),name:'Synthetic history context',scheduled_date:'2026-10-27'})).routine;
      r=(await post('routine_write',{...r,action:'update',expected_version:r.version,operation_id:crypto.randomUUID(),stops})).routine;
      const dispatched=await post('routine_write',{action:'dispatch',routine_id:r.routine_id,expected_version:r.version});
      const legacy=await post('save_route',{stops});await post('finish_route',{route_id:legacy.route_id});
      const activeLegacy=await post('save_route',{stops});
      await routineManager.open(r.routine_id);
      routineManager.shareUrls.set(r.routine_id,dispatched.share_url);await routineManager.share();planner.closeModal('modal-export-route');
      return {routine:r.routine_id,active:dispatched.route_id,share:dispatched.share_url,archived:legacy.route_id,activeLegacy:activeLegacy.route_id};
    });
    const snapshot=()=>page.evaluate(()=>({routine:routineManager.current?.routine_id,route:planner.currentRouteId,share:planner.currentShareUrl,storage:planner.storageKey,url:location.href,stops:planner.deliveries}));
    const before=await snapshot();
    assert(await page.locator('#export-qrcode-box canvas').count()>0);
    rejectReplacement=true;
    await page.evaluate(id=>planner.loadArchivedRoute(id),fixture.archived);
    assert.deepEqual(await snapshot(),before,'Cancelling history must preserve the selected routine and its access');
    rejectReplacement=false;
    await page.route('**/api/get_route.php?**',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic outage'})}));
    await page.evaluate(id=>planner.loadArchivedRoute(id),fixture.archived);
    assert.deepEqual(await snapshot(),before,'Failed history lookup must preserve the selected routine');
    await page.unroute('**/api/get_route.php?**');
    await page.evaluate(id=>planner.loadArchivedRoute(id),fixture.archived);
    assert.equal(await page.evaluate(()=>routineManager.current),null);
    assert.equal(await page.evaluate(()=>planner.currentRouteId),fixture.archived);
    assert.equal(await page.evaluate(()=>planner.routineId),null);
    assert.equal(await page.evaluate(()=>planner.currentShareUrl),null);
    assert.equal(await page.inputValue('#export-share-url-input'),'');
    assert.equal(await page.locator('#btn-whatsapp-share').getAttribute('href'),null);
    assert.equal(await page.locator('#export-qrcode-box').evaluate(el=>el.childElementCount),0);
    assert.equal(await page.locator('#print-qrcode-canvas').evaluate(el=>el.childElementCount),0);
    assert.equal(new URL(page.url()).searchParams.get('r'),fixture.archived);
    // A finished route cannot reuse another routine's link to bypass token reissuance rules.
    await page.evaluate(async stale=>{planner.currentShareUrl=stale;await planner.openExportModal();},fixture.share);
    assert.equal(await page.inputValue('#export-share-url-input'),'');
    assert.equal(await page.evaluate(()=>planner.currentShareUrl),null);
    // An active legacy route can issue its own token, never reuse the unrelated cached link.
    await page.evaluate(id=>planner.loadArchivedRoute(id),fixture.activeLegacy);
    await page.evaluate(async stale=>{planner.currentShareUrl=stale;await planner.openExportModal();},fixture.share);
    const shared=new URL(await page.inputValue('#export-share-url-input'));
    assert.equal(shared.searchParams.get('r'),fixture.activeLegacy);
    assert(shared.hash.startsWith('#token='));
    const previous=new URL(fixture.share,base);
    const oldAccess=await context.request.get(base+'/api/get_route.php?r='+fixture.active,{headers:{'X-Test-Identity':'','Authorization':'Bearer '+previous.hash.slice(7)}});
    assert.equal(oldAccess.status(),200,'Sharing history must not rotate the other routine token');
    const selectedAccess=await context.request.get(base+'/api/get_route.php?r='+fixture.activeLegacy,{headers:{'X-Test-Identity':'','Authorization':'Bearer '+shared.hash.slice(7)}});
    assert.equal(selectedAccess.status(),200);
    assert.equal((await selectedAccess.json()).route.route_id,fixture.activeLegacy);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('PASS history context: cancellation/outage preserve routine; route switch clears old access; sharing uses only the selected route');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
