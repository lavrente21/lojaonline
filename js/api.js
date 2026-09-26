// URL pública da API Render. Pode ser sobrescrita antes de carregar este ficheiro:
// window.LUMINA_API_BASE_URL = 'https://SEU-SERVICO.onrender.com/api';
const API_BASE_URL = (window.LUMINA_API_BASE_URL || 'https://lojaonline-backend.onrender.com/api').replace(/\/$/,'');
function obterTokenCliente(){return localStorage.getItem('lumina_cliente_token')}
function guardarTokenCliente(t){localStorage.setItem('lumina_cliente_token',t)}
function limparTokenCliente(){localStorage.removeItem('lumina_cliente_token')}
async function apiFetch(caminho,opcoes={}){const token=obterTokenCliente();const headers=Object.assign({},opcoes.headers||{});if(!(opcoes.body instanceof FormData))headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;const r=await fetch(API_BASE_URL+caminho,{...opcoes,headers});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.erro||'Erro ao contactar o servidor.');return d}
