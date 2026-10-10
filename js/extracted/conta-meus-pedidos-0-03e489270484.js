  if(!obterTokenCliente()){ window.location.href = 'login.html'; }
  (async () => {
    try{
      const pedidos = await apiFetch('/pedidos/meus');
      const tabela = document.getElementById('mp-tabela');
      if(pedidos.length === 0){
        tabela.innerHTML = '<tr><th>Encomenda</th><th>Data</th><th>Estado</th><th>Total</th><th></th></tr><tr><td colspan="5" style="text-align:center;color:#8A7A70">Ainda não fez nenhuma encomenda.</td></tr>';
        return;
      }
      tabela.innerHTML = '<tr><th>Encomenda</th><th>Data</th><th>Estado</th><th>Total</th><th></th></tr>' +
        pedidos.map(p => `
          <tr>
            <td>#${p.numeroPedido}</td>
            <td>${new Date(p.criadoEm).toLocaleDateString('pt-PT')}</td>
            <td><span class="badge-status">${estadoPT(p.estado)}</span></td>
            <td>${Number(p.totalEUR||0).toFixed(2)} €</td>
            <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}" style="color:var(--terracota-escuro);font-size:13px">Ver</a></td>
          </tr>`).join('');
    }catch(e){
      document.getElementById('mp-tabela').textContent = 'Erro ao carregar: ' + String(e.message || 'Tente novamente.');
    }
  })();
