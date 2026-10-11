window.LUMINA_API_BASE_URL = "https://lojaonline-backend.onrender.com";
window.LUMINA_SITE_URL = "https://aolumina.netlify.app/";
window.LUMINA_LEGAL_VALIDADO = false;
if (window.LUMINA_LEGAL_VALIDADO) document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.aviso-legal-rascunho').forEach(el => { el.hidden = true; }));
if (!window.LUMINA_API_BASE_URL) { console.error('Lúmina: LUMINA_API_BASE_URL não foi configurada no build; chamadas à API desativadas.'); document.addEventListener('DOMContentLoaded', () => { const aviso=document.createElement('div'); aviso.setAttribute('role','alert'); aviso.style.cssText='padding:12px;background:#fff3cd;color:#664d03;text-align:center'; aviso.textContent='A loja está temporariamente indisponível. Configuração do serviço em falta.'; document.body.prepend(aviso); }); }
