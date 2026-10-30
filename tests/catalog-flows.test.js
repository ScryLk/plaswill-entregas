const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function planner(){
  const ids=['form-destinatario','form-logradouro','form-numero','form-bairro','form-cidade','form-uf','form-nfe','form-itens','form-lat','form-lon','form-complemento','form-volumes','form-observacoes','manual-client-search','manual-suggestions-box','danfe-res-destinatario','danfe-res-logradouro','danfe-res-numero','danfe-res-bairro','danfe-res-nf','danfe-res-itens','danfe-res-cidade','danfe-res-uf','danfe-res-complemento','danfe-res-volumes','danfe-res-observacoes','manual-source-note'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:'',style:{},innerHTML:'',textContent:'',addEventListener(){}}]));
  elements['form-manual-delivery']={reset(){for(const e of Object.values(elements))if('value'in e)e.value='';},querySelector(){return {disabled:false};}};
  const context={window:{},document:{addEventListener(){},getElementById:id=>elements[id]||{style:{},value:'',addEventListener(){}},querySelector(){return null;}},console,setTimeout,clearTimeout,Date,Math,Number,crypto:require('node:crypto').webcrypto,alert(){},confirm:()=>true,AbortController};
  vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8')+'\nglobalThis.Planner=DeliveryPlanner;',context);
  const p=Object.create(context.Planner.prototype);p.deliveries=[];p.closeModal=()=>{};p.resetDanfeModal=()=>{};p.switchCreateTab=()=>{};
  p.addDelivery=d=>{p.deliveries.push(d);return true;};
  for(const [id,value]of Object.entries({'form-destinatario':'Synthetic client','form-logradouro':'Synthetic street','form-numero':'1','form-cidade':'Synthetic City','form-uf':'RS'}))elements[id].value=value;
  return {p,e:elements,c:context};
}
test('double submission during geocode adds one delivery',async()=>{
  const {p,c}=planner();let finish;c.window.entregasFetch=()=>new Promise(r=>{finish=r;});
  const first=p.submitManualDelivery({preventDefault(){}});const second=p.submitManualDelivery({preventDefault(){}});
  finish({ok:true,json:async()=>({success:true,lat:-28.2,lon:-53.5})});
  await Promise.race([Promise.all([first,second]),new Promise((_,reject)=>setTimeout(()=>reject(new Error('duplicate submit left another geocode pending')),200))]);
  assert.equal(p.deliveries.length,1);
});
test('edited catalogue address cannot retain the previous coordinates',async()=>{
  const {p,e,c}=planner();
  p.fillManualFormWithCompany({nome:'Synthetic',logradouro:'Old street',numero:'1',municipio:'City',uf:'RS',lat:-28.2,lon:-53.5});
  e['form-logradouro'].value='Corrected street';
  c.window.entregasFetch=async()=>({ok:true,json:async()=>({success:true,lat:-29.1,lon:-52.1})});
  await p.submitManualDelivery({preventDefault(){}});
  assert.equal(p.deliveries[0].lat,-29.1);assert.equal(p.deliveries[0].lon,-52.1);
});
test('rejected manual addition preserves form values',async()=>{
  const {p,e}=planner();e['form-lat'].value='-28.2';e['form-lon'].value='-53.5';p.addDelivery=()=>false;
  await p.submitManualDelivery({preventDefault(){}});
  assert.equal(e['form-destinatario'].value,'Synthetic client');
});
test('edited DANFE address cannot carry coordinates from original extraction',()=>{
  const {p,e}=planner();p.pendingDanfeDelivery={id:'synthetic',destinatario:'Synthetic',logradouro:'Old street',numero:'1',bairro:'Center',municipio:'City',uf:'RS',lat:-28.2,lon:-53.5};
  for(const [id,value]of Object.entries({'danfe-res-destinatario':'Synthetic','danfe-res-logradouro':'New street','danfe-res-numero':'1','danfe-res-bairro':'Center','danfe-res-cidade':'City','danfe-res-uf':'RS'}))e[id].value=value;
  p.confirmDanfeStop();assert.equal(p.deliveries.length,0);assert.equal(e['form-lat'].value,'');assert.equal(e['form-logradouro'].value,'New street');
});
