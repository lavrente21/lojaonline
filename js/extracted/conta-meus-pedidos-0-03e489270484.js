  if(!obterTokenCliente()){ window.location.href = 'login.html'; }
  document.addEventListener('DOMContentLoaded', async () => {
    const T = t => (typeof tr === 'function' ? tr(t) : t);
    const tabela = document.getElementById('mp-tabela');
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const cab = `<tr><th>${esc(T('Encomenda'))}</th><th>${esc(T('Data'))}</th><th>${esc(T('Estado'))}</th><th>${esc(T('Total'))}</th><th></th></tr>`;
    try{
      const pedidos = await apiFetch('/pedidos/meus');
      if(pedidos.length === 0){
        tabela.innerHTML = cab + `<tr><td colspan="5" style="text-align:center;color:#8A7A70">${esc(T('Ainda não fez nenhuma encomenda.'))} <a href="../loja.html" style="text-decoration:underline">${esc(T('Ver produtos'))}</a></td></tr>`;
        return;
      }
      const loc = (window.LUMINA && LUMINA.lang && ({pt:'pt-PT',en:'en-US',es:'es-ES',fr:'fr-FR'})[LUMINA.lang()]) || 'pt-PT';
      tabela.innerHTML = cab + pedidos.map(p => {
        const acao = p.estado === 'aguarda_pagamento' ? T('Pagar / enviar comprovativo') : T('Ver');
        const destaque = p.estado === 'aguarda_pagamento' ? 'font-weight:600;' : '';
        const total = p.estado === 'aguarda_confirmacao_portes' ? `${Number(p.totalEUR||0).toLocaleString(loc,{style:'currency',currency:'EUR'})} + ${esc(T('portes'))}` : Number(p.totalEUR||0).toLocaleString(loc,{style:'currency',currency:'EUR'});
        return `<tr>
          <td>#${esc(p.numeroPedido)}</td>
          <td>${new Date(p.criadoEm).toLocaleDateString(loc)}</td>
          <td><span class="badge-status ${classeEstadoPedido(p.estado)}">${esc(estadoPT(p.estado))}</span></td>
          <td>${total}</td>
          <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}" style="color:var(--terracota-escuro);font-size:13px;${destaque}">${esc(acao)}</a></td>
        </tr>`;}).join('');
    }catch(e){
      tabela.textContent = T('Erro ao carregar:') + ' ' + String(e.message || T('Tente novamente.'));
    }
  });
