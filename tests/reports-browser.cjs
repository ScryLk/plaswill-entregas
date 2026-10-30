const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    const base=process.env.TEST_BASE;
    const context=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
    await context.route('https://**/*',r=>r.abort());
    const page=await context.newPage();const errors=[];const alerts=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{alerts.push(d.message());return d.dismiss();});
    await page.goto(base+'/');await page.waitForFunction(()=>window.routineManager?.canWrite);
    await page.evaluate(()=>{window.printCount=0;window.print=()=>window.printCount++;planner.currentRouteId=null;planner.deliveries=[{id:'local-only',destinatario:'LOCAL SHOULD NOT PRINT',lat:-28.2,lon:-53.5,status:'pending'}];});
    await page.evaluate(()=>planner.printRomaneio());
    assert.equal(await page.evaluate(()=>printCount),0,'Local-only planning must not print a fictitious operational route');
    assert(alerts.some(x=>x.includes('servidor')));
    const fixture=await page.evaluate(async()=>{
      const post=async(path,body)=>{
        const r=await entregasFetch('api/'+path+'.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;
      };
      const stops=[{id:'one',destinatario:'Synthetic recipient',logradouro:'Synthetic street',numero:'17',complemento:'Gate B',bairro:'Synthetic district',municipio:'Synthetic city',uf:'RS',cep:'12345-000',numero_nota:'NF-ONE',itens_resumo:'Description',volumes:3,observacoes:'Stop observation',lat:-28.2,lon:-53.5,status:'pending'},
        {id:'two',destinatario:'Synthetic recipient',logradouro:'Synthetic street',numero:'17',municipio:'Synthetic city',uf:'RS',numero_nota:'NF-TWO',lat:-28.2,lon:-53.5,status:'pending'}];
      let r=(await post('routine_write',{action:'create',operation_id:crypto.randomUUID(),name:'Synthetic report routine',scheduled_date:'2025-04-06',motorista:'Synthetic driver',veiculo:'Synthetic vehicle',notes:'Routine note',origin:{id:'synthetic',name:'Synthetic origin',address:'Origin address',lat:-28.3,lon:-53.6}})).routine;
      r=(await post('routine_write',{...r,action:'update',operation_id:crypto.randomUUID(),expected_version:r.version,stops})).routine;
      return {routine:r.routine_id,version:r.version};
    });
    await page.evaluate(id=>routineManager.open(id),fixture.routine);
    // A saved planning report is clearly distinguished from an operational romaneio.
    await page.evaluate(()=>planner.printReport());
    assert.equal(await page.evaluate(()=>printCount),1);
    assert((await page.innerText('#print-document-state')).includes('Rascunho'));
    assert.equal(await page.innerText('#print-route-code'),'Não despachada');
    assert.equal(await page.locator('#print-qrcode-canvas').evaluate(el=>el.childElementCount),0);
    await page.evaluate(()=>{planner.deliveries[0].destinatario='UNSAVED';routineManager.markDirty();});
    await page.evaluate(()=>planner.printReport());
    assert.equal(await page.evaluate(()=>printCount),1,'Unsaved changes must block document generation');
    await page.evaluate(id=>{localStorage.removeItem('plaswill_routine_edit_'+id);routineManager.pendingConflict=null;routineManager.dirty=false;return routineManager.open(id);},fixture.routine);
    const route=await page.evaluate(async fixture=>{
      const response=await entregasFetch('api/routine_write.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'dispatch',routine_id:fixture.routine,expected_version:fixture.version})});return response.json();
    },fixture);
    await page.evaluate(id=>routineManager.open(id),fixture.routine);
    // Tamper with the view without changing backend; printed rows must be fetched again.
    await page.evaluate(()=>{planner.deliveries=[{id:'fake',destinatario:'LOCAL SHOULD NOT PRINT'}];return planner.printRomaneio();});
    assert.equal(await page.evaluate(()=>printCount),2);
    assert.equal(await page.innerText('#print-route-code'),route.route_id);
    assert.equal(await page.innerText('#print-routine-code'),fixture.routine);
    assert.equal(await page.innerText('#print-route-date'),'06/04/2025');
    assert.equal(await page.innerText('#print-driver'),'Synthetic driver');
    assert.equal(await page.innerText('#print-vehicle'),'Synthetic vehicle');
    assert.equal(await page.locator('#print-table-body tr').count(),2);
    const text=await page.innerText('#print-table-body');
    assert(text.includes('NF-ONE')&&text.includes('NF-TWO')&&text.includes('3 volumes')&&text.includes('Description'));
    assert(text.includes('Gate B')&&text.includes('Synthetic district')&&text.includes('12345-000'));
    assert(!text.includes('LOCAL SHOULD NOT PRINT')&&!text.includes('1 volume'));
    // Printing finished/cancelled reports requires no driver token issuance.
    const tokenRequests=[];page.on('request',r=>{if(r.url().includes('issue_route_access'))tokenRequests.push(r.url());});
    await page.evaluate(async id=>{
      await entregasFetch('api/update_route_status.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route_id:id,stop_id:'one',status:'delivered'})});
      await entregasFetch('api/finish_route.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route_id:id})});
      return planner.printReport();
    },route.route_id);
    assert.equal(await page.innerText('#print-document-state'),'Finalizada');
    assert((await page.innerText('#print-progress')).includes('1 / 2'));
    assert((await page.innerText('#print-table-body')).includes('Entregue'));
    assert.equal(tokenRequests.length,0);
    const cancelled=await page.evaluate(async()=>{
      const post=async body=>{const r=await entregasFetch('api/routine_write.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d.routine;};
      let r=await post({action:'create',operation_id:crypto.randomUUID(),name:'Synthetic cancelled report',scheduled_date:'2025-05-07'});
      r=await post({...r,action:'update',operation_id:crypto.randomUUID(),expected_version:r.version,stops:[{id:'cancelled-only',destinatario:'Cancelled single recipient',logradouro:'Cancelled street',municipio:'Other city',uf:'RS',lat:-28.3,lon:-53.6,status:'pending'}]});
      r=await post({action:'cancel',routine_id:r.routine_id,expected_version:r.version,reason:'Synthetic cancellation reason'});
      await routineManager.open(r.routine_id);return r.routine_id;
    });
    await page.evaluate(()=>planner.printReport());
    assert.equal(await page.innerText('#print-document-state'),'Cancelada');
    assert((await page.innerText('#print-document-notice')).includes('CANCELADA'));
    assert.equal(await page.locator('#print-table-body tr').count(),1);
    assert(!(await page.innerText('#print-table-body')).includes('NF-ONE'));
    assert((await page.innerText('#print-notes')).includes('Synthetic cancellation reason'));
    // Another browser with read-only identity reconstructs the finished report from the server.
    const reader=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'reader'}});
    await reader.route('https://**/*',r=>r.abort());
    const other=await reader.newPage();other.on('dialog',d=>d.dismiss());
    await other.goto(base+'/?routine='+fixture.routine);await other.waitForFunction(()=>routineManager.current?.status==='finished');
    await other.evaluate(()=>{window.print=()=>{};return planner.printReport();});
    assert.equal(await other.innerText('#print-routine-code'),fixture.routine);
    assert.equal(await other.innerText('#print-route-code'),route.route_id);
    assert.equal(await other.locator('#print-table-body tr').count(),2);
    assert.equal(await other.innerText('#print-document-state'),'Finalizada');
    await other.emulateMedia({media:'print'});
    assert.equal(await other.locator('.app-header-plaswill').isVisible(),false,'Application navigation must not enter the printed document');
    assert.equal(await other.locator('#print-romaneio-sheet').isVisible(),true);
    await other.screenshot({path:'/tmp/plaswill-documents-print.png',fullPage:true});
    await other.pdf({path:'/tmp/plaswill-documents-report.pdf',format:'A4',printBackground:true});
    await reader.close();
    await page.route('**/api/routine_read.php?**',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic outage'})}));
    const prints=await page.evaluate(()=>printCount);await page.evaluate(()=>planner.printReport());
    assert.equal(await page.evaluate(()=>printCount),prints);
    assert.equal(await page.evaluate(()=>document.body.classList.contains('document-print-ready')),false);
    await page.unroute('**/api/routine_read.php?**');
    assert.deepEqual(errors,[]);
    assert.equal(tokenRequests.length,0);
    console.log('PASS reports: no fictitious route, authoritative rows/date/metadata, draft/finished/cancelled documents, two routines and read-only browser, dirty/outage blocked, no token issuance');
    await context.close();
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
