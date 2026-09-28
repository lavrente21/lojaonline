// URL pública da API Render. Pode ser sobrescrita antes de carregar este ficheiro:
// window.LUMINA_API_BASE_URL = 'https://SEU-SERVICO.onrender.com/api';
const API_BASE_URL = (window.LUMINA_API_BASE_URL || 'https://lojaonline-backend.onrender.com/api').replace(/\/$/,'');
function obterTokenCliente(){return localStorage.getItem('lumina_cliente_token')}
function guardarTokenCliente(t){localStorage.setItem('lumina_cliente_token',t)}
function limparTokenCliente(){localStorage.removeItem('lumina_cliente_token')}
async function apiFetch(caminho,opcoes={}){const token=obterTokenCliente();const headers=Object.assign({},opcoes.headers||{});if(!(opcoes.body instanceof FormData))headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;const r=await fetch(API_BASE_URL+caminho,{...opcoes,headers});let d={};try{d=await r.json()}catch{}if(r.status===401&&token&&!caminho.includes('/login')){limparTokenCliente();location.href=(location.pathname.includes('/conta/')?'':'conta/')+'login.html';throw new Error('Sessão expirada.')}if(!r.ok)throw new Error(d.erro||'Erro ao contactar o servidor.');return d}
const ESTADOS_PEDIDO_PT={novo:'Aguarda pagamento',pago:'Pago',processando:'Em processamento',enviado_ao_agente:'Enviado ao agente de carga',a_caminho:'A caminho',a_caminho_destino_final:'A caminho do destino final',entregue:'Entregue',cancelado:'Cancelado'};
function estadoPT(e){return ESTADOS_PEDIDO_PT[e]||e}
document.addEventListener('DOMContentLoaded',()=>{if(obterTokenCliente())document.querySelectorAll('a[href$="conta/login.html"]').forEach(a=>{a.href=a.getAttribute('href').replace('login.html','painel.html')})});
