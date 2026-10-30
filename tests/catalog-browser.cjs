const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const base=process.env.TEST_BASE;
  const context=await browser.newContext({extraHTTPHeaders:{'X-Test-Identity':'operator'}});
  await context.route('https://**/*',r=>r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/');await page.waitForFunction(()=>window.routineManager?.canWrite);
  await page.click('#nav-planning');
  let geocodes=0;
  await page.route('**/api/geocode.php?**',async route=>{geocodes++;await new Promise(resolve=>setTimeout(resolve,100));await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,lat:-29.1,lon:-52.1,display_name:'Synthetic corrected street'})});});
  await page.evaluate(async()=>{
    planner.fillManualFormWithCompany({nome:'Synthetic recipient',logradouro:'Original synthetic street',numero:'1',municipio:'Synthetic City',uf:'RS',lat:-28.2,lon:-53.5,client_id:'synthetic-client',address_id:'synthetic-address'});
    document.getElementById('form-logradouro').value='Corrected synthetic street';
    await Promise.all([planner.submitManualDelivery({preventDefault(){}}),planner.submitManualDelivery({preventDefault(){}})]);
  });
  assert.equal(geocodes,1);
  assert.equal(await page.evaluate(()=>planner.deliveries.length),1);
  assert.equal(await page.evaluate(()=>planner.deliveries[0].lat),-29.1);
  assert.equal(await page.evaluate(()=>planner.deliveries[0].logradouro),'Corrected synthetic street');
  // A malformed/unfinished AI suggestion is retained for manual review, never silently added.
  await page.route('**/api/process_danfe.php',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,delivery:{id:'synthetic-danfe',destinatario:'Synthetic AI recipient',logradouro:'Synthetic AI street',municipio:'Synthetic City',uf:'RS',lat:null,lon:null,source:'danfe_ai',needs_review:true,geocoded_by:'unresolved'}})}));
  await page.evaluate(()=>planner.handleDanfeUpload(new File([new Uint8Array([1,2,3])],'synthetic.png',{type:'image/png'})));
  await page.waitForFunction(()=>!!planner.pendingDanfeDelivery);
  await page.evaluate(()=>{document.getElementById('danfe-res-logradouro').value='Reviewed AI street';planner.confirmDanfeStop();});
  assert.equal(await page.evaluate(()=>planner.deliveries.length),1);
  assert.equal(await page.inputValue('#form-logradouro'),'Reviewed AI street');
  assert.equal(await page.inputValue('#form-lat'),'');
  assert((await page.locator('#manual-source-note').textContent()).includes('não verificada'));
  await page.evaluate(()=>planner.submitManualDelivery({preventDefault(){}}));
  assert.equal(await page.evaluate(()=>planner.deliveries.length),2);
  assert.equal(await page.evaluate(()=>planner.deliveries[1].geocoded_by),'manual_verified');
  await page.screenshot({path:'/tmp/plaswill-catalog-audit.png'});
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS catalogue audit browser: edited address re-geocoded once, no duplicate async submit, DANFE reviewed before inclusion');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
