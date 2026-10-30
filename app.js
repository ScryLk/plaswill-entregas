/**
 * Plaswill Entregas - Planejador Inteligente de Entregas Mobile
 * Versão 1.0 (PWA)
 */

const ICON_WAZE_SVG = (size = 14) => `
<svg width="${size}" height="${size}" viewBox="0 0 122.71 122.88" fill="none" style="vertical-align: middle; flex-shrink: 0;" aria-hidden="true">
  <path fill="#ffffff" d="M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07 C104.27,17.76,90.77,8.19,72.3,6.22c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44 c-0.09,3.28,0,6.66,0,9.94C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
  <path fill="#070D18" d="M54.95,110.49c-1.03,4.69-3.56,8.16-7.69,10.31c-5.25,2.72-10.6,2.63-15.57-0.56c-5.16-3.28-7.41-8.25-7.03-14.35 c0.09-1.03-0.19-1.41-1.03-1.88c-9.1-4.78-16.31-11.44-21.28-20.44c-0.94-1.78-1.69-3.66-2.16-5.63c-0.66-2.72,0.38-4.03,3.19-4.31 c3.38-0.38,6.38-1.69,7.88-4.88c0.66-1.41,1.03-3.09,1.03-4.69c0.19-4.03,0-8.06,0.19-12.1c1.03-15.57,7.5-28.5,19.32-38.63 C42.67,3.97,55.42-0.43,69.76,0.03c25.04,0.94,46.51,18.57,51.57,43.23c4.59,22.32-2.34,40.98-20.07,55.51 c-1.03,0.84-2.16,1.69-3.38,2.44c-0.66,0.47-0.84,0.84-0.56,1.59c2.34,7.13-0.94,15-7.5,18.38c-8.91,4.41-19.22-0.09-21.94-9.66 c-0.09-0.38-0.56-0.84-0.84-0.84C63.11,110.4,59.07,110.49,54.95,110.49L54.95,110.49z M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09 c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07C104.27,17.76,90.77,8.19,72.3,6.22 c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44c-0.09,3.28,0,6.66,0,9.94 C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
  <path fill="#070D18" d="M74.92,79.74c-11.07-0.56-18.38-4.97-23.07-13.78c-1.13-2.16-0.09-4.31,2.06-4.78c1.31-0.28,2.53,0.66,3.47,2.16 c1.22,1.88,2.44,3.75,4.03,5.25c8.81,8.34,23.25,5.72,28.79-5.06c0.66-1.31,1.5-2.34,3.09-2.34c2.34,0.09,3.66,2.44,2.63,4.59 c-2.91,5.91-7.5,10.22-13.69,12.28C79.51,78.99,76.7,79.36,74.92,79.74L74.92,79.74z"/>
  <path fill="#070D18" d="M55.32,48.98c-3.38,0-6.09-2.72-6.09-6.09s2.72-6.09,6.09-6.09s6.09,2.72,6.09,6.09C61.42,46.17,58.7,48.98,55.32,48.98 L55.32,48.98z"/>
  <path fill="#070D18" d="M98.27,42.79c0,3.38-2.72,6.09-6,6.19c-3.38,0-6.09-2.63-6.09-6.09c0-3.38,2.63-6.09,6-6.19 C95.46,36.7,98.17,39.42,98.27,42.79L98.27,42.79z"/>
</g>
</svg>`;

const ICON_MAPS_SVG = (size = 14) => `
<svg width="${size}" height="${size}" viewBox="0 0 92.3 132.3" style="vertical-align: middle; flex-shrink: 0;" aria-hidden="true">
  <path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/>
  <path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/>
  <path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/>
  <path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/>
  <path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/>
</svg>`;

class DeliveryPlanner {
  constructor() {
    this.storageKey = 'plaswill_deliveries_v1';
    this.originKey = 'plaswill_origin_v1';
    
    // Ponto padrão: Panambi/RS
    this.defaultCenter = [-28.2917, -53.5019];
    
    // Base oficial de saída
    this.bases = {};
    this.currentOrigin = null;
    this.deliveries = this.loadDeliveries();
    this.currentRouteId = null;
    try { this.currentRouteId = localStorage.getItem('plaswill_active_route_id'); }
    catch (_) { this.localReadError = true; }
    this.driverCoords = null;

    this.map = null;
    this.markersLayer = null;
    this.originMarker = null;
    this.driverMarker = null;

    this.searchDebounceTimer = null;
    this.currentActiveId = null;
    this.markerMap = {};

    this.ready = this.init();
  }

  async init() {
    try {
      const response = await window.entregasFetch('origin.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Origem indisponível');
      this.bases.plaswill = await response.json();
      this.currentOrigin = this.loadOrigin();
    } catch (_) { alert('Não foi possível carregar a configuração de origem. Atualize a página.'); return; }
    if (typeof L === 'undefined') {
      const message = document.createElement('p');
      message.className = 'routine-map-unavailable';
      message.textContent = 'Mapa indisponível. Você pode salvar e revisar o planejamento; recarregue a página para tentar carregar o mapa novamente.';
      document.getElementById('map-container').append(message);
    } else this.initMap();
    this.bindEvents();
    await this.checkUrlParams();
    this.showLocalStorageState();
    window.addEventListener('beforeunload', event => {
      if (this.localWriteError) { event.preventDefault(); event.returnValue = ''; }
    });
    this.renderStopsList();
    this.updateMapMarkers();

    const urlParams = new URLSearchParams(window.location.search);
    const targetModal = urlParams.get('modal');
    if (targetModal) {
      if (targetModal === 'finish') {
        this.openFinishRotinaModal();
      } else if (targetModal === 'history') {
        this.openHistoryModal();
      } else {
        this.openModal(targetModal === 'create' ? 'modal-create-delivery' : targetModal);
      }
    }
  }

