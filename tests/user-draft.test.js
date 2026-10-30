const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setupPlannerEnv() {
  const ids = [
    'form-destinatario', 'form-logradouro', 'form-numero', 'form-bairro', 'form-cidade',
    'form-uf', 'form-nfe', 'form-itens', 'form-lat', 'form-lon', 'form-complemento',
    'form-volumes', 'form-observacoes', 'manual-client-search', 'manual-suggestions-box',
    'danfe-res-destinatario', 'danfe-res-logradouro', 'danfe-res-numero', 'danfe-res-bairro',
    'danfe-res-nf', 'danfe-res-itens', 'danfe-res-cidade', 'danfe-res-uf',
    'danfe-res-complemento', 'danfe-res-volumes', 'danfe-res-observacoes', 'manual-source-note',
    'local-storage-feedback', 'badge-rotina-active', 'corporate-session-status'
  ];
  const elements = Object.fromEntries(ids.map(id => [id, {
    value: '', style: {}, innerHTML: '', textContent: '', append() {}, addEventListener() {}
  }]));
  elements['form-manual-delivery'] = {
    reset() { for (const e of Object.values(elements)) if ('value' in e) e.value = ''; },
    querySelector() { return { disabled: false }; }
  };
  const localStorageStore = new Map();
  const localStorage = {
    getItem: k => localStorageStore.get(k) || null,
    setItem: (k, v) => localStorageStore.set(k, String(v)),
    removeItem: k => localStorageStore.delete(k)
  };
  const context = {
    window: {},
    document: {
      body: { classList: { remove() {}, add() {} } },
      addEventListener() {},
      getElementById: id => elements[id] || { style: {}, value: '', append() {}, addEventListener() {} },
      querySelector() { return null; }
    },
    localStorage,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Number,
    crypto: require('node:crypto').webcrypto,
    alert() {},
    confirm: () => true,
    AbortController
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('app.js', 'utf8') + '\nglobalThis.Planner = DeliveryPlanner;', context);
  const p = Object.create(context.Planner.prototype);
  p.deliveries = [];
  p.storageKey = 'plaswill_deliveries_v1';
  p.currentRouteId = null;
  p.currentOrigin = { name: 'Plaswill Indústria', lat: -28.2745, lon: -53.5182 };
  p.renderStopsList = () => {};
  p.updateMapMarkers = () => {};
  p.updateOriginMarker = () => {};
  p.showLocalStorageState = () => {};
  p.closeModal = () => {};
  p.clearShareUrl = () => {};
  return { p, e: elements, c: context, ls: localStorageStore };
}

test('initUserDraft restores draft from server when local deliveries are empty', async () => {
  const { p, c } = setupPlannerEnv();
  const mockStops = [
    { id: 'stop-1', destinatario: 'Cliente A', logradouro: 'Rua 1', lat: -28.2, lon: -53.5, status: 'pending' },
    { id: 'stop-2', destinatario: 'Cliente B', logradouro: 'Rua 2', lat: -28.3, lon: -53.6, status: 'pending' }
  ];
  c.window.entregasFetch = async (url) => {
    if (url === 'api/user_draft_read.php') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          actor: 'lucas',
          draft: {
            actor: 'lucas',
            stops: mockStops,
            origin: { name: 'Plaswill Indústria', lat: -28.2745, lon: -53.5182 },
            active_route_id: null
          }
        })
      };
    }
    return { ok: false };
  };

  await p.initUserDraft();
  assert.equal(p.canSyncDraft, true);
  assert.equal(p.deliveries.length, 2);
  assert.equal(p.deliveries[0].destinatario, 'Cliente A');
  assert.equal(p.deliveries[1].destinatario, 'Cliente B');
});

test('saveDeliveries triggers debounced user draft write to server', async () => {
  const { p, c } = setupPlannerEnv();
  let draftSaved = null;
  c.window.entregasFetch = async (url, opts) => {
    if (url === 'api/user_draft_write.php' && opts?.method === 'POST') {
      draftSaved = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, json: async () => ({ success: true }) };
  };
  p.canSyncDraft = true;
  p.deliveries = [
    { id: 'stop-new', destinatario: 'Novo Destino', logradouro: 'Rua Nova', lat: -28.2, lon: -53.5, status: 'pending' }
  ];

  p.saveDeliveries();
  // Before debounce (600ms) expires, draftSaved should be null
  assert.equal(draftSaved, null);

  // Wait 700ms for debounce
  await new Promise(r => setTimeout(r, 700));
  assert.notEqual(draftSaved, null);
  assert.equal(draftSaved.action, 'save');
  assert.equal(draftSaved.stops.length, 1);
  assert.equal(draftSaved.stops[0].destinatario, 'Novo Destino');
});

test('clearServerDraft sends clear action to server', async () => {
  const { p, c } = setupPlannerEnv();
  let clearSent = false;
  c.window.entregasFetch = async (url, opts) => {
    if (url === 'api/user_draft_write.php' && opts?.method === 'POST') {
      const body = JSON.parse(opts.body);
      if (body.action === 'clear') clearSent = true;
      return { ok: true, json: async () => ({ success: true, cleared: true }) };
    }
    return { ok: true };
  };
  p.canSyncDraft = true;
  await p.clearServerDraft();
  assert.equal(clearSent, true);
});
