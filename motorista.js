/**
 * Plaswill Entregas • Visão Exclusiva do Motorista (Mobile)
 * Alta Performance, Zero Dependências Pesadas, Ergonomia para o Trânsito
 */

// Ícones oficiais vetoriais Waze e Google Maps
const ICON_WAZE_SVG = (size = 18) => `
<svg width="${size}" height="${size}" viewBox="0 0 122.71 122.88" fill="none" style="vertical-align: middle; flex-shrink: 0;" aria-hidden="true">
  <path fill="#ffffff" d="M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07 C104.27,17.76,90.77,8.19,72.3,6.22c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44 c-0.09,3.28,0,6.66,0,9.94C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
  <path fill="#070D18" d="M54.95,110.49c-1.03,4.69-3.56,8.16-7.69,10.31c-5.25,2.72-10.6,2.63-15.57-0.56c-5.16-3.28-7.41-8.25-7.03-14.35 c0.09-1.03-0.19-1.41-1.03-1.88c-9.1-4.78-16.31-11.44-21.28-20.44c-0.94-1.78-1.69-3.66-2.16-5.63c-0.66-2.72,0.38-4.03,3.19-4.31 c3.38-0.38,6.38-1.69,7.88-4.88c0.66-1.41,1.03-3.09,1.03-4.69c0.19-4.03,0-8.06,0.19-12.1c1.03-15.57,7.5-28.5,19.32-38.63 C42.67,3.97,55.42-0.43,69.76,0.03c25.04,0.94,46.51,18.57,51.57,43.23c4.59,22.32-2.34,40.98-20.07,55.51 c-1.03,0.84-2.16,1.69-3.38,2.44c-0.66,0.47-0.84,0.84-0.56,1.59c2.34,7.13-0.94,15-7.5,18.38c-8.91,4.41-19.22-0.09-21.94-9.66 c-0.09-0.38-0.56-0.84-0.84-0.84C63.11,110.4,59.07,110.49,54.95,110.49L54.95,110.49z M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09 c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07C104.27,17.76,90.77,8.19,72.3,6.22 c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44c-0.09,3.28,0,6.66,0,9.94 C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
  <path fill="#070D18" d="M74.92,79.74c-11.07-0.56-18.38-4.97-23.07-13.78c-1.13-2.16-0.09-4.31,2.06-4.78c1.31-0.28,2.53,0.66,3.47,2.16 c1.22,1.88,2.44,3.75,4.03,5.25c8.81,8.34,23.25,5.72,28.79-5.06c0.66-1.31,1.5-2.34,3.09-2.34c2.34,0.09,3.66,2.44,2.63,4.59 c-2.91,5.91-7.5,10.22-13.69,12.28C79.51,78.99,76.7,79.36,74.92,79.74L74.92,79.74z"/>
  <path fill="#070D18" d="M55.32,48.98c-3.38,0-6.09-2.72-6.09-6.09s2.72-6.09,6.09-6.09s6.09,2.72,6.09,6.09C61.42,46.17,58.7,48.98,55.32,48.98 L55.32,48.98z"/>
  <path fill="#070D18" d="M98.27,42.79c0,3.38-2.72,6.09-6,6.19c-3.38,0-6.09-2.63-6.09-6.09c0-3.38,2.63-6.09,6-6.19 C95.46,36.7,98.17,39.42,98.27,42.79L98.27,42.79z"/>
</svg>`;

const ICON_MAPS_SVG = (size = 18) => `
<svg width="${size}" height="${size}" viewBox="0 0 92.3 132.3" style="vertical-align: middle; flex-shrink: 0;" aria-hidden="true">
  <path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/>
  <path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/>
  <path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/>
  <path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/>
  <path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/>
</svg>`;

class DriverApp {
  constructor() {
    this.routeId = null;
    this.routeData = null;
    this.currentFilter = 'all';
    this.storageKeyPrefix = 'plaswill_driver_route_';

    this.init();
  }

