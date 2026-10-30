/* Corporate planning shares the existing planner, API authorization and route capabilities. */
(() => {
  const names={draft:'Rascunho',planned:'Planejada',dispatched:'Despachada',in_progress:'Em andamento',finished:'Finalizada',cancelled:'Cancelada'};
  const clone=value=>JSON.parse(JSON.stringify(value));
  function node(tag,text,attrs={}) { const item=document.createElement(tag); if(text!==null)item.textContent=text; for(const [k,v] of Object.entries(attrs))item.setAttribute(k,String(v));return item; }
  function button(text,action,disabled=false) { const b=node('button',text,{type:'button',class:'routine-secondary'});b.disabled=disabled;b.addEventListener('click',event=>{event.stopPropagation();action();});return b; }
  function located(s) {
    if(s.lat===null||s.lon===null||s.lat===''||s.lon==='')return false;
    if(!Number.isFinite(Number(s.lat))||!Number.isFinite(Number(s.lon))||Math.abs(Number(s.lat))>90||Math.abs(Number(s.lon))>180)return false;
    if(['unresolved','approximate','default_center_jitter'].includes(s.geocoded_by))return false;
    return !(Math.abs(Number(s.lat)+28.2917)<.0001&&Math.abs(Number(s.lon)+53.5019)<.0001) || s.geocoded_by==='manual_verified';
  }
  const shortDate=value=>new Date(value+'T12:00:00').toLocaleDateString('pt-BR');
  function confirmedRoutine(value,expectedId) {
    const valid=value&&/^RUT-[a-f0-9]{32}$/.test(value.routine_id)&&(!expectedId||value.routine_id===expectedId)&&Number.isSafeInteger(value.version)&&value.version>=0&&
      Object.hasOwn(names,value.status)&&typeof value.editable==='boolean'&&Array.isArray(value.stops)&&value.stops.length<=500&&
      value.stops.every(s=>s&&typeof s.id==='string'&&['pending','delivered'].includes(s.status))&&
      value.origin&&Number.isFinite(Number(value.origin.lat))&&Number.isFinite(Number(value.origin.lon))&&
      ['name','scheduled_date','motorista','veiculo','notes'].every(key=>typeof value[key]==='string')&&
      (value.route_id===null||/^ROT-[A-Z0-9]{4}$/.test(value.route_id));
    if(!valid)throw new Error('O servidor não confirmou os dados da rotina. Suas alterações locais foram preservadas.');
    return value;
  }
  function confirmedShareUrl(value,routeId) {
    const url=new URL(value,location.href),target=new URL('motorista.html',location.href);
    if(url.origin!==target.origin||url.pathname!==target.pathname||url.searchParams.get('r')!==routeId||!/^#token=[a-f0-9]{64}$/.test(url.hash))throw new Error('O servidor não confirmou um acesso válido para a rota selecionada.');
    return value;
  }
  class RoutineManager {
    constructor(planner) {
      this.p=planner;this.current=null;this.canWrite=false;this.dirty=false;this.generation=0;
      this.page=1;this.catalogPage=1;this.selections=new Map();this.overrides=new Map();this.shareUrls=new Map();
      this.$=id=>document.getElementById(id);this.bind();this.hookPlanner();this.ready=this.init();
    }
    async api(path,body,options={}) {
      const response=await window.entregasFetch(path,{...options,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'})});
      const data=await response.json();
      if(!response.ok||!data||typeof data!=='object'||data.success===false) {const error=new Error(data?.error||'Não foi possível concluir a solicitação.');error.status=response.status;error.code=data?.code;throw error;}
      if(body&&data.success!==true)throw new Error('O servidor não confirmou a operação. Suas alterações locais foram preservadas.');
      if(path.startsWith('api/routine_write.php')||path.startsWith('api/routine_read.php?id=')) {
        if(data.success!==true)throw new Error('O servidor não confirmou a operação. Suas alterações locais foram preservadas.');
        const expectedId=body?.routine_id||new URL(path,location.href).searchParams.get('id');
        confirmedRoutine(data.routine,expectedId);
        if(body?.action==='update'&&data.routine.version<=body.expected_version)throw new Error('O servidor não confirmou uma versão posterior ao planejamento enviado. Suas alterações locais foram preservadas.');
      }
      return data;
    }
    async init() {
      try {await this.p.ready;} catch(_) {this.message('Mapa indisponível. A listagem de rotinas continua disponível.');}
      try {const session=await this.api('api/auth_session.php');this.canWrite=!!session.user?.roles.some(role=>['operator','administrator'].includes(role));} catch(_) {this.canWrite=false;}
      this.$('routine-new').disabled=!this.canWrite;
      const params=new URLSearchParams(location.search);
      if(params.get('routine')) await this.open(params.get('routine'));
      else if(params.has('r')||params.has('id'))this.showPlanning();
      else await this.list();
      window.addEventListener('beforeunload',event=>{if(this.dirty){event.preventDefault();event.returnValue='';}});
      setInterval(()=>this.poll(),30000);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.poll();});
    }
    message(text) {this.$('routine-list-feedback').textContent=text;}
    bind() {
      this.$('nav-routines').addEventListener('click',()=>this.back());
      this.$('nav-planning').addEventListener('click',()=>this.showPlanning());
      this.$('nav-history').addEventListener('click',()=>this.p.openHistoryModal());
      this.$('routine-new').addEventListener('click',()=>this.metadata(false));
      this.$('routine-edit-meta').addEventListener('click',()=>this.metadata(true));
      this.$('routine-select-addresses').addEventListener('click',()=>this.catalog());
      this.$('routine-save').addEventListener('click',()=>this.save('draft'));
      this.$('routine-plan').addEventListener('click',()=>this.save('planned'));
      this.$('routine-dispatch').addEventListener('click',()=>this.reviewDispatch());
      this.$('routine-dispatch-confirm').addEventListener('click',()=>this.dispatch());
      this.$('routine-share').addEventListener('click',()=>this.share());
      this.$('routine-finish').addEventListener('click',()=>this.p.openFinishRotinaModal());
      this.$('routine-cancel').addEventListener('click',()=>this.cancel());
      this.$('routine-reload').addEventListener('click',()=>this.reloadConflict());
      this.$('routine-reapply').addEventListener('click',()=>this.reapply());
      this.$('routine-download').addEventListener('click',()=>this.download());
      this.$('routine-meta-form').addEventListener('submit',event=>{event.preventDefault();this.submitMetadata();});
      this.$('routine-delivery-form').addEventListener('submit',event=>{event.preventDefault();this.submitDelivery();});
      this.$('routine-geocode').addEventListener('click',()=>this.geocode());
      for(const el of document.querySelectorAll('[data-close]'))el.addEventListener('click',()=>this.$(el.dataset.close).close());
      this.$('routine-filters').addEventListener('submit',event=>{event.preventDefault();this.page=1;this.list();});
      this.$('routine-filters').addEventListener('change',()=>{this.page=1;this.list();});
      this.$('routine-search').addEventListener('input',()=>{clearTimeout(this.listTimer);this.listTimer=setTimeout(()=>{this.page=1;this.list();},300);});
      this.$('routine-prev').addEventListener('click',()=>{this.page--;this.list();});
      this.$('routine-next').addEventListener('click',()=>{this.page++;this.list();});
      this.$('catalog-filters').addEventListener('submit',event=>event.preventDefault());
      this.$('catalog-filters').addEventListener('change',event=>{if(event.target.name==='city')this.$('catalog-filters').elements.district.value='';this.catalogPage=1;this.loadCatalog();});
      this.$('catalog-search').addEventListener('input',()=>{clearTimeout(this.catalogTimer);this.catalogPage=1;this.catalogAbort?.abort();this.catalogSeq=(this.catalogSeq||0)+1;this.catalogTimer=setTimeout(()=>this.loadCatalog(),300);});
      this.$('catalog-prev').addEventListener('click',()=>{this.catalogPage--;this.loadCatalog();});
      this.$('catalog-next').addEventListener('click',()=>{this.catalogPage++;this.loadCatalog();});
      this.$('catalog-clear').addEventListener('click',()=>{this.selected.clear();this.selectionSummary();this.renderCatalog();});
      this.$('catalog-confirm').addEventListener('click',()=>this.includeSelected());
      this.$('routine-catalog-dialog').addEventListener('close',()=>{this.catalogAbort?.abort();this.catalogSeq=(this.catalogSeq||0)+1;});
      const form=this.$('routine-delivery-form');
      for(const key of ['logradouro','numero','complemento','bairro','municipio','uf','cep','lat','lon'])form.elements[key].addEventListener('input',()=>{form.elements.verified.checked=false;});
    }
    editable() {return !!(this.current?.editable&&this.canWrite);}
    hookPlanner() {
      const p=this.p;
      const original={};
      for(const key of ['saveDeliveries','renderStopsList','updateMapMarkers','openExportModal','openFinishRotinaModal','confirmFinishRotina','toggleDeliveryStatus','optimizeSequence','localOptimize','loadArchivedRoute','updateOriginMarker','setOrigin'])original[key]=p[key].bind(p);
      for(const key of ['addDelivery','deleteStop','clearAllStops']) {
        const originalAction=p[key].bind(p);
        p[key]=(...args)=>{if(this.current&&!this.editable()){alert('Esta rotina não permite alterações no planejamento.');return false;}return originalAction(...args);};
      }
      p.saveDeliveries=()=>{if(!this.current)return original.saveDeliveries();if(!this.applying&&this.editable())this.markDirty();};
      p.renderStopsList=()=>{original.renderStopsList();if(this.current)this.enhanceRows();};
      p.updateMapMarkers=()=>{
        if(!this.current)return original.updateMapMarkers();
        const stops=p.deliveries;
        try {p.deliveries=stops.map(s=>located(s)?s:{...s,lat:null,lon:null});original.updateMapMarkers();} finally {p.deliveries=stops;}
      };
      p.setOrigin=(...args)=>{if(this.current&&!this.editable()){alert('A origem de uma rotina despachada ou somente leitura não pode ser alterada.');return;}return original.setOrigin(...args);};
      p.updateOriginMarker=()=>{original.updateOriginMarker();if(this.current&&!this.applying&&this.editable()){this.current.origin=clone(p.currentOrigin);this.markDirty();}};
      p.openExportModal=()=>this.current?(this.current.route_id?this.share():this.reviewDispatch()):original.openExportModal();
      p.openFinishRotinaModal=()=>{
        if(this.current&&(!this.current.route_id||['finished','cancelled'].includes(this.current.status)||!this.canWrite)){alert('Despache uma rotina ativa para poder finalizá-la.');return;}
        original.openFinishRotinaModal();
      };
      p.confirmFinishRotina=()=>this.current?this.finish():original.confirmFinishRotina();
      p.toggleDeliveryStatus=async id=>{
        if(this.current&&(!this.canWrite||!this.current.route_id||['finished','cancelled'].includes(this.current.status))){alert('Confirme entregas somente após o despacho de uma rotina ativa.');return;}
        await original.toggleDeliveryStatus(id);if(this.current)await this.open(this.current.routine_id,true);
      };
      for(const key of ['optimizeSequence','localOptimize'])p[key]=async()=>{
        if(this.current&&(!this.editable()||p.deliveries.some(s=>!located(s)))){alert('Revise as coordenadas e mantenha a rotina em planejamento para otimizar.');return;}
        return original[key]();
      };
      p.loadArchivedRoute=async id=>{
        if(!await this.ensureSaved())return false;
        const loaded=await original.loadArchivedRoute(id,()=>{
          this.current=null;this.pendingConflict=null;p.routineId=null;p.storageKey='plaswill_deliveries_v1';
          this.$('routine-conflict').hidden=true;
        });
        if(loaded){this.showPlanning();history.replaceState({},'',location.pathname+'?r='+encodeURIComponent(id));}
        return loaded;
      };
      this.legacyExport=original.openExportModal;
    }
    enhanceRows() {
      this.p.deliveries.forEach((s,index)=>{
        const row=document.getElementById('delivery-row-'+s.id);if(!row)return;
        row.querySelector('.table-btn-delete').disabled=!this.editable();
        row.querySelector('.table-btn-status').disabled=!this.canWrite||!this.current.route_id||['finished','cancelled'].includes(this.current.status);
        if(!located(s)) {
          const warning=node('small','Localização a conferir',{class:'routine-warning'});row.cells[3].append(warning);
          for(const link of row.querySelectorAll('a')){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
        }
        if(this.editable()) {
          const box=node('div',null,{class:'routine-row-actions'});
          box.append(button('Editar',()=>this.editDelivery(s)),button('↑',()=>this.move(index,-1),index===0),button('↓',()=>this.move(index,1),index===this.p.deliveries.length-1));
          row.cells[6].append(box);
        }
      });
      this.bar();
    }
    markDirty() {
      if(!this.editable())return;
      document.body.classList.remove('document-print-ready');
      this.dirty=true;this.generation++;this.current.status='draft';this.current.stops=clone(this.p.deliveries);this.current.origin=clone(this.p.currentOrigin);
      try {localStorage.setItem('plaswill_routine_edit_'+this.current.routine_id,JSON.stringify(this.current));this.cacheUnavailable=false;} catch(_){this.cacheUnavailable=true;}
      this.bar();
    }
    showPlanning() {
      this.$('routines-view').hidden=true;this.$('planning-view').hidden=false;this.$('routine-plan-bar').hidden=!this.current;
      this.$('nav-routines').removeAttribute('aria-current');this.$('nav-planning').setAttribute('aria-current','page');
      setTimeout(()=>this.p.map?.invalidateSize(),0);this.bar();
    }
    async back() {
      if(!await this.ensureSaved())return;
      this.$('routines-view').hidden=false;this.$('planning-view').hidden=true;this.$('routine-plan-bar').hidden=true;
      this.$('nav-planning').removeAttribute('aria-current');this.$('nav-routines').setAttribute('aria-current','page');
      this.bar();await this.list();
    }
    async list() {
      this.bar();const seq=this.listSeq=(this.listSeq||0)+1;
      const query=new URLSearchParams(new FormData(this.$('routine-filters')));query.set('page',this.page);
      this.message('Carregando rotinas…');
      try {
        const data=await this.api('api/routine_read.php?'+query);if(seq!==this.listSeq)return;
        this.$('routine-list-body').replaceChildren();
        for(const r of data.results) {
          const row=node('tr',null,{'data-routine-id':r.routine_id});
          const label=node('td',r.name);label.append(node('small',r.routine_id));row.append(label);
          for(const value of [shortDate(r.scheduled_date),r.origin.name||'Origem',r.motorista||'A definir',r.veiculo||'A definir',r.destinations,r.total_stops])row.append(node('td',String(value)));
          const progress=node('td',`${r.delivered_stops} / ${r.total_stops}`);progress.append(node('progress',null,{max:100,value:r.completion_rate,'aria-label':`${r.completion_rate}% concluído`}));row.append(progress);
          const status=node('td',null);status.append(node('span',names[r.status],{class:'routine-pill','data-status':r.status}));row.append(status);
          const actions=node('td',null);actions.append(button(r.editable&&this.canWrite?'Abrir planejamento':'Consultar',()=>this.open(r.routine_id)));
          if(this.canWrite&&r.route_id&&!['finished','cancelled'].includes(r.status))actions.append(button('Finalizar',async()=>{if(await this.open(r.routine_id))this.p.openFinishRotinaModal();}));row.append(actions);this.$('routine-list-body').append(row);
        }
        this.message(`${data.total} rotina(s) encontrada(s).`);this.$('routine-empty').hidden=data.total!==0;
        const filtered=['q','status','from','to'].some(key=>query.get(key));
        this.$('routine-empty').querySelector('h2').textContent=filtered?'Nenhuma rotina neste filtro':'Seu próximo percurso começa aqui';
        this.$('routine-empty').querySelector('p').textContent=filtered?'Ajuste a pesquisa, a situação ou o período para encontrar outras rotinas.':'Crie uma rotina para selecionar clientes e organizar as entregas. Rotas anteriores continuam disponíveis no Histórico.';
        this.$('routine-page').textContent=`Página ${data.page} de ${data.pages}`;
        this.$('routine-prev').disabled=this.page<=1;this.$('routine-next').disabled=this.page>=data.pages;
      } catch(error){if(seq===this.listSeq)this.message(error.message);}
    }
    async open(id,silent=false) {
      if(!silent&&!await this.ensureSaved())return false;
      const seq=this.openSeq=(this.openSeq||0)+1;const editGeneration=this.generation;
      try {
        const {routine}=await this.api('api/routine_read.php?id='+encodeURIComponent(id));if(seq!==this.openSeq)return false;
        if(this.generation!==editGeneration || silent&&(this.dirty||this.current?.routine_id!==id))return false;
        this.apply(routine);
        if(!silent) {
          this.showPlanning();history.replaceState({},'',location.pathname+'?routine='+encodeURIComponent(id));
          let cached=null;try{cached=localStorage.getItem('plaswill_routine_edit_'+id);}catch(_){this.cacheUnavailable=true;}
          if(cached){this.pendingConflict=JSON.parse(cached);this.conflict('Existem alterações locais preservadas. Reaplique após conferir a versão do servidor ou baixe uma cópia.');}
        }
        return true;
      } catch(error){this.message(error.message);if(!silent)alert(error.message);return false;}
    }
    apply(routine) {
      document.body.classList.remove('document-print-ready');
      if(this.current?.routine_id!==routine.routine_id)this.pendingConflict=null;
      this.previewMarker?.remove();this.previewMarker=null;
      this.applying=true;this.current=clone(routine);this.dirty=false;this.pendingSave=null;this.saveError=null;
      this.p.routineId=routine.routine_id;this.p.storageKey='plaswill_routine_draft_'+routine.routine_id;
      this.p.currentRouteId=routine.route_id;this.p.currentShareUrl=this.shareUrls.get(routine.routine_id)||null;
      this.p.currentOrigin=clone(routine.origin);this.p.deliveries=clone(routine.stops);
      this.p.updateOriginMarker();this.p.renderStopsList();this.p.updateMapMarkers();this.applying=false;
      this.$('routine-conflict').hidden=true;this.bar();
    }
    bar() {
      const exportButton=document.querySelector('.btn-export-header');
      const onList=!this.$('routines-view').hidden;
      this.$('routine-new').disabled=!this.canWrite||!!this.operating||!!this.dispatching;
      exportButton.disabled=onList||!!this.current&&(!this.canWrite||['finished','cancelled'].includes(this.current.status));
      const badge=document.getElementById('badge-rotina-active');
      if(onList){badge.textContent='GESTÃO DE ROTINAS';badge.style.color='var(--pw-text-muted)';}
      if(!this.current){
        document.querySelector('.btn-create-delivery').disabled=!this.canWrite||!!this.p.currentRouteId;
        document.querySelector('[onclick*="optimizeSequence"]').disabled=!this.canWrite||!!this.p.currentRouteId;
        document.querySelector('[onclick*="openFinishRotinaModal"]').disabled=!this.canWrite||!this.p.currentRouteId;
        if(!onList){badge.textContent=this.p.currentRouteId?'ROTA ARQUIVADA':'PLANEJAMENTO AVULSO';badge.style.color='var(--pw-text-muted)';}
        return;
      }
      const r=this.current;
      this.$('routine-current-name').textContent=r.name;
      const destinations=new Set(this.p.deliveries.map(s=>['logradouro','numero','complemento','bairro','municipio','uf','cep'].map(k=>String(s[k]||'').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')).join('|'))).size;
      this.$('routine-current-summary').textContent=`${shortDate(r.scheduled_date)} · ${names[r.status]} · ${this.p.deliveries.length} entregas / ${destinations} destinos · ${r.origin.name} · ${r.route_id||'Ainda não despachada'}`;
      this.$('routine-save-status').textContent=this.resolving?'Reaplicando alterações…':this.saving?'Salvando…':this.operating||this.dispatching?'Concluindo operação…':this.saveError|| (this.dirty?(this.cacheUnavailable?'Cache local indisponível — salve no servidor antes de sair.':'Alterações locais — salve para disponibilizar em outros computadores.'):`Salva no servidor · versão ${r.version}`);
      for(const id of ['routine-edit-meta','routine-select-addresses','routine-save','routine-plan','routine-dispatch'])this.$(id).disabled=!this.editable()||!!this.saving||!!this.dispatching||!!this.operating||!!this.resolving;
      const active=!!r.route_id&&!['finished','cancelled'].includes(r.status);
      if(!onList){badge.textContent=names[r.status].toUpperCase();badge.style.color=r.status==='cancelled'?'#fda4af':r.status==='finished'?'#6ee7b7':'var(--pw-yellow)';}
      document.querySelector('[onclick*="openFinishRotinaModal"]').disabled=!active||!this.canWrite;
      document.querySelector('.btn-create-delivery').disabled=!this.editable();
      document.querySelector('[onclick*="optimizeSequence"]').disabled=!this.editable();
      this.$('routine-dispatch').hidden=!!r.route_id||['cancelled','finished'].includes(r.status);
      this.$('routine-share').hidden=!active||!this.canWrite;this.$('routine-finish').hidden=!active||!this.canWrite;
      this.$('routine-reapply').disabled=!!this.resolving||!!this.saving;this.$('routine-reload').disabled=!!this.resolving||!!this.saving;
      for(const id of ['routine-share','routine-finish'])this.$(id).disabled=!!this.operating||!!this.dispatching;
      this.$('routine-cancel').disabled=!this.canWrite||['finished','cancelled'].includes(r.status)||!!this.saving||!!this.operating||!!this.dispatching;
    }
    async metadata(edit) {
      if(!this.canWrite||edit&&!this.editable())return;
      if(!await this.ensureSaved())return;
      this.metaEditing=edit;const r=edit?this.current:{};const origin=r.origin||this.p.currentOrigin||this.p.bases.plaswill;
      const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const form=this.$('routine-meta-form');form.reset();
      const values={name:r.name||'',scheduled_date:r.scheduled_date||today,motorista:r.motorista||'',veiculo:r.veiculo||'',notes:r.notes||'',origin_name:origin.name||'',origin_address:origin.address||'',origin_lat:origin.lat,origin_lon:origin.lon};
      for(const [key,value] of Object.entries(values))form.elements[key].value=value;
      this.$('routine-meta-title').textContent=edit?'Dados da rotina':'Nova Rotina';this.$('routine-meta-error').textContent='';this.$('routine-meta-dialog').showModal();
    }
    async submitMetadata() {
      const form=this.$('routine-meta-form');if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form));const metadata={name:values.name,scheduled_date:values.scheduled_date,motorista:values.motorista,veiculo:values.veiculo,notes:values.notes,
        origin:{id:this.current?.origin.id||'plaswill',name:values.origin_name,address:values.origin_address,lat:Number(values.origin_lat),lon:Number(values.origin_lon)}};
      const submit=form.querySelector('[type="submit"]');submit.disabled=true;
      try {
        if(this.metaEditing){Object.assign(this.current,metadata);this.p.currentOrigin=clone(metadata.origin);this.markDirty();if(!await this.save()){this.$('routine-meta-error').textContent='Não foi possível salvar. Feche esta janela para conferir o conflito no planejamento.';return;}}
        else {
          const key=JSON.stringify(metadata);if(this.pendingCreate?.key!==key)this.pendingCreate={key,id:crypto.randomUUID()};
          const {routine}=await this.api('api/routine_write.php',{action:'create',operation_id:this.pendingCreate.id,...metadata});
          this.pendingCreate=null;this.apply(routine);this.showPlanning();history.replaceState({},'',location.pathname+'?routine='+routine.routine_id);
        }
        this.$('routine-meta-dialog').close();if(!this.metaEditing)await this.catalog();
      } catch(error){this.$('routine-meta-error').textContent=error.message;} finally {submit.disabled=false;}
    }
    async ensureSaved() {
      if(this.resolving||this.dispatching||this.operating||this.p.sharingLegacy||this.p.finishingLegacy)return false;
      while(this.dirty)if(!await this.save())return false;
      return true;
    }
    async save(status) {
      if(!this.current||!this.editable())return !this.dirty;
      if(this.savePromise)return this.savePromise;
      const r=this.current;const generation=this.generation;
      const body={action:'update',routine_id:r.routine_id,expected_version:r.version,name:r.name,scheduled_date:r.scheduled_date,origin:this.p.currentOrigin,motorista:r.motorista,veiculo:r.veiculo,notes:r.notes,stops:clone(this.p.deliveries),status:status||r.status};
      const key=JSON.stringify(body);if(this.pendingSave?.key!==key)this.pendingSave={key,id:crypto.randomUUID()};body.operation_id=this.pendingSave.id;
      this.saving=true;this.saveError=null;this.bar();
      this.savePromise=(async()=>{
        try {
          const {routine}=await this.api('api/routine_write.php',body);this.pendingSave=null;
          if(generation===this.generation){try{localStorage.removeItem('plaswill_routine_edit_'+r.routine_id);}catch(_){}this.pendingConflict=null;this.apply(routine);}
          else {this.current.version=routine.version;this.markDirty();}
          return true;
        } catch(error) {this.markDirty();this.saveError='Não foi possível salvar. Suas alterações locais foram preservadas.';this.pendingConflict=clone({...this.current,stops:this.p.deliveries,origin:this.p.currentOrigin});this.conflict(error.message);return false;}
        finally {this.saving=false;this.savePromise=null;this.bar();}
      })();
      return this.savePromise;
    }
    conflict(text) {this.$('routine-conflict-text').textContent=text;this.$('routine-conflict').hidden=false;}
    async reloadConflict() {
      if(this.dirty){this.pendingConflict=clone({...this.current,stops:this.p.deliveries});try{localStorage.setItem('plaswill_routine_edit_'+this.current.routine_id,JSON.stringify(this.pendingConflict));}catch(_){}}
      const pending=this.pendingConflict;
      const wasDirty=this.dirty;this.dirty=false;
      if(!await this.open(this.current.routine_id,true)){this.dirty=wasDirty||this.dirty;return;}this.pendingConflict=pending;
      this.conflict('Versão atual do servidor carregada. A cópia local continua preservada para reaplicar ou baixar.');
    }
    async reapply() {
      const pending=this.pendingConflict;if(!pending||this.resolving||this.saving)return;
      if(!confirm('Substituir o planejamento atual do servidor pelas suas alterações preservadas? Confira os dados antes de confirmar.'))return;
      this.resolving=true;this.bar();const generation=this.generation;
      try {
        const {routine}=await this.api('api/routine_read.php?id='+this.current.routine_id);
        if(!routine.editable){this.conflict('A rotina já foi despachada ou encerrada. A cópia local foi preservada; baixe-a para revisão.');return;}
        if(generation!==this.generation){this.conflict('Houve novas alterações locais durante a consulta. Confira a cópia antes de reaplicar.');return;}
        this.apply({...pending,version:routine.version,editable:true,status:'draft'});this.markDirty();await this.save();
      } catch(error){this.conflict(error.message);}
      finally{this.resolving=false;this.bar();}
    }
    download() {
      const data=this.pendingConflict||{...this.current,stops:this.p.deliveries};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const link=node('a',null,{href:url,download:`planejamento-${this.current.routine_id}.json`});link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    async catalog() {
      if(!this.editable())return;
      const id=this.current.routine_id;
      if(this.catalogRoutineId!==id){this.$('catalog-filters').reset();this.catalogPage=1;this.catalogData=null;this.overrides=new Map();this.catalogRoutineId=id;}
      if(!this.selections.has(id))this.selections.set(id,new Map());this.selected=this.selections.get(id);
      this.selectionSummary();if(!this.$('routine-catalog-dialog').open)this.$('routine-catalog-dialog').showModal();await this.loadCatalog();
    }
    async loadCatalog() {
      this.catalogAbort?.abort();this.catalogAbort=new AbortController();const seq=this.catalogSeq=(this.catalogSeq||0)+1;
      const query=new URLSearchParams(new FormData(this.$('catalog-filters')));query.set('mode','catalog');query.set('page',this.catalogPage);query.set('per_page','20');
      this.$('catalog-feedback').textContent='Pesquisando na base cadastrada…';this.$('catalog-body').setAttribute('aria-busy','true');
      try {
        const data=await this.api('api/search_company.php?'+query,null,{signal:this.catalogAbort.signal});if(seq!==this.catalogSeq)return;
        this.catalogData=data;this.catalogApplied=query.toString();const form=this.$('catalog-filters');
        for(const [field,values] of [['city',data.facets.cities],['district',data.facets.districts]]){
          const input=form.elements[field],selected=input.value;input.replaceChildren(node('option','Todos',{value:''}));for(const value of values)input.append(node('option',value,{value}));input.value=values.includes(selected)?selected:'';
        }
        this.renderCatalog();this.$('catalog-feedback').textContent=data.total?`${data.total} endereço(s) encontrado(s).`:'Nenhum endereço encontrado. Ajuste a pesquisa ou use inclusão manual no planejamento.';
        this.$('catalog-page').textContent=`Página ${data.page} de ${data.pages}`;this.$('catalog-prev').disabled=this.catalogPage<=1;this.$('catalog-next').disabled=this.catalogPage>=data.pages;
      } catch(error){if(error.name!=='AbortError'&&seq===this.catalogSeq)this.$('catalog-feedback').textContent=error.message;}
      finally {if(seq===this.catalogSeq)this.$('catalog-body').removeAttribute('aria-busy');}
    }
    renderCatalog() {
      const body=this.$('catalog-body');body.replaceChildren();
      for(const record of this.catalogData?.results||[]) {
        const s=this.selected.get(record.id)||this.overrides.get(record.id)||record;
        const row=node('tr');const box=node('input',null,{type:'checkbox','aria-label':`Selecionar ${s.nome||s.destinatario}`,'data-address-id':record.id});box.checked=this.selected.has(record.id);
        box.addEventListener('change',()=>{if(box.checked)this.selected.set(record.id,clone(s));else this.selected.delete(record.id);this.selectionSummary();});const cell=node('td',null);cell.append(box);row.append(cell);
        const title=node('td',s.nome||s.destinatario);if(s.fantasia)title.append(node('small',s.fantasia));if(s.codigo_sge)title.append(node('small','Código '+s.codigo_sge));row.append(title);
        row.append(node('td',[s.logradouro,s.numero,s.complemento,s.cep].filter(Boolean).join(', ')),node('td',[s.bairro,s.municipio].filter(Boolean).join(' / ')),node('td',located(s)?'Disponível':'A conferir',{class:located(s)?'':'routine-warning'}));
        const actions=node('td',null,{class:'routine-row-actions'});actions.append(button('Ver no mapa',()=>this.preview(s),!located(s)),button('Conferir',()=>this.editCatalog(s,record.id)));row.append(actions);body.append(row);
      }
    }
    selectionSummary() {
      this.$('catalog-selected-count').textContent=`${this.selected?.size||0} endereço(s) selecionado(s)`;this.$('catalog-confirm').disabled=!this.selected?.size;
      const list=this.$('catalog-selected-list');list.replaceChildren();
      for(const [id,s] of this.selected||[]) {const li=node('li',s.nome||s.destinatario);li.append(button('Remover',()=>{this.selected.delete(id);this.selectionSummary();this.renderCatalog();}));list.append(li);}
    }
    includeSelected() {
      if(!this.editable()||!this.selected?.size)return;
      if(this.p.deliveries.length+this.selected.size>500){this.$('catalog-feedback').textContent='O limite é de 500 entregas por rotina. Reduza a seleção.';return;}
      const duplicates=[...this.selected.values()].filter(s=>this.p.deliveries.some(d=>d.client_id===s.client_id&&d.address_id===s.address_id&&!d.numero_nota));
      if(duplicates.length&&!confirm(`${duplicates.length} endereço(s) já têm entrega sem nota nesta rotina. Criar entregas adicionais para os selecionados?`))return;
      for(const item of this.selected.values())this.p.deliveries.push(this.toStop(item));
      this.selected.clear();this.selectionSummary();this.markDirty();this.p.renderStopsList();this.p.updateMapMarkers();this.$('routine-catalog-dialog').close();
      this.save();
    }
    toStop(item) {
      return {id:'del_'+crypto.randomUUID(),client_id:item.client_id||'',address_id:item.address_id||item.id||'',destinatario:item.destinatario||item.nome||item.fantasia||'',nome_fantasia:item.nome_fantasia||item.fantasia||item.nome||'',
        logradouro:item.logradouro||'',numero:item.numero||'',complemento:item.complemento||'',bairro:item.bairro||'',municipio:item.municipio||'',uf:item.uf||'',cep:item.cep||'',
        endereco_completo:[item.logradouro,item.numero,item.bairro,item.municipio,item.uf].filter(Boolean).join(', '),numero_nota:item.numero_nota||'',itens_resumo:item.itens_resumo||'',observacoes:item.observacoes||'',
        ...(item.volumes!==undefined?{volumes:item.volumes}:{}),lat:located(item)?Number(item.lat):null,lon:located(item)?Number(item.lon):null,geocoded_by:located(item)?(item.geocoded_by||'local_db'):'unresolved',status:'pending',created_at:new Date().toISOString()};
    }
    preview(s) {
      if(!located(s))return;
      this.$('routine-catalog-dialog').close();this.showPlanning();
      if(this.p.map){this.previewMarker?.remove();this.previewMarker=L.circleMarker([s.lat,s.lon],{radius:9,color:'#FFF212'}).addTo(this.p.map).bindPopup(node('div',s.nome||s.destinatario));this.p.map.setView([s.lat,s.lon],16);this.previewMarker.openPopup();}
    }
    editCatalog(item,key) {this.editDelivery(this.toStop(item),stop=>{const updated={...item,...stop,id:key};this.overrides.set(key,updated);if(this.selected.has(key))this.selected.set(key,updated);this.renderCatalog();this.selectionSummary();});}
    editDelivery(stop,callback) {
      if(!this.editable())return;
      this.editingStop=clone(stop);this.deliveryCallback=callback;const form=this.$('routine-delivery-form');form.reset();
      for(const field of form.elements)if(field.name&&field.name!=='verified')field.value=stop[field.name]??'';
      form.elements.verified.checked=located(stop);this.$('routine-delivery-error').textContent='';this.$('routine-delivery-dialog').showModal();
    }
    submitDelivery() {
      const form=this.$('routine-delivery-form');if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form));let lat=null,lon=null;
      if((values.lat==='')!==(values.lon==='')){this.$('routine-delivery-error').textContent='Informe latitude e longitude juntas.';return;}
      if(values.lat!==''&&values.lon!==''){lat=Number(values.lat);lon=Number(values.lon);}
      const updated={...this.editingStop,...values,lat,lon,geocoded_by:values.verified==='on'&&lat!==null?'manual_verified':'unresolved',status:'pending'};delete updated.verified;
      if(values.volumes==='')delete updated.volumes;else updated.volumes=Number(values.volumes);
      updated.endereco_completo=[updated.logradouro,updated.numero,updated.bairro,updated.municipio,updated.uf].filter(Boolean).join(', ');
      if(this.deliveryCallback)this.deliveryCallback(updated);
      else {this.p.deliveries=this.p.deliveries.map(s=>s.id===updated.id?updated:s);this.markDirty();this.p.renderStopsList();this.p.updateMapMarkers();}
      this.$('routine-delivery-dialog').close();
    }
    async geocode() {
      const form=this.$('routine-delivery-form'),btn=this.$('routine-geocode');btn.disabled=true;
      try {
        const query=new URLSearchParams({q:[form.elements.logradouro.value,form.elements.numero.value,form.elements.bairro.value].filter(Boolean).join(', '),cidade:form.elements.municipio.value,uf:form.elements.uf.value});
        const result=await this.api('api/geocode.php?'+query);
        if(!result.success)throw new Error('Endereço não localizado. Confira manualmente; nenhuma posição foi inventada.');
        form.elements.lat.value=result.lat;form.elements.lon.value=result.lon;form.elements.verified.checked=true;this.$('routine-delivery-error').textContent='Coordenadas encontradas. Confira o endereço antes de aplicar.';
      } catch(error){this.$('routine-delivery-error').textContent=error.message;}finally{btn.disabled=false;}
    }
    move(index,delta) {
      if(!this.editable())return;const stops=this.p.deliveries;[stops[index],stops[index+delta]]=[stops[index+delta],stops[index]];this.markDirty();this.p.renderStopsList();this.p.updateMapMarkers();
    }
    async reviewDispatch() {
      if(!this.editable()||this.dispatching)return;
      if(!await this.ensureSaved())return;
      if(this.dirty)return;
      const r=this.current,review=this.$('routine-dispatch-review');review.replaceChildren();
      for(const text of [`Data: ${shortDate(r.scheduled_date)}`,`Origem: ${r.origin.name}`,`Motorista: ${r.motorista||'Não definido'}`,`Veículo: ${r.veiculo||'Não definido'}`,`${r.total_stops} entregas · ${r.destinations} destinos`])review.append(node('p',text));
      const invalid=r.stops.filter(s=>!located(s)),incomplete=r.stops.filter(s=>!s.destinatario||!s.logradouro||!s.municipio||!s.uf);
      review.append(node('p',`${invalid.length} sem coordenadas confiáveis · ${incomplete.length} endereços incompletos`,{class:invalid.length||incomplete.length?'routine-warning':''}));
      const order=node('ol',null);for(const s of r.stops)order.append(node('li',`${s.destinatario} — ${s.logradouro||'Endereço a conferir'}, ${s.numero||''}`));review.append(order);
      this.$('routine-dispatch-confirm').disabled=!r.stops.length||!!invalid.length||!!incomplete.length;this.$('routine-dispatch-error').textContent='';this.$('routine-dispatch-dialog').showModal();
    }
    async dispatch() {
      if(this.dispatching||this.operating||!this.editable())return;this.dispatching=true;this.$('routine-dispatch-confirm').disabled=true;this.bar();
      try {
        const result=await this.api('api/routine_write.php',{action:'dispatch',routine_id:this.current.routine_id,expected_version:this.current.version});
        if(result.route_id!==result.routine.route_id)throw new Error('O servidor não confirmou a associação do despacho.');
        if(result.share_url)confirmedShareUrl(result.share_url,result.route_id);
        this.apply(result.routine);this.$('routine-dispatch-dialog').close();
        if(result.share_url){this.shareUrls.set(this.current.routine_id,result.share_url);this.p.presentShareUrl(result.share_url);}
        else this.conflict('Despacho já confirmado. A rota foi preservada; use Compartilhar para reemitir o acesso, se necessário.');
      } catch(error){this.$('routine-dispatch-error').textContent=error.message;this.$('routine-dispatch-confirm').disabled=false;}
      finally{this.dispatching=false;this.bar();}
    }
    async share() {
      if(this.operating||this.dispatching||!this.canWrite||!this.current?.route_id||['finished','cancelled'].includes(this.current.status))return;
      const current=this.current;let url=this.shareUrls.get(current.routine_id);this.operating=true;this.bar();
      try {
        if(!url){if(!confirm('Emitir um novo link para esta rotina? O acesso anterior do motorista será revogado.'))return;
          const result=await this.api('api/issue_route_access.php',{route_id:current.route_id});url=confirmedShareUrl(result.share_url,current.route_id);this.shareUrls.set(current.routine_id,url);}
        confirmedShareUrl(url,current.route_id);this.p.currentRouteId=current.route_id;this.p.presentShareUrl(url);
      } catch(error){this.conflict(error.message);}finally{this.operating=false;this.bar();}
    }
    async finish() {
      if(this.operating||this.dispatching||!this.canWrite||!this.current?.route_id)return;
      const current=this.current;this.operating=true;this.bar();
      try {await this.api('api/finish_route.php',{route_id:current.route_id,observacoes:document.getElementById('finish-notes')?.value||''});this.p.closeModal('modal-finish-rotina');await this.open(current.routine_id,true);}catch(error){this.conflict(error.message);}finally{this.operating=false;this.bar();}
    }
    async cancel() {
      if(!this.canWrite||!this.current||['finished','cancelled'].includes(this.current.status))return;
      if(!await this.ensureSaved())return;
      const reason=prompt('Motivo do cancelamento. Se já despachada, o acesso do motorista será revogado e as entregas realizadas serão preservadas.');if(reason===null)return;
      if(!confirm('Confirmar cancelamento desta rotina, sem excluir seus dados?'))return;
      this.operating=true;this.bar();
      try {const {routine}=await this.api('api/routine_write.php',{action:'cancel',routine_id:this.current.routine_id,expected_version:this.current.version,reason});this.apply(routine);}catch(error){this.conflict(error.message);}finally{this.operating=false;this.bar();}
    }
    async poll() {
      if(document.hidden||this.dirty||this.saving||this.dispatching||this.operating||this.resolving||this.pendingConflict||document.querySelector('dialog[open]'))return;
      if(!this.$('routines-view').hidden)await this.list();
      else if(this.current?.route_id)await this.open(this.current.routine_id,true);
    }
  }
  window.RoutineManager=RoutineManager;
  document.addEventListener('DOMContentLoaded',()=>{window.routineManager=new RoutineManager(window.planner);});
})();
