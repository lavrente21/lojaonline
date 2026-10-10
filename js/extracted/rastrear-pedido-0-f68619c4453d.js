  function escaparRastreio(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  const NOMES_ESTADO = {
    novo: 'Pendente de confirmação', pago: 'Pago', cancelado: 'Cancelado', processando: 'Em processamento',
    enviado_ao_agente: 'Enviado ao agente de carga', a_caminho: 'A caminho',
    a_caminho_destino_final: 'A caminho do destino final', entregue: 'Entregue'
  };
  document.getElementById('rt-botao').addEventListener('click', async () => {
    const numero = document.getElementById('rt-numero').value.trim();
    const resultadoEl = document.getElementById('rt-resultado');
    if(!numero){ return; }
    resultadoEl.innerHTML = '<p style="font-size:14px;color:#8A7A70">A procurar...</p>';
    try{
      const email = document.getElementById('rt-email').value.trim();
      if(!email){resultadoEl.textContent='Introduza o e-mail usado na encomenda.';return;}
      const pedido = await apiFetch('/pedidos/rastrear/' + encodeURIComponent(numero)+'?email='+encodeURIComponent(email));
      let linhasFornecedor = Object.entries(pedido.fornecedores || {}).map(([forn, dados]) => `
        <div class="linha-resumo"><span>Fornecedor (${escaparRastreio(forn)})</span><span></span></div>
        ${dados.rastreio1 ? `<div class="linha-resumo"><span>Rastreio (fornecedor → agente)</span><span>${escaparRastreio(dados.rastreio1)}</span></div>` : ''}
        ${dados.rastreio2 ? `<div class="linha-resumo"><span>Rastreio (agente → destino)</span><span>${escaparRastreio(dados.rastreio2)}</span></div>` : ''}
      `).join('');
      resultadoEl.innerHTML = `
        <div class="cartao-conta" style="text-align:left">
          <h2>Encomenda #${pedido.numeroPedido}</h2>
          <p style="margin-bottom:14px"><span class="badge-status enviado">${escaparRastreio(NOMES_ESTADO[pedido.estado] || pedido.estado)}</span></p>
          ${linhasFornecedor || '<p style="font-size:13.5px;color:#8A7A70">Ainda sem informação de fornecedor (aguarda confirmação de pagamento).</p>'}
        </div>`;
    }catch(e){
      resultadoEl.textContent = 'Não foi possível encontrar essa encomenda: '+e.message;
    }
  });