  async init() {
    this.bindEvents();

    const params = new URLSearchParams(window.location.search);
    this.routeId = params.get('r') || params.get('id');

    if (!this.routeId) {
      // Tenta recuperar última rota acessada no dispositivo
      const lastRoute = localStorage.getItem('plaswill_last_driver_route');
      if (lastRoute) {
        this.routeId = lastRoute;
        window.history.replaceState({}, '', `motorista.html?r=${this.routeId}`);
      }
    }

    if (!this.routeId) {
      this.showError('Nenhuma rota informada na URL. Solicite o link ou escaneie o QR Code gerado pela expedição.');
      return;
    }

    if (!/^ROT-[A-Z0-9]{4}$/.test(this.routeId)) { this.showError('Código de rota inválido.'); return; }
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (token && /^[a-f0-9]{64}$/.test(token)) localStorage.setItem('plaswill_token_' + this.routeId, token);
    history.replaceState({}, '', location.pathname + '?r=' + encodeURIComponent(this.routeId));
    this.outbox = new DeliveryOutbox(localStorage, this.routeId, e => this.apiFetch('api/update_route_status.php', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(e)
    }));
    if (token) {
      this.outbox.items.forEach(e => { if (e.state === 'unauthorized') e.state = 'pending'; });
      this.outbox.persist();
    }
    this.installSync();
    localStorage.setItem('plaswill_last_driver_route', this.routeId);
    document.getElementById('topbar-route-id').textContent = this.routeId;

