const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const context=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
  await context.route('https://**/*',r=>r.abort());
  const page=await context.newPage();page.on('dialog',d=>d.accept());
  if(process.env.TEST_BASELINE_APP)await page.route('**/app.js*',r=>r.fulfill({contentType:'application/javascript',body:require('node:fs').readFileSync(process.env.TEST_BASELINE_APP)}));
  const mode=process.env.TEST_CASE;
  if(mode==='corrupt')await page.addInitScript(()=>localStorage.setItem('plaswill_deliveries_v1','{'));
  if(mode==='failed-route'){
   await page.addInitScript(()=>localStorage.setItem('plaswill_deliveries_v1',JSON.stringify([{id:'local-preserved',destinatario:'Synthetic local',lat:-28.2,lon:-53.5,status:'pending'}])));
   await page.route('**/api/get_route.php?**',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic outage'})}));
  }
  await page.goto(process.env.TEST_BASE+(mode==='failed-route'?'/?r=ROT-2345':'/'));
  await page.waitForFunction(()=>window.routineManager?.canWrite);await page.evaluate(()=>planner.ready);
  if(mode==='empty'){
   assert.equal(await page.evaluate(()=>planner.deliveries.length),0,'New sessions must not receive demonstration deliveries');
   assert.equal(await page.evaluate(()=>localStorage.getItem('plaswill_deliveries_v1')),null);
  }else if(mode==='corrupt'){
   assert.equal(await page.evaluate(()=>localStorage.getItem('plaswill_deliveries_v1')),'{','Malformed cache must never be replaced automatically');
   assert.equal(await page.evaluate(()=>planner.addDelivery({id:'new',destinatario:'Synthetic',lat:-28.2,lon:-53.5,status:'pending'})),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('plaswill_deliveries_v1')),'{');
   assert(await page.locator('#local-storage-feedback').isVisible());
  }else if(mode==='quota'){
   await page.evaluate(()=>{
    planner.deliveries=[];localStorage.setItem('plaswill_deliveries_v1','[]');
    const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='plaswill_deliveries_v1')throw new DOMException('Synthetic quota','QuotaExceededError');return set.call(this,k,v);};
    planner.addDelivery({id:'synthetic-quota',lat:-28.2,lon:-53.5,status:'pending'});
   });
   assert.equal(await page.evaluate(()=>planner.localWriteError),true);
   assert.equal(await page.evaluate(()=>planner.deliveries.length),1);
   assert(await page.locator('#local-storage-feedback').isVisible());
   assert.equal(await page.evaluate(()=>localStorage.getItem('plaswill_deliveries_v1')),'[]');
  }else if(mode==='finish-ack'){
   const id=await page.evaluate(async()=>{
    planner.deliveries=[{id:'synthetic-finish',lat:-28.2,lon:-53.5,status:'pending'}];planner.saveDeliveries();
    const response=await entregasFetch('api/save_route.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:planner.deliveries})});
    planner.currentRouteId=(await response.json()).route_id;return planner.currentRouteId;
   });
   await page.route('**/api/finish_route.php',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({success:true})}));
   await page.evaluate(()=>planner.confirmFinishRotina());
   assert.equal(await page.evaluate(()=>planner.currentRouteId),id,'Malformed finish acknowledgement must not clear the active route');
   assert.equal(await page.evaluate(()=>planner.deliveries.length),1);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('plaswill_deliveries_v1')).length),1);
  }else if(mode==='optimizer-context'||mode==='archive-context'){
   const fixtures=await page.evaluate(async()=>{
    const create=async label=>{
     let r=(await routineManager.api('api/routine_write.php',{action:'create',operation_id:crypto.randomUUID(),name:label,scheduled_date:'2026-10-30'})).routine;
     const stops=[0,1].map(i=>({id:label+'-'+i,destinatario:'Synthetic '+label,status:'pending',logradouro:'Synthetic street',municipio:'Synthetic city',uf:'RS',lat:-28.2-i*.01,lon:-53.5}));
     return (await routineManager.api('api/routine_write.php',{...r,action:'update',operation_id:crypto.randomUUID(),expected_version:r.version,stops})).routine;
    };
    const a=await create('synthetic-A'),b=await create('synthetic-B');
    const response=await entregasFetch('api/save_route.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:a.stops})});
    const legacy=(await response.json()).route_id;
    await entregasFetch('api/finish_route.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route_id:legacy})});
    return {a:a.routine_id,b:b.routine_id,legacy};
   });
   const scenarios=mode==='optimizer-context'?['navigation','edit','fallback']:['archive'];
   for(const scenario of scenarios){
    await page.evaluate(id=>routineManager.open(id),fixtures.a);
    let release,reached;const gate=new Promise(r=>release=r),started=new Promise(r=>reached=r);
    const pattern=scenario==='archive'?'**/api/get_route.php?**':'**/api/optimize_sequence.php';
    await page.route(pattern,async r=>{reached();await gate;if(scenario==='fallback')await r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Synthetic failure'})});else await r.continue();});
    await page.evaluate(({scenario,id})=>{window.pendingRace=scenario==='archive'?planner.loadArchivedRoute(id):planner.optimizeSequence();},{scenario,id:fixtures.legacy});
    await started;
    const expected=await page.evaluate(async({scenario,id})=>{
     if(scenario==='edit'){planner.deliveries[0].observacoes='Latest local edit';routineManager.markDirty();}
     else await routineManager.open(id);
     return {id:routineManager.current.routine_id,stops:JSON.stringify(planner.deliveries),dirty:routineManager.dirty};
    },{scenario,id:fixtures.b});
    release();const result=await page.evaluate(()=>window.pendingRace);await page.unroute(pattern);
    assert.equal(await page.evaluate(()=>routineManager.current.routine_id),expected.id,scenario+' response must not restore another context');
    assert.equal(await page.evaluate(()=>JSON.stringify(planner.deliveries)),expected.stops,scenario+' response must not replace newer deliveries');
    assert.equal(await page.evaluate(()=>routineManager.dirty),expected.dirty,scenario+' response must not silently edit the current routine');
    assert.equal(result,false,'Stale asynchronous results must be discarded');
    if(scenario==='edit')await page.evaluate(()=>routineManager.save());
   }
  }else if(mode==='legacy-context'){
   const target=await page.evaluate(async()=>{
    const response=await entregasFetch('api/routine_write.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',operation_id:crypto.randomUUID(),name:'Synthetic unrelated context',scheduled_date:'2026-10-30'})});
    planner.addDelivery({id:'synthetic-context',destinatario:'Synthetic',lat:-28.2,lon:-53.5,status:'pending'});
    return (await response.json()).routine.routine_id;
   });
   for(const [endpoint,action] of [['save_route','share'],['issue_route_access','share'],['finish_route','finish']]){
    let release,reached;const gate=new Promise(r=>release=r),started=new Promise(r=>reached=r);
    await page.route('**/api/'+endpoint+'.php',async r=>{reached();await gate;await r.continue();});
    await page.evaluate(kind=>{if(kind==='share')window.pendingLegacy=planner.openExportModal();else window.pendingLegacy=planner.confirmFinishRotina();},action);
    await started;
    const opened=await page.evaluate(id=>routineManager.open(id),target);
    const edited=await page.evaluate(()=>{
     const before=planner.deliveries.length;
     const added=planner.addDelivery({id:'synthetic-blocked',lat:-28.3,lon:-53.6,status:'pending'});
     planner.deleteStop('synthetic-context');planner.clearAllStops();
     return {added,before,after:planner.deliveries.length};
    });
    release();await page.evaluate(()=>window.pendingLegacy);
    await page.unroute('**/api/'+endpoint+'.php');
    assert.equal(opened,false,'Navigation must wait while a legacy '+endpoint+' operation is pending');
    assert.equal(edited.added,false);assert.equal(edited.after,edited.before,'Pending legacy operations must freeze the submitted planning');
    assert.equal(await page.evaluate(()=>routineManager.current),null);
    if(action==='share')await page.evaluate(()=>{planner.closeModal('modal-export-route');planner.clearShareUrl();});
   }
  }else if(mode==='legacy-retry'){
   await page.evaluate(()=>planner.addDelivery({id:'synthetic-retry',destinatario:'Synthetic',lat:-28.2,lon:-53.5,status:'pending'}));
   let created;
   await page.route('**/api/save_route.php',async r=>{const response=await r.fetch();created=(await response.json()).route_id;await r.abort('failed');});
   await page.evaluate(()=>planner.openExportModal());
   await page.unroute('**/api/save_route.php');
   await page.reload();await page.waitForFunction(()=>routineManager?.canWrite);await page.evaluate(()=>planner.ready);
   await page.evaluate(()=>planner.openExportModal());
   assert.equal(await page.evaluate(()=>planner.currentRouteId),created,'Lost response followed by reload/retry must recover the same route');
   assert.equal(await page.evaluate(()=>planner.currentShareUrl),null,'Replay must not invent a driver credential');
   await page.evaluate(()=>planner.openExportModal());
   assert.equal(new URL(await page.inputValue('#export-share-url-input')).searchParams.get('r'),created);
  }else if(mode==='failed-route'){
   assert.equal(await page.evaluate(()=>planner.deliveries.length),0,'Failed route lookup must not present unrelated local stops as that route');
   assert.equal(await page.evaluate(()=>planner.routeLoadFailed),true);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('plaswill_deliveries_v1'))[0].id),'local-preserved');
   assert(await page.locator('#local-storage-feedback').isVisible());
  }
  console.log('PASS initialization '+mode);await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
