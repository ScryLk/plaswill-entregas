/* Same-origin operator session. Driver capability requests do not use this module. */
(() => {
  let state = null;
  const status = document.getElementById('corporate-session-status');
  const login = document.getElementById('corporate-login');
  const logout = document.getElementById('corporate-logout');
  function render(message) {
    if (status) status.textContent = message || (state?.authenticated ?
      `${state.user.id}${state.user.roles.some(r => ['operator', 'administrator'].includes(r)) ? '' : ' • somente leitura'}` : 'Acesso corporativo necessário');
    if (login) login.hidden = !!state?.authenticated || !state?.login_available;
    if (logout) logout.hidden = (!state?.authenticated && !state?.logout_available) || state?.mode !== 'oauth2';
  }
  async function refresh() {
    try {
      const response = await fetch('api/auth_session.php', {cache:'no-store', credentials:'same-origin', signal:AbortSignal.timeout(20000)});
      const data = await response.json();
      if (response.status === 503 && data.logout_available) { state = data; render('Serviço de identidade indisponível. Você pode encerrar a sessão local.'); return; }
      if (!response.ok) throw new Error('Sessão indisponível. Tente entrar novamente.');
      state = data; render();
    } catch (_) { state = null; render('Serviço de identidade indisponível.'); }
  }
  const ready = refresh();
  window.entregasFetch = async (url, options = {}) => {
    await ready;
    const target = new URL(url, location.href);
    const headers = new Headers(options.headers);
    const method = (options.method || 'GET').toUpperCase();
    if (target.origin === location.origin && method === 'POST' && state?.csrf_token && !headers.has('Authorization')) headers.set('X-CSRF-Token', state.csrf_token);
    const response = await fetch(url, {...options, headers, credentials:'same-origin'});
    if (target.origin === location.origin && response.status === 401) {
      state = {...state, authenticated:false}; render('Sua sessão expirou. Entre novamente pelo GED.');
    }
    if (target.origin === location.origin && response.status === 503) render('Serviço temporariamente indisponível. Tente novamente.');
    return response;
  };
  logout?.addEventListener('click', async () => {
    try {
      const response = await window.entregasFetch('api/auth_logout.php', {method:'POST'});
      if (response.ok) { state = {...state, authenticated:false, logout_available:false, login_available:true, csrf_token:null}; render('Sessão do Entregas encerrada.'); }
      else render('Não foi possível encerrar a sessão. Tente novamente.');
    } catch (_) { render('Não foi possível encerrar a sessão. Tente novamente.'); }
  });
})();