    await this.loadRoute();
  }

  bindEvents() {
    // Botão de Atualizar Rota
    const btnRefresh = document.getElementById('btn-refresh-route');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        btnRefresh.style.transform = 'rotate(180deg)';
        setTimeout(() => { btnRefresh.style.transform = ''; }, 350);
        this.loadRoute(true);
      });
    }

    // Botão Ir para Próxima Entrega
    const btnNext = document.getElementById('btn-jump-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.jumpToNextPending();
      });
    }

    // Abas de Filtro Segmentado
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFilter = tab.getAttribute('data-filter') || 'all';
        this.applyFilter();
      });
    });
  }

  async loadRoute(isUserRefresh = false) {
    const loadingEl = document.getElementById('driver-loading');
    const errorEl = document.getElementById('driver-error');
    const progressPanel = document.getElementById('driver-progress-panel');

    if (!isUserRefresh) {
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
    }

    try {
      const response = await this.apiFetch(`api/get_route.php?r=${encodeURIComponent(this.routeId)}`);
      const data = await response.json();
      if (!response.ok) { const err = new Error(data.error); err.status = response.status; throw err; }

      loadingEl.style.display = 'none';

      if (response.ok && data.success && data.route) {
        this.routeData = data.route;

        // Sincroniza eventuais baixas salvas localmente offline
        this.mergeOfflineState();

        this.renderRoute();
        progressPanel.style.display = 'block';
        errorEl.style.display = 'none';
      } else {
        throw new Error(data.error || 'Rota não encontrada.');
      }
    } catch (err) {
      loadingEl.style.display = 'none';

      // Fallback: se estiver offline no meio da entrega, tenta carregar do cache local
      if (err.status === 401 || err.status === 403) { this.showError('Acesso expirado ou revogado. Solicite novo link.'); return; }
      const cached = localStorage.getItem(this.storageKeyPrefix + this.routeId);
      if (cached) {
        this.routeData = JSON.parse(cached);
        this.renderRoute();
        progressPanel.style.display = 'block';
      } else {
        this.showError(err.message);
      }
    }
  }

  apiFetch(url, options = {}) {
    const token = localStorage.getItem('plaswill_token_' + this.routeId);
    return fetch(url, {...options, cache: 'no-store', signal: AbortSignal.timeout(12000),
      headers: {...options.headers, ...(token ? {Authorization: 'Bearer ' + token} : {})}});
  }

  installSync() {
    const status = document.createElement('p'); status.id = 'sync-status'; status.setAttribute('role', 'status');
    const retry = document.createElement('button'); retry.textContent = 'Atualizar sincronização';
    retry.addEventListener('click', () => this.outbox.items.some(e => e.state === 'conflict') ? this.resolveConflict() : this.sync(true));
    const host = document.getElementById('driver-progress-panel'); host.append(status, retry);
    window.addEventListener('online', () => this.sync());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sync(); });
    setInterval(() => { if (!document.hidden) this.sync(); }, 15000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    this.sync();
  }

  async sync(force = false) {
    await this.outbox.flush(force);
    this.showSyncStatus();
    if (!this.outbox.items.length) await this.loadRoute(true);
  }

  async resolveConflict() {
    if (this.outbox.running) return;
    if (!confirm('Recarregar a versão do servidor e reenviar suas alterações locais sobre ela? Isso pode substituir alterações feitas em outro aparelho.')) return;
    try {
      const response = await this.apiFetch(`api/get_route.php?r=${encodeURIComponent(this.routeId)}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error('Falha ao atualizar rota.');
      if (data.route.status === 'finished') throw new Error('Rota encerrada. Alterações locais foram preservadas para revisão da expedição.');
      const states = new Map(data.route.stops.map(s => [s.id, {status:s.status,version:s.version || 0}]));
      const items = this.outbox.items.map(e => {
        const stop = states.get(e.stop_id);
        if (!stop) throw new Error('Parada indisponível. Solicite revisão da expedição.');
        const next = {...e, operation_id:crypto.randomUUID(),expected_version:stop.version,
          previous_status:stop.status,state:'pending'};
        if (stop.status !== e.status) stop.version++;
        stop.status = e.status;
        return next;
      });
      // Persist the whole replacement before modifying the visible state.
      this.outbox.storage.setItem(this.outbox.key, JSON.stringify(items));
      this.outbox.items = items; this.routeData = data.route;
      this.mergeOfflineState(); this.renderRoute(); await this.sync(true);
    } catch (err) { alert(err.message); }
  }

  showSyncStatus() {
    const items = this.outbox?.items || [];
    const el = document.getElementById('sync-status');
    if (el) el.textContent = items.some(e => e.state === 'conflict') ?
      'Conflito: alterações preservadas no aparelho. Atualize a rota e solicite revisão da expedição.' :
      items.some(e => e.state === 'unauthorized') ? 'Acesso recusado: solicite novo link. Alterações preservadas.' :
      items.length ? `${items.length} alteração(ões) no aparelho aguardando confirmação do servidor.` :
      'Sem alterações aguardando envio. Consulte Atualizar para confirmar o estado do servidor.';
  }

  mergeOfflineState() {
    this.outbox?.overlay(this.routeData);
    this.showSyncStatus();
  }

  saveLocalCache() {
    if (this.routeData && this.routeId) {
      localStorage.setItem(this.storageKeyPrefix + this.routeId, JSON.stringify(this.routeData));
    }
  }

  showError(message) {
    const errorEl = document.getElementById('driver-error');
    const errorText = document.getElementById('error-message-text');
    const loadingEl = document.getElementById('driver-loading');
    const progressPanel = document.getElementById('driver-progress-panel');

    loadingEl.style.display = 'none';
    progressPanel.style.display = 'none';
    if (errorText) errorText.textContent = message;
    if (errorEl) errorEl.style.display = 'block';
  }

  renderRoute() {
    if (!this.routeData || !this.routeData.stops) return;

    this.saveLocalCache();

    // Metadados
    const originNameEl = document.getElementById('route-origin-name');
    if (originNameEl) {
      originNameEl.textContent = this.routeData.origin?.name || 'Plaswill Indústria (Fábrica)';
    }

    const dateBadge = document.getElementById('route-date-badge');
    if (dateBadge) {
      dateBadge.textContent = this.routeData.data_formatada || 'Hoje';
    }

    this.updateProgress();
    this.renderStopsList();
  }

  updateProgress() {
    const stops = this.routeData?.stops || [];
    const total = stops.length;
    const delivered = stops.filter(s => s.status === 'delivered').length;
    const pending = total - delivered;
    const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

    // Números e Barra
    document.getElementById('count-delivered').textContent = delivered;
    document.getElementById('count-total').textContent = total;
    document.getElementById('progress-percentage').textContent = `${pct}%`;
    document.getElementById('progress-fill-bar').style.width = `${pct}%`;

    // Filtros
    document.getElementById('pill-count-all').textContent = total;
    document.getElementById('pill-count-pending').textContent = pending;
    document.getElementById('pill-count-delivered').textContent = delivered;

    // Banner de todas concluídas
    const allDoneBanner = document.getElementById('all-completed-banner');
    const btnNext = document.getElementById('btn-jump-next');

    if (total > 0 && delivered === total) {
      if (allDoneBanner) allDoneBanner.style.display = 'flex';
      if (btnNext) btnNext.style.display = 'none';
    } else {
      if (allDoneBanner) allDoneBanner.style.display = 'none';
      if (btnNext) btnNext.style.display = pending > 0 ? 'flex' : 'none';
    }
  }

  renderStopsList() {
    const container = document.getElementById('stops-cards-container');
    if (!container) return;

    container.innerHTML = '';
    const stops = this.routeData.stops || [];

    stops.forEach((stop, index) => {
      const stopNum = index + 1;
      const isDelivered = stop.status === 'delivered';
      const lat = parseFloat(stop.lat);
      const lon = parseFloat(stop.lon);

      const wazeUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

      const card = document.createElement('article');
      card.className = `stop-card ${isDelivered ? 'is-delivered' : ''}`;
      card.id = `stop-card-${stop.id}`;
      card.setAttribute('data-status', stop.status);

      card.innerHTML = `
        <div class="stop-card-header">
          <div class="stop-badge-circle" id="badge-circle-${this.escapeHtml(stop.id)}">
            ${isDelivered ? `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : stopNum}
          </div>
          <div class="stop-client-info">
            <h3 class="stop-client-title">${this.escapeHtml(stop.destinatario || stop.nome_fantasia || 'Cliente')}</h3>
            <span class="stop-status-pill ${isDelivered ? 'delivered' : 'pending'}" id="status-pill-${this.escapeHtml(stop.id)}">
              ${isDelivered ? `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Concluído</span>
              ` : `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Pendente</span>
              `}
            </span>
          </div>
        </div>

        <div class="stop-address-box">
          <div class="address-pin-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1-18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div class="address-text-lines">
            <div class="address-street">
              ${this.escapeHtml(stop.logradouro || stop.endereco_completo || 'Endereço não informado')}${stop.numero ? ', ' + this.escapeHtml(stop.numero) : ''}
            </div>
            <div class="address-neighborhood">
              ${this.escapeHtml(stop.bairro || '')}${stop.municipio ? (stop.bairro ? ' • ' : '') + this.escapeHtml(stop.municipio) : ''}
            </div>
          </div>
        </div>

        <div class="stop-meta-chips">
          ${stop.numero_nota ? `
            <span class="meta-chip chip-nfe">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              NF ${this.escapeHtml(stop.numero_nota)}
            </span>
          ` : ''}
          <span class="meta-chip chip-items">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            ${this.escapeHtml(stop.itens_resumo || (stop.volumes != null ? `${stop.volumes} ${stop.volumes === 1 ? 'volume' : 'volumes'}` : '1 volume'))}
          </span>
        </div>

        <!-- Botões de Navegação Direta -->
        <div class="stop-actions-grid">
          <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" class="btn-nav-touch btn-nav-waze" title="Abrir navegação GPS no Waze">
            ${ICON_WAZE_SVG(22)}
            <span>Waze</span>
          </a>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-nav-touch btn-nav-maps" title="Abrir no Google Maps">
            ${ICON_MAPS_SVG(20)}
            <span>Google Maps</span>
          </a>
        </div>

        <!-- Botão Marcar como Concluído / Dar Baixa -->
        <button type="button"
                class="btn-toggle-delivered ${isDelivered ? 'delivered-action' : 'pending-action'}"
                id="btn-status-${this.escapeHtml(stop.id)}"
                >
          ${isDelivered ? `
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Entrega Concluída • Desfazer</span>
          ` : `
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Marcar como Concluído</span>
          `}
        </button>
      `;

      card.querySelector('.btn-toggle-delivered').addEventListener('click', () => this.toggleDeliveryStatus(stop.id, stopNum));
      container.appendChild(card);
    });

    this.applyFilter();
  }

  async toggleDeliveryStatus(stopId, stopNum) {
    if (!this.routeData || !this.routeData.stops) return;

    const stop = this.routeData.stops.find(s => s.id === stopId);
    if (!stop) return;

    // Vibração tátil no celular se suportado
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    const newStatus = stop.status === 'delivered' ? 'pending' : 'delivered';
    if (this.routeData.status === 'finished') { alert('Rota encerrada.'); return; }
    if (this.outbox.items.some(e => ['conflict', 'unauthorized'].includes(e.state))) { alert('Resolva a sincronização antes de registrar novas alterações.'); return; }
    try { this.outbox.enqueue(stop, newStatus); }
    catch (_) { alert('Não foi possível salvar no aparelho. A entrega não foi alterada.'); return; }
    stop.status = newStatus;

    // Atualiza imediatamente a UI de forma fluida
    const card = document.getElementById(`stop-card-${stopId}`);
    const badge = document.getElementById(`badge-circle-${stopId}`);
    const pill = document.getElementById(`status-pill-${stopId}`);
    const btn = document.getElementById(`btn-status-${stopId}`);

    if (newStatus === 'delivered') {
      if (card) {
        card.classList.add('is-delivered');
        card.setAttribute('data-status', 'delivered');
      }
      if (badge) {
        badge.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }
      if (pill) {
        pill.className = 'stop-status-pill delivered';
        pill.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Concluído</span>`;
      }
      if (btn) {
        btn.className = 'btn-toggle-delivered delivered-action';
        btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Entrega Concluída • Desfazer</span>`;
      }
    } else {
      if (card) {
        card.classList.remove('is-delivered');
        card.setAttribute('data-status', 'pending');
      }
      if (badge) {
        badge.textContent = stopNum;
      }
      if (pill) {
        pill.className = 'stop-status-pill pending';
        pill.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <span>Pendente</span>`;
      }
      if (btn) {
        btn.className = 'btn-toggle-delivered pending-action';
        btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Marcar como Concluído</span>`;
      }
    }

    this.saveLocalCache();
    this.updateProgress();
    this.applyFilter();

    this.showSyncStatus();
    await this.sync();
  }

  jumpToNextPending() {
    const stops = this.routeData?.stops || [];
    const firstPending = stops.find(s => s.status !== 'delivered');
    if (firstPending) {
      const card = document.getElementById(`stop-card-${firstPending.id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.outline = '2px solid var(--pw-yellow)';
        setTimeout(() => { card.style.outline = ''; }, 1200);
      }
    }
  }

  applyFilter() {
    const cards = document.querySelectorAll('.stop-card');
    cards.forEach(card => {
      const status = card.getAttribute('data-status');
      if (this.currentFilter === 'all') {
        card.style.display = 'block';
      } else if (this.currentFilter === 'pending') {
        card.style.display = status === 'pending' ? 'block' : 'none';
      } else if (this.currentFilter === 'delivered') {
        card.style.display = status === 'delivered' ? 'block' : 'none';
      }
    });
  }

  async finishCurrentRoute() {
    await this.sync(true);
    if (this.outbox.items.length) { alert('Sincronize as alterações pendentes antes de encerrar.'); return; }
    if (!confirm('Deseja concluir e arquivar esta rotina de entregas?')) return;

    const btn = document.getElementById('btn-driver-finish-rotina');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.innerText = 'Arquivando rotina...';
    }

    try {
      const response = await this.apiFetch('api/finish_route.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: this.routeId,
          stops: this.routeData?.stops || [],
          motorista: 'Motorista (Celular)',
          veiculo: 'Furgão / Utilitário Plaswill',
          observacoes: 'Finalizado pelo motorista via celular'
        })
      });

      const res = await response.json();
      if (response.ok && res.success) {
        alert('🎉 Rotina de entregas finalizada e arquivada com sucesso!');
        const banner = document.getElementById('all-completed-banner');
        if (banner) {
          banner.innerHTML = `
            <div class="completed-icon-circle" style="background: rgba(16, 185, 129, 0.2);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <h4 style="color: #10b981;">Rotina Arquivada no Histórico!</h4>
              <p>Viagem registrada e concluída na expedição.</p>
            </div>
          `;
        }
      } else {
        alert('Erro ao finalizar rota: ' + (res.error || res.message || 'Erro desconhecido'));
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.innerText = 'Finalizar e Arquivar Rotina';
        }
      }
    } catch (e) {
      alert('Erro de conexão ao finalizar rota.');
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = 'Finalizar e Arquivar Rotina';
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.driverApp = new DriverApp();
});
