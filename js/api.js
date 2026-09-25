// Ponto único de ligação ao backend. Se mudar o endereço da API (ex: ao
// publicar em produção), só precisa de alterar esta linha.
const API_BASE_URL = 'http://localhost:3000/api';

function obterTokenCliente() { return localStorage.getItem('lumina_cliente_token'); }
function guardarTokenCliente(t) { localStorage.setItem('lumina_cliente_token', t); }
function limparTokenCliente() { localStorage.removeItem('lumina_cliente_token'); }

async function apiFetch(caminho, opcoes = {}) {
  const token = obterTokenCliente();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opcoes.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const resposta = await fetch(API_BASE_URL + caminho, Object.assign({}, opcoes, { headers }));
  let dados = {};
  try { dados = await resposta.json(); } catch (e) {}
  if (!resposta.ok) throw new Error(dados.erro || 'Ocorreu um erro ao contactar o servidor.');
  return dados;
}
