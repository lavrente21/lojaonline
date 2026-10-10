(function () {
  'use strict';
  const KEY = 'lumina_cookie_consent_v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
  const save = value => { localStorage.setItem(KEY, JSON.stringify({ ...value, updatedAt: new Date().toISOString() })); window.dispatchEvent(new CustomEvent('lumina:consent-changed', { detail: value })); };
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/css/cookie-consent.css'; document.head.appendChild(css);
  function show() {
    if (document.getElementById('lumina-cookie-banner')) return;
    const current = read();
    const banner = document.createElement('section'); banner.id = 'lumina-cookie-banner'; banner.className = 'lumina-cookie-banner'; banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-label', 'Preferências de cookies');
    const title = document.createElement('h2'); title.textContent = 'A sua privacidade importa';
    const desc = document.createElement('p'); desc.textContent = 'Utilizamos apenas cookies necessários para o funcionamento da loja. Analytics e publicidade, se vierem a ser ativados, só serão carregados após consentimento.';
    const actions = document.createElement('div'); actions.className = 'lumina-cookie-actions';
    const button = (label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = cls || ''; b.addEventListener('click', fn); actions.appendChild(b); };
    const close = value => { save(value); banner.remove(); };
    button('Aceitar opcionais', () => close({ necessary: true, analytics: true, marketing: true }), 'primary');
    button('Rejeitar opcionais', () => close({ necessary: true, analytics: false, marketing: false }));
    button('Personalizar', () => { const analytics = window.confirm('Autoriza cookies de análise estatística?'); const marketing = analytics && window.confirm('Autoriza cookies de publicidade?'); close({ necessary: true, analytics, marketing }); });
    button('Alterar escolha', () => { localStorage.removeItem(KEY); banner.remove(); show(); });
    banner.append(title, desc, actions); document.body.appendChild(banner);
  }
  window.LuminaCookies = { get: read, open: () => { localStorage.removeItem(KEY); show(); } };
  document.addEventListener('click', event => { const trigger=event.target.closest('[data-cookie-preferences]'); if(trigger){event.preventDefault();window.LuminaCookies.open();} });
  if (!read()) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true }); else show(); }
})();
