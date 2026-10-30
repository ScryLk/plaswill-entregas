const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    const base=process.env.TEST_BASE;
    const context=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
    await context.route('https://**/*',route=>route.abort());
    let page=await context.newPage();page.on('dialog',dialog=>dialog.accept());
    await page.goto(base+'/');await page.waitForFunction(()=>window.routineManager?.canWrite);
    const id=await page.evaluate(async()=>{
      const {routine}=await routineManager.api('api/routine_write.php',{action:'create',operation_id:crypto.randomUUID(),name:'Synthetic recovery',scheduled_date:'2026-10-30'});
      await routineManager.open(routine.routine_id);routineManager.current.notes='Unsaved synthetic correction';routineManager.markDirty();return routine.routine_id;
    });
    await page.route('**/api/routine_write.php',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true})}));
    assert.equal(await page.evaluate(()=>routineManager.save()),false);
    assert.equal(await page.evaluate(id=>localStorage.getItem('plaswill_routine_edit_'+id)!==null,id),true,'Invalid save acknowledgement must never delete the recovery copy');
    assert.equal(await page.evaluate(()=>routineManager.dirty),true);
    await page.unroute('**/api/routine_write.php');
    assert.equal(await page.evaluate(()=>routineManager.save()),true);
    const stale=await page.evaluate(()=>JSON.parse(JSON.stringify(routineManager.current)));
    await page.evaluate(()=>{routineManager.current.notes='Newer local correction';routineManager.markDirty();});
    await page.route('**/api/routine_write.php',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,routine:stale})}));
    assert.equal(await page.evaluate(()=>routineManager.save()),false,'A schema-valid stale version is not confirmation of the submitted update');
    assert.equal(await page.evaluate(id=>localStorage.getItem('plaswill_routine_edit_'+id)!==null,id),true);
    assert.equal(await page.evaluate(()=>routineManager.current.notes),'Newer local correction');
    await page.unroute('**/api/routine_write.php');
    await page.evaluate(()=>{routineManager.current.notes='Unsaved synthetic correction';routineManager.markDirty();});
    assert.equal(await page.evaluate(()=>routineManager.save()),true);
    await page.reload();await page.waitForFunction(()=>routineManager.current?.name==='Synthetic recovery');
    assert.equal(await page.evaluate(()=>routineManager.current.notes),'Unsaved synthetic correction');
    await page.close();page=await context.newPage();page.on('dialog',dialog=>dialog.accept());
    await page.goto(base+'/?routine='+id);await page.waitForFunction(()=>routineManager.current?.name==='Synthetic recovery');
    assert.equal(await page.evaluate(()=>routineManager.current.notes),'Unsaved synthetic correction');
    // A different authorized browser gets the backend data without localStorage.
    const independent=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
    await independent.route('https://**/*',route=>route.abort());
    const other=await independent.newPage();await other.goto(base+'/?routine='+id);
    await other.waitForFunction(()=>routineManager.current?.name==='Synthetic recovery');
    assert.equal(await other.evaluate(()=>routineManager.current.notes),'Unsaved synthetic correction');await independent.close();
    // Even a save attempted without new edits must visibly report a failed operation.
    await page.route('**/api/routine_write.php',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Synthetic write failure'})}));
    assert.equal(await page.evaluate(()=>routineManager.save('planned')),false);
    assert.match(await page.locator('#routine-save-status').textContent(),/Não foi possível salvar/);
    await page.unroute('**/api/routine_write.php');
    await page.evaluate(()=>routineManager.save('draft'));
    const fixtures=await page.evaluate(async()=>{
      const a=routineManager.current;
      planner.deliveries=[{id:'synthetic-operation',destinatario:'Synthetic',logradouro:'Synthetic street',municipio:'Synthetic city',uf:'RS',lat:-28.2,lon:-53.5,status:'pending'}];routineManager.markDirty();await routineManager.save();
      const dispatch=await routineManager.api('api/routine_write.php',{action:'dispatch',routine_id:a.routine_id,expected_version:routineManager.current.version});routineManager.apply(dispatch.routine);
      const b=(await routineManager.api('api/routine_write.php',{action:'create',operation_id:crypto.randomUUID(),name:'Synthetic other routine',scheduled_date:'2026-10-30'})).routine;
      return {a:a.routine_id,b:b.routine_id,route:dispatch.route_id};
    });
    let release;const gate=new Promise(resolve=>{release=resolve;});let started;const requested=new Promise(resolve=>{started=resolve;});
    await page.route('**/api/issue_route_access.php',async route=>{started();await gate;await route.continue();});
    await page.evaluate(()=>{window.pendingSyntheticShare=routineManager.share();});await requested;
    assert.equal(await page.evaluate(id=>routineManager.open(id),fixtures.b),false,'Navigation must wait while driver access is being issued');
    release();await page.evaluate(()=>window.pendingSyntheticShare);
    assert.equal(await page.evaluate(()=>routineManager.current.routine_id),fixtures.a);
    const share=new URL(await page.inputValue('#export-share-url-input'));assert.equal(share.searchParams.get('r'),fixtures.route);
    await page.screenshot({path:'/tmp/plaswill-persistence-audit.png'});
    await context.close();
    console.log('PASS persistence UI: malformed/failed acknowledgements preserve recovery, reload/reopen/independent browser retrieve saved data, token issuance prevents cross-routine navigation');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