  // =========================================================================
  // MAPA INTERATIVO (LEAFLET)
  // =========================================================================
  initMap() {
    this.map = L.map('map-container', {
      zoomControl: false,
      attributionControl: false
    }).setView(this.defaultCenter, 14);

    // Adiciona controle de zoom na direita superior
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Camadas de Mapa Profissionais (Esri GIS - Sem bloqueio 403 e alta performance)
    const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    }).addTo(this.map);

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    // Seletor discreto de mapa base (Ruas / Satélite) no canto superior direito
    L.control.layers({
      "Ruas": streetLayer,
      "Satélite": satelliteLayer
    }, null, { position: 'topright', collapsed: true }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    // Marcador da Base de Origem
    this.updateOriginMarker();
  }

  updateOriginMarker() {
    if (!this.map || typeof L === 'undefined') return;
    if (this.originMarker) {
      this.map.removeLayer(this.originMarker);
    }

    const icon = L.divIcon({
      className: 'custom-pin-plaswill-origin',
      html: `
        <div class="pin-plaswill-container" title="${this.escapeHtml(this.currentOrigin.name)}">
          <div class="pin-plaswill-badge">
            <img src="img/plaswill_logo.png" alt="Plaswill" class="pin-plaswill-logo">
          </div>
          <div class="pin-plaswill-arrow"></div>
          <div class="pin-plaswill-pulse"></div>
        </div>
      `,
      iconSize: [54, 40],
      iconAnchor: [27, 40],
      popupAnchor: [0, -40]
    });

    this.originMarker = L.marker([this.currentOrigin.lat, this.currentOrigin.lon], { icon, zIndexOffset: 1000 })
      .bindPopup(`
        <div style="font-family: inherit; font-size: 13px; min-width: 190px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <img src="img/plaswill_logo.png" alt="Plaswill" style="height: 18px; width: auto; object-fit: contain;">
            <strong style="color: #0E1626; font-size: 13px;">Ponto de Partida</strong>
          </div>
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 3px;">${this.escapeHtml(this.currentOrigin.name)}</div>
          <div style="font-size: 11px; color: #64748b; line-height: 1.4;">${this.escapeHtml(this.currentOrigin.address)}</div>
        </div>
      `)
      .addTo(this.map);
  }

  updateMapMarkers() {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();
    this.markerMap = {};

    if (this.deliveries.length === 0) {
      if (this.originMarker) {
        this.map.setView([this.currentOrigin.lat, this.currentOrigin.lon], 14);
      }
      return;
    }

    const bounds = [];
    if (this.originMarker) {
      bounds.push([this.currentOrigin.lat, this.currentOrigin.lon]);
    }

    // Rastreador de coordenadas para evitar sobreposição exata de pinos (Anti-overlap / Spiderfier)
    const coordTracker = {};

    this.deliveries.forEach((delivery, index) => {
      const stopNum = index + 1;
      const isDelivered = delivery.status === 'delivered';
      const pinClass = isDelivered ? 'custom-pin-stop delivered' : 'custom-pin-stop';
      const label = isDelivered ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>' : stopNum;

      const icon = L.divIcon({
        className: pinClass,
        html: `<div class="pin-bubble"><span>${label}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      let lat = parseFloat(delivery.lat);
      let lon = parseFloat(delivery.lon);

      if (isNaN(lat) || isNaN(lon)) return;

      // Dispersão anti-sobreposição (se duas paradas caírem no mesmo local)
      const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (coordTracker[coordKey] !== undefined) {
        coordTracker[coordKey]++;
        const count = coordTracker[coordKey];
        const angle = (count * 2 * Math.PI) / 8;
        const radius = 0.00035 * Math.ceil(count / 8); // ~35 metros
        lat += Math.cos(angle) * radius;
        lon += Math.sin(angle) * radius;
      } else {
        coordTracker[coordKey] = 0;
      }

      bounds.push([lat, lon]);

      const wazeUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 180px;">
          <b style="color: #0284c7;">#${stopNum} ${this.escapeHtml(delivery.destinatario || delivery.nome_fantasia)}</b>
          <p style="margin: 4px 0; color: #475569; font-size: 11px;">${this.escapeHtml(delivery.endereco_completo || delivery.logradouro)}</p>
          ${delivery.itens_resumo ? `<p style="margin: 4px 0; color: #059669; font-size: 11px;"><b>Volumes:</b> ${this.escapeHtml(delivery.itens_resumo)}</p>` : ''}
          <div style="margin-top: 8px; display: flex; gap: 6px;">
            <a href="${wazeUrl}" target="_blank" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; background: #00d6fe; color: #070d18; padding: 6px 8px; border-radius: 4px; font-weight: 700; text-decoration: none; font-size: 11px;">
              ${ICON_WAZE_SVG(14)}
              <span>Waze</span>
            </a>
            <a href="${mapsUrl}" target="_blank" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; background: #ffffff; color: #1e293b; border: 1px solid #cbd5e1; padding: 5px 8px; border-radius: 4px; font-weight: 700; text-decoration: none; font-size: 11px;">
              ${ICON_MAPS_SVG(14)}
              <span>Maps</span>
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon })
        .bindPopup(popupHtml)
        .addTo(this.markersLayer);

      this.markerMap[delivery.id] = marker;

      marker.on('click', () => {
        this.highlightCard(delivery.id);
      });
    });

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }

  // =========================================================================
  // ALTERNÂNCIA E EXPANSÃO DO MAPA
  // =========================================================================
  toggleMapCollapse() {
    const mapContainer = document.getElementById('map-container');
    const toggleBtn = document.getElementById('btn-sidebar-toggle');
    if (!mapContainer) return;

    const isCollapsed = mapContainer.classList.toggle('map-collapsed');
    if (toggleBtn) {
      if (isCollapsed) {
        toggleBtn.classList.remove('active');
        toggleBtn.title = 'Mostrar Mapa';
      } else {
        toggleBtn.classList.add('active');
        toggleBtn.title = 'Ocultar Mapa';
      }
    }

    if (!isCollapsed && this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    }
  }

  panToDelivery(id) {
    this.highlightCard(id);
    const del = this.deliveries.find(d => d.id === id);
    if (!del) return;

    const lat = parseFloat(del.lat);
    const lon = parseFloat(del.lon);
    if (!isNaN(lat) && !isNaN(lon) && this.map) {
      this.map.setView([lat, lon], 16, { animate: true });
      if (this.markerMap && this.markerMap[id]) {
        this.markerMap[id].openPopup();
      }
    }
  }

  // =========================================================================
  // RENDERIZAÇÃO DA TABELA BÁSICA DE ENTREGAS
  // =========================================================================
  renderStopsList() {
    const tableBody = document.getElementById('deliveries-table-body');
    const emptyState = document.getElementById('table-empty-state');
    const totalCountEl = document.getElementById('total-stops-count');
    const deliveredCountEl = document.getElementById('delivered-stops-count');

    const total = this.deliveries.length;
    const delivered = this.deliveries.filter(d => d.status === 'delivered').length;

    if (totalCountEl) totalCountEl.textContent = total;
    if (deliveredCountEl) deliveredCountEl.textContent = delivered;

    // Atualiza o crachá dinâmico de status da rotina no topo
    const badgeActive = document.getElementById('badge-rotina-active');
    if (badgeActive) {
      if (total === 0) {
        badgeActive.textContent = 'SEM ROTINA ATIVA';
        badgeActive.style.background = 'rgba(148, 163, 184, 0.15)';
        badgeActive.style.color = '#94a3b8';
        badgeActive.style.borderColor = 'rgba(148, 163, 184, 0.3)';
      } else if (delivered === total) {
        badgeActive.textContent = 'ROTINA 100% ENTREGUE';
        badgeActive.style.background = 'rgba(16, 185, 129, 0.15)';
        badgeActive.style.color = '#10b981';
        badgeActive.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      } else {
        badgeActive.textContent = 'ROTINA EM ANDAMENTO';
        badgeActive.style.background = 'rgba(255, 242, 18, 0.12)';
        badgeActive.style.color = 'var(--pw-yellow)';
        badgeActive.style.borderColor = 'rgba(255, 242, 18, 0.3)';
      }
    }

    if (!tableBody) return;

    if (total === 0) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    tableBody.innerHTML = '';

    this.deliveries.forEach((del, index) => {
      const stopNum = index + 1;
      const isDelivered = del.status === 'delivered';
      const lat = parseFloat(del.lat);
      const lon = parseFloat(del.lon);

      const wazeUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

      const tr = document.createElement('tr');
      tr.id = `delivery-row-${del.id}`;
      tr.className = `${isDelivered ? 'is-delivered' : ''} ${this.currentActiveId === del.id ? 'is-active' : ''}`;
      tr.style.cursor = 'pointer';

      tr.innerHTML = `
        <td style="text-align: center;">
          <div class="table-badge-num ${isDelivered ? 'delivered' : ''}">
            ${isDelivered ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : stopNum}
          </div>
        </td>
        <td>
          <span class="table-status-tag ${isDelivered ? 'delivered' : 'pending'}">
            ${isDelivered ? `
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Entregue</span>
            ` : `
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Pendente</span>
            `}
          </span>
        </td>
        <td>
          <div class="client-name-cell">${this.escapeHtml(del.destinatario || del.nome_fantasia || 'Cliente')}</div>
          ${del.cnpj ? `<div class="client-sub-cell">CNPJ: ${this.escapeHtml(del.cnpj)}</div>` : ''}
        </td>
        <td>
          <div class="address-cell-street">
            ${this.escapeHtml(del.logradouro || del.endereco_completo || 'Endereço não informado')}${del.numero ? ', ' + this.escapeHtml(del.numero) : ''}
          </div>
          ${del.bairro ? `<span class="address-cell-bairro">${this.escapeHtml(del.bairro)}</span>` : ''}
        </td>
        <td>
          <span class="table-nfe-badge">${del.numero_nota ? this.escapeHtml(del.numero_nota) : '—'}</span>
        </td>
        <td>
          <span>${this.escapeHtml(del.itens_resumo || (del.volumes != null ? `${del.volumes} ${del.volumes === 1 ? 'volume' : 'volumes'}` : '1 volume'))}</span>
        </td>
        <td>
          <div class="table-actions-cell">
            <a href="${wazeUrl}" target="_blank" class="table-btn-nav table-btn-waze" title="Navegar no Waze" onclick="event.stopPropagation()">
              ${ICON_WAZE_SVG(14)}
              <span>Waze</span>
            </a>
            <a href="${mapsUrl}" target="_blank" class="table-btn-nav table-btn-maps" title="Navegar no Google Maps" onclick="event.stopPropagation()">
              ${ICON_MAPS_SVG(14)}
              <span>Maps</span>
            </a>
            <button type="button" class="table-btn-status ${isDelivered ? 'is-delivered' : ''}"  title="${isDelivered ? 'Marcar como Pendente' : 'Marcar como Entregue'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button type="button" class="table-btn-delete"  title="Excluir Parada">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      tr.onclick = (e) => {
        this.panToDelivery(del.id);
      };

      tr.querySelector('.table-btn-status').addEventListener('click', e => { e.stopPropagation(); this.toggleDeliveryStatus(del.id); });
      tr.querySelector('.table-btn-delete').addEventListener('click', e => { e.stopPropagation(); this.deleteStop(del.id); });
      tableBody.appendChild(tr);
    });
  }

  highlightCard(id) {
    this.currentActiveId = id;
    document.querySelectorAll('.deliveries-table tbody tr').forEach(r => r.classList.remove('is-active'));
    const target = document.getElementById(`delivery-row-${id}`);
    if (target) {
      target.classList.add('is-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // =========================================================================
  // GESTÃO DE ENTREGAS (ADD, TOGGLE, DELETE, REORDER)
  // =========================================================================
  addDelivery(deliveryData) {
    if (this.sharingLegacy || this.finishingLegacy) { alert('Aguarde a confirmação da operação atual antes de alterar o planejamento.'); return false; }
    if (!window.routineManager?.current && (this.localReadError || this.routeLoadFailed)) {
      alert('Recupere o rascunho local ou recarregue a rota antes de incluir entregas. Os dados existentes foram preservados.'); return false;
    }
    if (['default_center_jitter','approximate','unresolved'].includes(deliveryData.geocoded_by)) {
      alert('Localização aproximada. Revise as coordenadas no cadastro manual antes de adicionar a entrega.'); return false;
    }
    if (this.currentRouteId) { alert('Encerre a rota despachada antes de adicionar novas paradas.'); return false; }
    this.deliveries.push(deliveryData);
    this.saveDeliveries();
    this.renderStopsList();
    this.updateMapMarkers();
    return true;
  }

  async toggleDeliveryStatus(id) {
    if (this.sharingLegacy || this.finishingLegacy) return false;
    const item = this.deliveries.find(d => d.id === id);
    if (!item) return;
    const status = item.status === 'delivered' ? 'pending' : 'delivered';
    if (this.currentRouteId) {
      try {
        const response = await window.entregasFetch('api/update_route_status.php', {
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({route_id:this.currentRouteId,stop_id:id,status,
            operation_id:crypto.randomUUID(),expected_version:item.version || 0})
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Falha de sincronização');
        item.version = data.version;
      } catch (err) { alert(err.message + '. Atualize a rota antes de continuar.'); return; }
    }
    item.status = status;
    this.saveDeliveries(); this.renderStopsList(); this.updateMapMarkers();
  }

  deleteStop(id) {
    if (this.sharingLegacy || this.finishingLegacy) return false;
    if (this.currentRouteId) { alert('Uma rota despachada não pode ter paradas removidas.'); return; }
    if (!confirm('Deseja remover esta parada da lista?')) return;
    this.deliveries = this.deliveries.filter(d => d.id !== id);
    this.saveDeliveries();
    this.renderStopsList();
    this.updateMapMarkers();
  }

  clearAllStops() {
    if (this.sharingLegacy || this.finishingLegacy) return false;
    if (this.currentRouteId) { alert('Encerre a rotina despachada antes de limpar a lista.'); return; }
    if (this.deliveries.length === 0) return;
    if (!confirm('Tem certeza que deseja limpar todas as entregas do dia?')) return;
    this.deliveries = [];
    this.saveDeliveries();
    this.renderStopsList();
    this.updateMapMarkers();
  }

  planningContext() {
    return JSON.stringify([this.storageKey, this.currentRouteId, this.currentOrigin, this.deliveries,
      window.routineManager?.current?.routine_id, window.routineManager?.generation]);
  }

  async optimizeSequence() {
    if (this.optimizing || this.sharingLegacy || this.finishingLegacy) return false;
    if (this.deliveries.length <= 1) {
      alert('Adicione pelo menos 2 entregas para otimizar a sequência.');
      return;
    }

    const snapshot = this.planningContext();
    const isCurrent = () => this.planningContext() === snapshot && !this.sharingLegacy && !this.finishingLegacy && !window.routineManager?.dispatching && !window.routineManager?.operating;
    this.optimizing = true;
    const btn = document.getElementById('btn-optimize-stops');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> <span>Otimizando...</span>';

    try {
      const response = await window.entregasFetch('api/optimize_sequence.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stops: this.deliveries,
          origin: this.currentOrigin
        })
      });

      const res = await response.json();
      if (!isCurrent()) return false;
      if (response.ok && res.success && Array.isArray(res.ordered_stops)) {
        this.deliveries = res.ordered_stops;
        this.saveDeliveries();
        this.renderStopsList();
        this.updateMapMarkers();
        alert('Sequência otimizada com sucesso por proximidade de bairros!');
        return true;
      } else {
        throw new Error(res.error || 'Erro na otimização');
      }
    } catch (err) {
      if (!isCurrent()) return false;
      console.warn('Fallback local para otimização:', err);
      // Fallback local simples pelo vizinho mais próximo
      await this.localOptimize();
      return true;
    } finally {
      this.optimizing = false;
      if (btn) btn.innerHTML = originalText;
    }
  }

  localOptimize() {
    if (this.sharingLegacy || this.finishingLegacy) return false;
    let unvisited = [...this.deliveries];
    let ordered = [];
    let curLat = this.currentOrigin.lat;
    let curLon = this.currentOrigin.lon;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDst = Infinity;

      unvisited.forEach((stop, idx) => {
        const d = Math.hypot(stop.lat - curLat, stop.lon - curLon);
        if (d < minDst) {
          minDst = d;
          nearestIdx = idx;
        }
      });

      const selected = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(selected);
      curLat = selected.lat;
      curLon = selected.lon;
    }

    this.deliveries = ordered;
    this.saveDeliveries();
    this.renderStopsList();
    this.updateMapMarkers();
    alert('Sequência organizada por proximidade!');
  }

  // =========================================================================
  // PROCESSAMENTO DE DANFE (FOTO / UPLOAD + GEMINI VISION)
  // =========================================================================
  async handleDanfeUpload(file) {
    const loadingBox = document.getElementById('ai-loading-danfe');
    const dropzone = document.getElementById('danfe-dropzone');
    const previewArea = document.getElementById('danfe-preview-area');
    const previewImg = document.getElementById('danfe-preview-img');
    const confirmBtn = document.getElementById('btn-confirm-danfe');

    if (!file) return;
    const sequence=this.danfeSequence=(this.danfeSequence||0)+1;
    const context=this.storageKey;
    this.danfeAbort?.abort();this.danfeAbort=new AbortController();
    this.pendingDanfeDelivery=null;confirmBtn.style.display='none';
    if(file.size>5242880||!['image/jpeg','image/png','image/webp'].includes(file.type)){alert('Envie uma imagem JPEG, PNG ou WebP de até 5 MiB.');return;}

    // Mostra preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      if(sequence!==this.danfeSequence||context!==this.storageKey)return;
      previewImg.src = e.target.result;
      dropzone.style.display = 'none';
      previewArea.style.display = 'flex';
      loadingBox.style.display = 'flex';

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await window.entregasFetch('api/process_danfe.php', {
          method: 'POST',
          body: formData,
          signal:this.danfeAbort.signal
        });

        const res = await response.json();
        if(sequence!==this.danfeSequence||context!==this.storageKey)return;
        loadingBox.style.display = 'none';

        if (response.ok && res.success && res.delivery && typeof res.delivery==='object' && typeof res.delivery.destinatario==='string') {
          const d = res.delivery;
          document.getElementById('danfe-res-destinatario').value = d.destinatario || '';
          document.getElementById('danfe-res-logradouro').value = d.logradouro || '';
          document.getElementById('danfe-res-numero').value = d.numero || '';
          document.getElementById('danfe-res-bairro').value = d.bairro || '';
          document.getElementById('danfe-res-nf').value = d.numero_nota || '';
          document.getElementById('danfe-res-itens').value = d.itens_resumo || '';
          for(const [field,key]of Object.entries({'cidade':'municipio','uf':'uf','complemento':'complemento','volumes':'volumes','observacoes':'observacoes'})){
            const input=document.getElementById('danfe-res-'+field);if(input)input.value=d[key]??'';
          }

          // Guarda objeto temporário para confirmação
          this.pendingDanfeDelivery = d;
          confirmBtn.style.display = 'block';
        } else {
          alert('Não foi possível ler a nota fiscal: ' + (res.error || 'Erro desconhecido'));
          this.resetDanfeModal();
        }
      } catch (err) {
        if(sequence!==this.danfeSequence||context!==this.storageKey||err.name==='AbortError')return;
        loadingBox.style.display = 'none';
        alert('Erro ao enviar imagem para IA: ' + err.message);
        this.resetDanfeModal();
      }
    };
    reader.readAsDataURL(file);
  }

  confirmDanfeStop() {
    if (!this.pendingDanfeDelivery) return;
    const original=this.pendingDanfeDelivery;
    const updated={...original};
    for(const [field,key] of Object.entries({'destinatario':'destinatario','logradouro':'logradouro','numero':'numero','bairro':'bairro','nf':'numero_nota','itens':'itens_resumo','cidade':'municipio','uf':'uf','complemento':'complemento','observacoes':'observacoes'})){
      const input=document.getElementById('danfe-res-'+field);if(input)updated[key]=input.value.trim();
    }
    const volumes=document.getElementById('danfe-res-volumes')?.value;
    if(volumes!==''){updated.volumes=Number(volumes);}
    const changed=this.addressSnapshot(original)!==this.addressSnapshot(updated);
    if(changed||original.needs_review||!this.validDeliveryCoordinates(updated)){
      if(changed){updated.lat=null;updated.lon=null;updated.geocoded_by='unresolved';}
      this.fillManualFormWithCompany({...updated,nome:updated.destinatario});
      document.getElementById('form-nfe').value=updated.numero_nota||'';
      document.getElementById('form-itens').value=updated.itens_resumo||'';
      this.switchCreateTab('manual');
      alert('Confira os dados sugeridos pela IA e a localização no formulário antes de confirmar a entrega.');return;
    }
    updated.endereco_completo=[updated.logradouro,updated.numero,updated.complemento,updated.bairro,updated.municipio,updated.uf].filter(Boolean).join(', ');
    if(!this.addDelivery(updated))return;
    this.pendingDanfeDelivery = null;
    this.closeModal('modal-create-delivery');
    this.resetDanfeModal();
  }

  // =========================================================================
  // ABA DO MODAL DE CRIAÇÃO E AUTOCOMPLETE OBSIDIAN & SGE
  // =========================================================================
  switchCreateTab(tab) {
    const btnManual = document.getElementById('tab-btn-manual');
    const btnPhoto = document.getElementById('tab-btn-photo');
    const paneManual = document.getElementById('tab-content-manual');
    const panePhoto = document.getElementById('tab-content-photo');

    if (tab === 'manual') {
      if (btnManual) btnManual.classList.add('active');
      if (btnPhoto) btnPhoto.classList.remove('active');
      if (paneManual) paneManual.style.display = 'block';
      if (panePhoto) panePhoto.style.display = 'none';
    } else {
      if (btnPhoto) btnPhoto.classList.add('active');
      if (btnManual) btnManual.classList.remove('active');
      if (panePhoto) panePhoto.style.display = 'block';
      if (paneManual) paneManual.style.display = 'none';
    }
  }

  bindManualSearch() {
    const searchInput = document.getElementById('manual-client-search');
    const suggestionsBox = document.getElementById('manual-suggestions-box');
    if (!searchInput || !suggestionsBox) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(this.manualSearchTimer);
      this.manualSearchAbort?.abort();this.manualSearchAbort=new AbortController();
      const sequence=this.manualSearchSequence=(this.manualSearchSequence||0)+1;

      if (query.length === 0) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
        return;
      }

      this.manualSearchTimer = setTimeout(async () => {
        try {
          const response = await window.entregasFetch(`api/search_company.php?mode=catalog&q=${encodeURIComponent(query)}`,{signal:this.manualSearchAbort.signal});
          const data = await response.json();
          if(sequence!==this.manualSearchSequence||searchInput.value.trim()!==query)return;
          if(!response.ok)throw new Error(data.error||'Não foi possível consultar o catálogo.');

          if (data.success && data.results && data.results.length > 0) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'block';

            data.results.forEach(item => {
              const row = document.createElement('div');
              row.className = 'suggestion-row';
              const name = item.fantasia || item.nome;
              const address = `${item.logradouro || ''}${item.numero ? ', ' + item.numero : ''}`;
              const bairro = item.bairro ? ` • ${item.bairro}` : '';
              const city = item.municipio ? ` (${item.municipio})` : '';

              row.innerHTML = `
                <div class="suggestion-info">
                  <h5>${this.escapeHtml(name)}</h5>
                  <p>${this.escapeHtml(address)}${this.escapeHtml(bairro)}${this.escapeHtml(city)}</p>
                </div>
                <span class="suggestion-badge">+ Selecionar</span>
              `;

              row.onclick = () => {
                this.fillManualFormWithCompany(item);
                suggestionsBox.style.display = 'none';
                searchInput.value = name;
              };

              suggestionsBox.appendChild(row);
            });
          } else {
            suggestionsBox.innerHTML = `
              <div style="padding: 12px; font-size: 11px; color: var(--pw-text-muted); text-align: center;">
                Nenhum cliente cadastrado com "${this.escapeHtml(query)}". Você pode preencher os campos abaixo manualmente.
              </div>
            `;
            suggestionsBox.style.display = 'block';
          }
        } catch (err) {
          if(err.name!=='AbortError'&&sequence===this.manualSearchSequence){suggestionsBox.textContent='Não foi possível consultar o catálogo. Tente novamente ou preencha os dados manualmente.';suggestionsBox.style.display='block';}
        }
      }, 250);
    });

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.obsidian-search-card')) {
        suggestionsBox.style.display = 'none';
      }
    });
  }

  addressSnapshot(item) {
    return ['logradouro','numero','complemento','bairro','municipio','uf'].map(k=>String(item[k]||'').trim().toLocaleLowerCase('pt-BR')).join('|');
  }

  validDeliveryCoordinates(item) {
    return item.lat!==null&&item.lon!==null&&item.lat!==''&&item.lon!==''&&Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lon))&&Math.abs(Number(item.lat))<=90&&Math.abs(Number(item.lon))<=180&&!(Math.abs(Number(item.lat)+28.2917)<.0001&&Math.abs(Number(item.lon)+53.5019)<.0001)&&!['unresolved','approximate','default_center_jitter'].includes(item.geocoded_by);
  }

  fillManualFormWithCompany(item) {
    const destInput = document.getElementById('form-destinatario');
    const logInput = document.getElementById('form-logradouro');
    const numInput = document.getElementById('form-numero');
    const baiInput = document.getElementById('form-bairro');
    const cidInput = document.getElementById('form-cidade');
    const ufInput = document.getElementById('form-uf');
    const latInput = document.getElementById('form-lat');
    const lonInput = document.getElementById('form-lon');

    if (destInput) destInput.value = item.destinatario || item.fantasia || item.nome || '';
    if (logInput) logInput.value = item.logradouro || '';
    if (numInput) numInput.value = item.numero || '';
    if (baiInput) baiInput.value = item.bairro || '';
    if (cidInput) cidInput.value = item.municipio || '';
    if (ufInput) ufInput.value = item.uf || '';
    if (latInput) latInput.value = this.validDeliveryCoordinates(item)?String(item.lat):'';
    if (lonInput) lonInput.value = this.validDeliveryCoordinates(item)?String(item.lon):'';
    for(const [id,key] of Object.entries({'form-complemento':'complemento','form-volumes':'volumes','form-observacoes':'observacoes'})){
      const input=document.getElementById(id);if(input)input.value=item[key]??'';
    }
    this.manualCompany={client_id:item.client_id||'',address_id:item.address_id||'',snapshot:this.addressSnapshot(item),lat:latInput?.value,lon:lonInput?.value};
    const note=document.getElementById('manual-source-note');
    if(note)note.textContent=item.source==='danfe_ai'||item.tipo==='ai_search'||item.needs_review?'Sugestão não verificada. Confira destinatário, endereço e coordenadas antes de confirmar.':'Snapshot do catálogo local. Alterações aqui afetam somente esta entrega, sem atualizar o cadastro corporativo.';

    if (destInput) {
      destInput.style.borderColor = '#FFF212';
      setTimeout(() => { destInput.style.borderColor = ''; }, 1200);
    }
  }

  async submitManualDelivery(event) {
    event.preventDefault();
    if(this.manualSubmitting)return;
    this.manualSubmitting=true;
    const context=this.storageKey;
    const fields=['destinatario','logradouro','numero','bairro','cidade','uf','nfe','itens','complemento','volumes','observacoes'];
    const snapshot=()=>JSON.stringify(fields.map(field=>document.getElementById('form-'+field)?.value||''));
    const formSnapshot=snapshot();
    const button=document.getElementById('form-manual-delivery').querySelector('[type="submit"]');if(button)button.disabled=true;
    try {

    const destinatario = document.getElementById('form-destinatario').value.trim();
    const logradouro = document.getElementById('form-logradouro').value.trim();
    const numero = document.getElementById('form-numero').value.trim();
    const bairro = document.getElementById('form-bairro').value.trim();
    const cidade = document.getElementById('form-cidade').value.trim();
    const uf = document.getElementById('form-uf').value.trim().toUpperCase();
    const complemento=document.getElementById('form-complemento')?.value.trim()||'';
    const volumesValue=document.getElementById('form-volumes')?.value||'';
    const observacoes=document.getElementById('form-observacoes')?.value.trim()||'';
    const nfe = document.getElementById('form-nfe').value.trim();
    const itens = document.getElementById('form-itens').value.trim();
    let lat = parseFloat(document.getElementById('form-lat').value);
    let lon = parseFloat(document.getElementById('form-lon').value);

    if (!destinatario || !logradouro || !cidade || !/^[A-Z]{2}$/.test(uf)) {
      alert('Preencha destinatário, logradouro, município e UF de duas letras.');
      return;
    }
    if(volumesValue!==''&&(!Number.isInteger(Number(volumesValue))||Number(volumesValue)<0||Number(volumesValue)>100000)){alert('Informe uma quantidade inteira de volumes entre 0 e 100000.');return;}
    const address={logradouro,numero,complemento,bairro,municipio:cidade,uf};
    if(this.manualCompany&&this.manualCompany.snapshot!==this.addressSnapshot(address)&&document.getElementById('form-lat').value===this.manualCompany.lat&&document.getElementById('form-lon').value===this.manualCompany.lon){lat=NaN;lon=NaN;document.getElementById('form-lat').value='';document.getElementById('form-lon').value='';}

    // Se não tiver coordenadas ou se forem as genéricas de centro de Panambi (-28.2917, -53.5019), geocodifica
    const isGeneric = !this.validDeliveryCoordinates({lat,lon});

    if (isGeneric) {
      const cleanNum = (numero && !/^(s\/?n[º°]?|sem\s*n[uú]mero|0)$/i.test(numero.trim())) ? numero.trim() : '';
      const fullStreet = `${logradouro}${cleanNum ? ', ' + cleanNum : ''}`;
      try {
        const geoRes = await window.entregasFetch(`api/geocode.php?q=${encodeURIComponent(fullStreet)}&cidade=${encodeURIComponent(cidade)}&uf=${encodeURIComponent(uf)}`);
        const geoData = await geoRes.json();
        if(context!==this.storageKey||snapshot()!==formSnapshot){alert('Os dados do planejamento mudaram durante a consulta. Confira o formulário antes de tentar novamente.');return;}
        if (geoRes.ok && geoData.success && this.validDeliveryCoordinates(geoData)) {
          lat = parseFloat(geoData.lat);
          lon = parseFloat(geoData.lon);
          document.getElementById('form-lat').value=String(lat);document.getElementById('form-lon').value=String(lon);
          if(!confirm(`Localização sugerida: ${geoData.display_name||[logradouro,numero,cidade,uf].join(', ')} (${lat}, ${lon}). Confirme que corresponde ao destino.`))return;
        }
      } catch (e) {
        console.warn('Geocoding fallback:', e);
      }

      if (!this.validDeliveryCoordinates({lat,lon})) {
        alert('Endereço sem localização confiável. Informe coordenadas verificadas no cadastro manual.');
        return;
      }
    }

    const newDelivery = {
      id: 'del_' + crypto.randomUUID(),
      destinatario: destinatario,
      nome_fantasia: destinatario,
      numero_nota: nfe,
      itens_resumo: itens,
      complemento,observacoes,...(volumesValue!==''?{volumes:Number(volumesValue)}:{}),
      client_id:this.manualCompany?.client_id||'',address_id:this.manualCompany?.address_id||'',
      logradouro: logradouro,
      numero: numero,
      bairro: bairro,
      municipio: cidade,
      uf: uf,
      endereco_completo: [logradouro,numero,complemento,bairro,cidade,uf].filter(Boolean).join(', '),
      lat: lat,
      lon: lon,
      status: 'pending',
      geocoded_by:'manual_verified',
      created_at: new Date().toISOString()
    };

    if(context!==this.storageKey||snapshot()!==formSnapshot){alert('Os dados do planejamento mudaram durante a consulta. Confira o formulário antes de incluir a entrega.');return;}
    if(!this.addDelivery(newDelivery))return;
    this.manualCompany=null;this.pendingDanfeDelivery=null;

    // Reseta formulário
    document.getElementById('form-manual-delivery').reset();
    document.getElementById('form-cidade').value = 'Panambi';
    document.getElementById('form-uf').value = 'RS';
    document.getElementById('form-lat').value = '';
    document.getElementById('form-lon').value = '';
    document.getElementById('manual-client-search').value = '';
    document.getElementById('manual-suggestions-box').style.display = 'none';

    this.closeModal('modal-create-delivery');
    } finally {this.manualSubmitting=false;if(button)button.disabled=false;}
  }

  resetDanfeModal() {
    this.danfeAbort?.abort();this.danfeSequence=(this.danfeSequence||0)+1;this.pendingDanfeDelivery=null;
    document.getElementById('danfe-dropzone').style.display = 'flex';
    document.getElementById('danfe-preview-area').style.display = 'none';
    document.getElementById('ai-loading-danfe').style.display = 'none';
    document.getElementById('btn-confirm-danfe').style.display = 'none';
    document.getElementById('danfe-file-input').value = '';
  }

  // =========================================================================
  // BUSCA INTELIGENTE POR NOME DA EMPRESA
  // =========================================================================
  async handleSearchInput(query) {
    const listEl = document.getElementById('search-results-list');
    const loadingEl = document.getElementById('search-loading');

    clearTimeout(this.searchDebounceTimer);
    this.searchAbort?.abort();this.searchAbort=new AbortController();
    const sequence=this.searchSequence=(this.searchSequence||0)+1;

    if (!query || query.trim().length === 0) {
      this.loadDefaultSearchSuggestions();
      return;
    }

    loadingEl.style.display = 'block';

    this.searchDebounceTimer = setTimeout(async () => {
      try {
        const response = await window.entregasFetch(`api/search_company.php?mode=catalog&q=${encodeURIComponent(query.trim())}`,{signal:this.searchAbort.signal});
        const data = await response.json();
        if(sequence!==this.searchSequence)return;
        if(!response.ok)throw new Error(data.error||'Falha na consulta ao catálogo.');
        loadingEl.style.display = 'none';

        if (data.success && data.results && data.results.length > 0) {
          this.renderSearchResults(data.results);
        } else {
          listEl.innerHTML = `
            <div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 12px;">
              Nenhuma empresa encontrada com "${this.escapeHtml(query)}".
            </div>
          `;
        }
      } catch (err) {
        if(err.name!=='AbortError'&&sequence===this.searchSequence){loadingEl.style.display='none';listEl.textContent='Não foi possível consultar o catálogo. Tente novamente.';}
      }
    }, 350);
  }

  async loadDefaultSearchSuggestions() {
    const sequence=this.searchSequence=(this.searchSequence||0)+1;
    const listEl = document.getElementById('search-results-list');
    try {
      const response = await window.entregasFetch('api/search_company.php?mode=catalog');
      const data = await response.json();
      if(sequence!==this.searchSequence)return;
      if (response.ok && data.success && data.results) {
        this.renderSearchResults(data.results);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  renderSearchResults(results) {
    const listEl = document.getElementById('search-results-list');
    listEl.innerHTML = '';

    results.forEach(item => {
      const card = document.createElement('div');
      card.className = 'search-item';
      card.innerHTML = `
        <div class="search-item-info">
          <h4>${this.escapeHtml(item.fantasia || item.nome)}</h4>
          <p>${this.escapeHtml(item.logradouro || '')}${item.numero ? ', ' + this.escapeHtml(item.numero) : ''} • ${this.escapeHtml(item.bairro || 'Panambi')}</p>
        </div>
        <button style="background: var(--accent-emerald); border: none; color: #fff; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;">
          Conferir endereço
        </button>
      `;

      card.onclick = () => {
        this.addDeliveryFromCompany(item);
        this.closeModal('modal-search-company');
      };

      listEl.appendChild(card);
    });
  }

  async addDeliveryFromCompany(comp) {
    // Selecting a source record creates a delivery snapshot only after operator review.
    this.fillManualFormWithCompany(comp);
    this.openModal('modal-create-delivery');this.switchCreateTab('manual');

  }

  // =========================================================================
  // GEOLOCALIZAÇÃO DO MOTORISTA
  // =========================================================================
  locateDriver() {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        this.driverCoords = [lat, lon];

        if (this.driverMarker) {
          this.driverMarker.setLatLng([lat, lon]);
        } else {
          const icon = L.divIcon({
            className: 'custom-pin-driver',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          this.driverMarker = L.marker([lat, lon], { icon })
            .bindPopup('<b>Você está aqui</b>')
            .addTo(this.map);
        }

        this.map.setView([lat, lon], 15);
      },
      (err) => {
        alert('Não foi possível obter a sua localização GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // =========================================================================
  // EVENTOS E MODAIS
  // =========================================================================
  bindEvents() {
    this.bindManualSearch();

    // Botão de Câmera / Upload DANFE
    const danfeInput = document.getElementById('danfe-file-input');
    if (danfeInput) {
      danfeInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleDanfeUpload(e.target.files[0]);
        }
      });
    }

    // Drag and drop no dropzone
    const dropzone = document.getElementById('danfe-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleDanfeUpload(e.dataTransfer.files[0]);
        }
      });
    }

    // Input de busca inteligente
    const searchInput = document.getElementById('company-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value);
      });
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      if (modalId === 'modal-search-company') {
        const input = document.getElementById('company-search-input');
        if (input) {
          input.value = '';
          input.focus();
        }
        this.loadDefaultSearchSuggestions();
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // =========================================================================
  // PERSISTÊNCIA LOCAL
  // =========================================================================
  loadDeliveries() {
    try {
      const data = localStorage.getItem(this.storageKey);
      const stops = data ? JSON.parse(data) : [];
      if (!Array.isArray(stops) || stops.some(s => !s || typeof s !== 'object' || typeof s.id !== 'string')) throw new Error('cache');
      return stops;
    } catch (e) {
      this.localReadError = true;
      return [];
    }
  }

  showLocalStorageState() {
    const message = document.getElementById('local-storage-feedback');
    if (!message) return;
    const text = this.routeLoadFailed ? 'Não foi possível carregar a rota solicitada. Os dados locais foram preservados e não representam esta rota. Recarregue após restabelecer o acesso.' :
      this.localReadError ? 'Não foi possível ler o rascunho local. O conteúdo original foi preservado; baixe a cópia para revisão antes de recuperar este navegador.' :
      this.localWriteError ? 'Não foi possível salvar no navegador. As alterações estão somente nesta página; baixe uma cópia antes de sair. Isso não confirma salvamento no servidor.' : '';
    message.hidden = !text;
    message.querySelector('span').textContent = text;
  }

  downloadLocalRecovery() {
    let content;
    try { content = this.localReadError ? localStorage.getItem(this.storageKey) : JSON.stringify(this.deliveries, null, 2); }
    catch (_) { alert('O armazenamento local está indisponível. Não foi possível baixar o conteúdo original.'); return; }
    const url = URL.createObjectURL(new Blob([content ?? ''], {type:'application/json'}));
    const link = document.createElement('a');link.href = url;link.download = 'recuperacao-local-entregas.json';link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  saveDeliveries() {
    document.body.classList.remove('document-print-ready');
    if (this.localReadError || this.routeLoadFailed) { this.showLocalStorageState(); return false; }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.deliveries));
      this.localWriteError = false;
      this.showLocalStorageState();
      return true;
    } catch (e) {
      this.localWriteError = true;
      this.showLocalStorageState();
      return false;
    }
  }

  loadOrigin() {
    try {
      const data = localStorage.getItem(this.originKey);
      return data ? JSON.parse(data) : this.bases.plaswill;
    } catch (e) {
      return this.bases.plaswill;
    }
  }

  // =========================================================================
  // EXPORTAÇÃO, COMPARTILHAMENTO E IMPRESSÃO (URL, WHATSAPP, QR CODE & A4)
  // =========================================================================
  async openExportModal() {
    if (this.sharingLegacy || this.finishingLegacy) return;
    if (this.deliveries.length === 0) {
      alert('Adicione pelo menos 1 entrega à rota antes de exportar.');
      return;
    }

    const btn = document.querySelector('.btn-export-header');
    if (btn) btn.style.opacity = '0.5';
    this.sharingLegacy = true;

    try {
      let res;
      if (this.currentShareUrl) {
        try {
          const cached = new URL(this.currentShareUrl, window.location.href);
          const target = new URL('motorista.html', window.location.href);
          if (!this.currentRouteId || cached.origin !== target.origin || cached.pathname !== target.pathname || cached.searchParams.get('r') !== this.currentRouteId) this.clearShareUrl();
        } catch (_) { this.clearShareUrl(); }
      }
      if (this.currentRouteId && this.currentShareUrl) {
        res = {success:true,route_id:this.currentRouteId,share_url:this.currentShareUrl};
      } else if (this.currentRouteId) {
        if (!confirm('Gerar um novo link para esta rota? O link anterior deixará de funcionar.')) return;
        const response = await window.entregasFetch('api/issue_route_access.php', {
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({route_id:this.currentRouteId})
        });
        res = await response.json();
        if (!response.ok || !res.success) throw new Error(res.error || 'Falha ao emitir acesso');
        res.route_id = this.currentRouteId;
      } else {
        res = await this.saveLegacyRoute({stops:this.deliveries,origin:this.currentOrigin});
      }
      this.currentRouteId = res.route_id;
      localStorage.setItem('plaswill_active_route_id', this.currentRouteId);
      if (!res.share_url) {
        this.clearShareUrl();
        alert('O despacho anterior foi confirmado e a mesma rota foi recuperada. Clique em Compartilhar para emitir um novo acesso; o anterior será revogado.');
        return;
      }
      this.presentShareUrl(res.share_url);
    } catch (err) {
      alert('Erro ao gerar link de compartilhamento: ' + err.message);
    } finally {
      this.sharingLegacy = false;
      if (btn) btn.style.opacity = '1';
    }
  }

  async saveLegacyRoute(body) {
    if (this.localReadError || this.routeLoadFailed) throw new Error('Recupere os dados locais ou a rota antes de despachar.');
    const key = 'plaswill_pending_dispatch_v1';
    let pending;
    try { pending = JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (_) { throw new Error('Não foi possível ler o envio pendente. Preserve a cópia local para revisão antes de despachar.'); }
    const serialized = JSON.stringify(body);
    if (pending && (typeof pending.operation_id !== 'string' || pending.body !== serialized)) throw new Error('Existe um envio sem confirmação com outro planejamento. Preserve os dados e recupere esse envio antes de criar outra rota.');
    if (!pending) {
      pending = {operation_id:crypto.randomUUID(),body:serialized};
      try { localStorage.setItem(key, JSON.stringify(pending)); }
      catch (_) { throw new Error('Não foi possível preservar o identificador de envio no navegador. Nenhuma rota foi criada.'); }
    }
    const response = await window.entregasFetch('api/save_route.php', {
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,operation_id:pending.operation_id})
    });
    const result = await response.json();
    if (!response.ok || result.success !== true || !/^ROT-[A-Z0-9]{4}$/.test(result.route_id) || result.total_stops !== body.stops.length) throw new Error(result.error || 'Não foi possível confirmar o despacho. O identificador foi preservado para repetir com segurança.');
    this.currentRouteId = result.route_id;
    try { localStorage.setItem('plaswill_active_route_id', result.route_id); localStorage.removeItem(key); }
    catch (_) { this.localWriteError = true; this.showLocalStorageState(); }
    return result;
  }

  clearShareUrl() {
    this.currentShareUrl = null;
    const input = document.getElementById('export-share-url-input');
    if (input) input.value = '';
    document.getElementById('btn-whatsapp-share')?.removeAttribute('href');
    for (const id of ['export-qrcode-box', 'print-qrcode-canvas']) document.getElementById(id)?.replaceChildren();
  }

  presentShareUrl(shareUrl) {
      this.clearShareUrl();
      if (typeof shareUrl !== 'string') throw new Error('O servidor não retornou um acesso válido para o motorista.');
      const url = new URL(shareUrl, window.location.href);
      const target = new URL('motorista.html', window.location.href);
      if (url.origin !== target.origin || url.pathname !== target.pathname || url.searchParams.get('r') !== this.currentRouteId || !/^#token=[a-f0-9]{64}$/.test(url.hash)) throw new Error('Link do motorista incompatível com a rota selecionada.');
      this.currentShareUrl = url.href;

      // Preenche o campo de URL
      const urlInput = document.getElementById('export-share-url-input');
      if (urlInput) urlInput.value = this.currentShareUrl;

      // Link do WhatsApp com mensagem pré-formatada
      const total = this.deliveries.length;
      const originName = this.currentOrigin.name || 'Expedição';
      const waText = encodeURIComponent(
        `*ROTA DE ENTREGAS PLASWILL*\n` +
        `Olá! Sua rota de entregas está pronta com *${total} paradas*.\n` +
        `Ponto de Partida: ${originName}\n\n` +
        `*Acesse a rota do motorista no celular:*\n${this.currentShareUrl}\n\n` +
        `_(Com botões diretos de Waze, Google Maps e confirmação de entrega)_`
      );
      const waBtn = document.getElementById('btn-whatsapp-share');
      if (waBtn) {
        waBtn.href = `https://api.whatsapp.com/send?text=${waText}`;
      }

      // Gera o QR Code no modal
      const qrBox = document.getElementById('export-qrcode-box');
      if (qrBox && typeof QRCode !== 'undefined') {
        qrBox.innerHTML = '';
        new QRCode(qrBox, {
          text: this.currentShareUrl,
          width: 88,
          height: 88,
          colorDark: '#0b1120',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }

      // Printed documents do not embed driver credentials; sharing remains a separate action.
      this.openModal('modal-export-route');
  }

  copyShareUrl() {
    const input = document.getElementById('export-share-url-input');
    const btn = document.getElementById('btn-copy-share-url');
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value);
    } else {
      document.execCommand('copy');
    }

    if (btn) {
      const oldText = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Copiado!</span>';
      btn.style.background = 'var(--accent-emerald)';
      setTimeout(() => {
        btn.innerHTML = oldText;
        btn.style.background = '';
      }, 2000);
    }
  }

  async printRomaneio() {
    return this.printDocument('romaneio');
  }

  async printReport() {
    return this.printDocument('report');
  }

  async printDocument(kind) {
    if (this.printingDocument) return false;
    this.printingDocument = true;
    document.body.classList.remove('document-print-ready');
    document.getElementById('print-table-body').replaceChildren();
    document.getElementById('print-qrcode-canvas').replaceChildren();
    const feedback = document.getElementById('document-feedback');
    if (feedback) feedback.textContent = 'Consultando os dados salvos no servidor…';
    const manager = window.routineManager;
    const routineId = manager?.current?.routine_id || null;
    const routeId = this.currentRouteId || null;
    const editablePending = () => manager && (manager.dirty || manager.saving || manager.resolving || manager.pendingConflict);
    try {
      if (!routineId && !routeId) throw new Error('Salve uma rotina no servidor antes de gerar documentos. O planejamento apenas local não é um despacho.');
      if (editablePending()) throw new Error('Existem alterações locais ou conflito. Salve e confira a versão do servidor antes de gerar o documento.');
      const read = async path => {
        const response = await window.entregasFetch(path, {cache:'no-store'});
        const data = await response.json();
        if (!response.ok || data.success !== true) throw new Error(data.error || 'Não foi possível consultar os dados do documento.');
        return data;
      };
      let routine = null, route = null;
      if (routineId) {
        routine = (await read('api/routine_read.php?id=' + encodeURIComponent(routineId))).routine;
        if (routine?.routine_id !== routineId || (routine.route_id || null) !== routeId) throw new Error('A associação da rotina mudou. Reabra a rotina antes de imprimir.');
      } else {
        route = (await read('api/get_route.php?r=' + encodeURIComponent(routeId))).route;
        if (route?.route_id !== routeId) throw new Error('A resposta não corresponde à rota selecionada.');
        if (route.routine_id) {
          routine = (await read('api/routine_read.php?id=' + encodeURIComponent(route.routine_id))).routine;
          if (routine?.routine_id !== route.routine_id || routine.route_id !== routeId) throw new Error('A associação da rota não pôde ser confirmada.');
        }
      }
      if ((manager?.current?.routine_id || null) !== routineId || (this.currentRouteId || null) !== routeId || editablePending()) throw new Error('A seleção ou o planejamento mudou durante a consulta. Confira a rotina e tente novamente.');
      const record = routine || route;
      if (!record || !Array.isArray(record.stops) || record.stops.some(stop => !stop || typeof stop.id !== 'string')) throw new Error('Documento recebido sem entregas válidas.');
      if (kind === 'romaneio' && !routeId) throw new Error('A rotina ainda não foi despachada. Use Exportar relatório para consultar o planejamento salvo.');
      const names = {draft:'Rascunho', planned:'Planejada', dispatched:'Despachada', in_progress:'Em andamento', finished:'Finalizada', cancelled:'Cancelada'};
      const status = routine?.status || route?.status || 'dispatched';
      const set = (id, value) => document.getElementById(id).textContent = value === null || value === undefined || value === '' ? 'Não informado' : String(value);
      set('print-document-title', kind === 'romaneio' ? 'ROMANEIO DE ENTREGAS' : 'RELATÓRIO DA ROTINA');
      set('print-document-state', names[status] || status);
      set('print-document-notice', status === 'cancelled' ? 'CANCELADA — DOCUMENTO PARA CONFERÊNCIA, NÃO UTILIZAR PARA ENTREGA' : !routeId ? 'PLANEJAMENTO SALVO — NÃO DESPACHADO' : status === 'finished' ? 'FINALIZADA — DOCUMENTO PARA CONSULTA' : 'Dados confirmados no servidor');
      set('print-route-code', routeId || 'Não despachada');
      set('print-routine-code', routine?.routine_id || 'Rota legada sem rotina vinculada');
      set('print-routine-name', routine?.name || 'Não informado');
      const operational = routine?.scheduled_date || route?.created_at;
      const date = operational && /^\d{4}-\d{2}-\d{2}$/.test(operational) ? new Date(operational + 'T12:00:00') : new Date(operational || '');
      set('print-route-date', Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR'));
      set('print-driver', record.motorista);
      set('print-vehicle', record.veiculo);
      set('print-route-origin', [record.origin?.name, record.origin?.address].filter(Boolean).join(' — '));
      set('print-route-total', record.stops.length);
      const delivered = record.stops.filter(stop => stop.status === 'delivered').length;
      const percent = record.stops.length ? Math.round(delivered * 1000 / record.stops.length) / 10 : 0;
      set('print-progress', `${delivered} / ${record.stops.length} entregues · ${record.stops.length - delivered} pendentes · ${percent}%`);
      set('print-notes', [record.notes, record.observacoes_fechamento, record.cancellation_reason].filter(Boolean).join(' / '));
      set('print-issued-at', new Date().toLocaleString('pt-BR'));
      document.getElementById('print-signature-fields').hidden = kind !== 'romaneio';
      const tbody = document.getElementById('print-table-body');
      const columns = ['#','NF-e','Destinatário','Endereço completo','Mercadorias / volumes',kind === 'romaneio' ? 'Conferência / assinatura' : 'Situação / observações'];
      document.getElementById('print-table-head').replaceChildren(...columns.map(label => { const th = document.createElement('th');th.textContent = label;return th; }));
      record.stops.forEach((stop, index) => {
        const tr = document.createElement('tr');
        const address = [stop.logradouro, stop.numero, stop.complemento, stop.bairro, stop.municipio, stop.uf, stop.cep].filter(Boolean).join(', ') || stop.endereco_completo || 'Não informado';
        const cargo = [stop.itens_resumo, stop.volumes === null || stop.volumes === undefined ? 'Volumes não informados' : `${stop.volumes} ${stop.volumes === 1 ? 'volume' : 'volumes'}`].filter(Boolean).join(' / ');
        const values = [index + 1, stop.numero_nota || 'Não informada', stop.destinatario || stop.nome_fantasia || 'Não informado', address, cargo,
          kind === 'romaneio' ? [stop.observacoes, 'Conferido por: __________________'].filter(Boolean).join(' / ') : [stop.status === 'delivered' ? 'Entregue' : 'Pendente', stop.observacoes].filter(Boolean).join(' / ')];
        for (const value of values) { const td = document.createElement('td');td.textContent = value;tr.appendChild(td); }
        tbody.appendChild(tr);
      });
      document.body.classList.add('document-print-ready');
      if (feedback) feedback.textContent = 'Documento preparado com os dados confirmados no servidor. Escolha a impressora ou Salvar como PDF.';
      window.print();
      return true;
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
      alert(error.message);
      return false;
    } finally { this.printingDocument = false; }
  }

  async checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const routeId = params.get('r') || params.get('id') || (!params.has('routine') ? this.currentRouteId : null);
    if (!routeId) return false;
    try {
      if (!/^ROT-[A-Z0-9]{4}$/.test(routeId)) throw new Error('Rota inválida');
      const response = await window.entregasFetch(`api/get_route.php?r=${encodeURIComponent(routeId)}`);
      const data = await response.json();
      if (!response.ok || data.success !== true || data.route?.route_id !== routeId || !Array.isArray(data.route.stops)) throw new Error('Resposta da rota inválida');
      this.routeLoadFailed = false;
      document.body.classList.remove('document-print-ready');
      this.currentRouteId = routeId;
      this.deliveries = data.route.stops;
      if (data.route.origin) { this.currentOrigin = data.route.origin; this.updateOriginMarker(); }
      // Server reads do not overwrite an unrelated local draft or corrupted recovery copy.
      const banner = document.getElementById('route-received-banner');
      const desc = document.getElementById('route-received-desc');
      if (banner) banner.style.display = 'flex';
      if (desc) desc.textContent = `Rota ${routeId} carregada do servidor com ${this.deliveries.length} entregas. Use Compartilhar para emitir um acesso autorizado ao motorista.`;
      return true;
    } catch (_) {
      this.routeLoadFailed = true;
      this.deliveries = [];
      this.showLocalStorageState();
      return false;
    }
  }

  // =========================================================================
  // GESTÃO DO CICLO DE VIDA DA ROTINA DE ENTREGAS (FINALIZAR & HISTÓRICO)
  // =========================================================================
  openFinishRotinaModal() {
    if (this.deliveries.length === 0) {
      alert('Nenhuma entrega registrada na rotina atual para finalizar.');
      return;
    }

    const total = this.deliveries.length;
    const delivered = this.deliveries.filter(d => d.status === 'delivered').length;
    const pending = total - delivered;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 100;

    const totalEl = document.getElementById('finish-total-stops');
    const delEl = document.getElementById('finish-delivered-stops');
    const pendEl = document.getElementById('finish-pending-stops');
    const rateEl = document.getElementById('finish-rate-stops');

    if (totalEl) totalEl.textContent = total;
    if (delEl) delEl.textContent = delivered;
    if (pendEl) pendEl.textContent = pending;
    if (rateEl) rateEl.textContent = `${rate}%`;

    this.openModal('modal-finish-rotina');
  }

  async confirmFinishRotina() {
    if (this.finishingLegacy || this.sharingLegacy) return;
    const total = this.deliveries.length;
    if (total === 0) return;

    const motorista = document.getElementById('finish-driver-name')?.value?.trim() || '';
    const veiculo = document.getElementById('finish-vehicle-name')?.value?.trim() || '';
    const observacoes = document.getElementById('finish-notes')?.value?.trim() || '';

    this.finishingLegacy = true;
    try {
      if (!this.currentRouteId) {
        await this.saveLegacyRoute({stops:this.deliveries,origin:this.currentOrigin,motorista,veiculo});
      }
      const response = await window.entregasFetch('api/finish_route.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: this.currentRouteId || null,
          stops: this.deliveries,
          motorista: motorista,
          veiculo: veiculo,
          observacoes: observacoes
        })
      });

      const res = await response.json();
      if (response.ok && res.success === true && res.route_id === this.currentRouteId && Number.isInteger(res.total_stops) && Number.isInteger(res.delivered_stops) && Number.isInteger(res.pending_stops) && res.delivered_stops + res.pending_stops === res.total_stops) {
        // Limpa estado ativo
        this.deliveries = [];
        this.currentRouteId = null;
        this.clearShareUrl();
        localStorage.removeItem('plaswill_active_route_id');
        this.saveDeliveries();

        // Limpa URL
        if (window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const banner = document.getElementById('route-received-banner');
        if (banner) banner.style.display = 'none';

        this.renderStopsList();
        this.updateMapMarkers();
        this.closeModal('modal-finish-rotina');

        alert(`✅ Rotina ${res.route_id} finalizada com sucesso e arquivada no histórico!\nA lista de entregas está limpa e pronta para uma nova rotina.`);
      } else {
        alert('Erro ao finalizar rotina: ' + (res.error || res.message || 'Erro desconhecido'));
      }
    } catch (e) {
      console.error('Falha ao finalizar rotina:', e);
      alert('Erro de conexão ao finalizar rotina.');
    } finally {
      this.finishingLegacy = false;
    }
  }

  async openHistoryModal() {
    this.openModal('modal-rotinas-history');
    const container = document.getElementById('rotinas-history-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 25px; color: var(--pw-text-dim);">Carregando histórico corporativo...</div>';

    try {
      const response = await window.entregasFetch('api/get_history.php');
      const data = await response.json();

      if (!data.success || !data.history || data.history.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 35px 20px; color: #64748b;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <p style="font-size: 0.9rem; font-weight: 600; color: #94a3b8;">Nenhuma rotina finalizada ainda</p>
            <p style="font-size: 0.8rem;">Quando você concluir uma rotina de entregas, ela ficará arquivada com todos os dados aqui.</p>
          </div>
        `;
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
      data.history.forEach(item => {
        const isComplete = (item.completion_rate || 0) >= 100;
        const rateColor = isComplete ? '#10b981' : '#f59e0b';
        html += `
          <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-family: monospace; font-weight: 800; color: #FFF212; font-size: 0.95rem;">${this.escapeHtml(item.route_id)}</span>
                <span style="background: rgba(255,255,255,0.06); padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; color: #94a3b8;">${this.escapeHtml(item.data_formatada || '')}</span>
                <span style="background: ${isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color: ${rateColor}; border: 1px solid ${rateColor}44; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">
                  ${item.delivered_stops}/${item.total_stops} (${item.completion_rate}%)
                </span>
              </div>
              <div style="font-size: 0.8rem; color: #cbd5e1;">
                <b>Motorista:</b> ${this.escapeHtml(item.motorista || 'Expedição')} • <b>Veículo:</b> ${this.escapeHtml(item.veiculo || 'Utilitário')}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button data-archive-route="${this.escapeHtml(item.route_id)}" style="background: rgba(255, 242, 18, 0.15); border: 1px solid #FFF212; color: #FFF212; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                Visualizar Rota
              </button>
            </div>
          </div>
        `;
      });
      html += '</div>';

      container.innerHTML = html;
      container.querySelectorAll('[data-archive-route]').forEach(btn => btn.addEventListener('click', () => this.loadArchivedRoute(btn.dataset.archiveRoute)));
    } catch (e) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Erro ao carregar histórico corporativo.</div>';
    }
  }

  async loadArchivedRoute(routeId, beforeApply = () => {}) {
    if (this.deliveries.length > 0) {
      if (!confirm('Você tem paradas ativas na tela. Deseja substituí-las pela rota arquivada ' + routeId + '?')) {
        return false;
      }
    }
    const request = this.archiveSequence = (this.archiveSequence || 0) + 1;
    const snapshot = this.planningContext();
    const isCurrent = () => request === this.archiveSequence && this.planningContext() === snapshot;
    try {
      if (!/^ROT-[A-Z0-9]{4}$/.test(routeId)) throw new Error('Rota inválida');
      const response = await window.entregasFetch(`api/get_route.php?r=${encodeURIComponent(routeId)}`);
      const data = await response.json();
      if (!isCurrent()) return false;
      if (response.ok && data.success && data.route?.route_id === routeId && Array.isArray(data.route.stops)) {
        beforeApply();
        document.body.classList.remove('document-print-ready');
        this.clearShareUrl();
        this.deliveries = data.route.stops;
        this.currentRouteId = routeId;
        if (data.route.origin) {
          this.currentOrigin = data.route.origin;
          this.updateOriginMarker();
        }
        this.saveDeliveries();
        this.renderStopsList();
        this.updateMapMarkers();
        this.closeModal('modal-rotinas-history');
        alert(`Rota arquivada ${routeId} carregada com sucesso!`);
        return true;
      } else {
        alert('Não foi possível carregar os dados desta rota.');
      }
    } catch (e) {
      if (!isCurrent()) return false;
      alert('Erro ao carregar rota arquivada: ' + e.message);
    }
    return false;
  }

  setOrigin(baseId) {
    if (this.sharingLegacy || this.finishingLegacy) return false;
    if (this.bases[baseId]) {
      this.currentOrigin = this.bases[baseId];
      localStorage.setItem(this.originKey, JSON.stringify(this.currentOrigin));
      this.updateOriginMarker();
      this.updateMapMarkers();
      this.closeModal('modal-settings');
      alert(`Origem definida para: ${this.currentOrigin.name}`);
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

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.planner = new DeliveryPlanner();
});
