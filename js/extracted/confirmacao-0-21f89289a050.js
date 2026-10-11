(function(){
  const params = new URLSearchParams(window.location.search);
  const numero = (params.get('numero') || '').trim();
  const $c = id => document.getElementById(id);
  const T = t => (typeof tr === 'function' ? tr(t) : t);

  function emailGuardado(){
    try{
      const o = JSON.parse(sessionStorage.getItem('lumina_ultimo_pedido') || 'null');
      if(o && o.numero === numero && o.email) return o.email;
    }catch(e){}
    return '';
  }

  async function carregar(email){
    const erro = $c('conf-detalhes-erro'), painel = $c('conf-painel'), form = $c('conf-consulta-form');
    erro.textContent = '';
    painel.textContent = T('A consultar…');
    try{
      const d = await LuminaPedido.buscar(numero, email);
      try{ sessionStorage.setItem('lumina_ultimo_pedido', JSON.stringify({ numero, email, ts: Date.now() })); }catch(e){}
      form.hidden = true;
      LuminaPedido.render(painel, d, { numero, email, aoAtualizar: () => carregar(email) });
      atualizarMensagens(d.estado);
    }catch(e){
      painel.textContent = '';
      form.hidden = false;
      erro.textContent = e.message || T('Não foi possível consultar a encomenda.');
    }
  }

  function atualizarMensagens(estado){
    const msg = $c('conf-mensagem'), prazo = $c('conf-prazo');
    const base = {
      aguarda_confirmacao_portes: ['Recebemos a sua encomenda', 'Vamos confirmar os portes e enviar-lhe por e-mail o valor final e os dados de pagamento. Ainda não precisa de pagar.'],
      aguarda_pagamento: ['Portes confirmados — falta o pagamento', 'Faça a transferência com os dados abaixo e envie o comprovativo.'],
      comprovativo_enviado: ['Comprovativo recebido', 'Estamos a verificar o seu pagamento.'],
      pago: ['Pagamento confirmado', 'Obrigado! Estamos a preparar a sua encomenda.'],
      cancelado: ['Encomenda cancelada', ''],
      expirado: ['Encomenda expirada', '']
    }[estado];
    if(base){ $c('conf-titulo').textContent = T(base[0]); msg.textContent = T(base[1]); }
    prazo.textContent = estado === 'aguarda_confirmacao_portes' ? T('O prazo de entrega será confirmado juntamente com o valor final.') : '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    if(typeof obterTokenCliente === 'function' && obterTokenCliente()) $c('conf-link-conta').hidden = false;
    if(!numero){
      $c('conf-icone').innerHTML = '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"></path><path d="M9 8a3 3 0 0 1 6 0"></path></svg>';
      $c('conf-titulo').textContent = T('Nenhum pedido encontrado');
      $c('conf-mensagem').textContent = T('Não encontrámos os detalhes de nenhuma compra recente.');
      return;
    }
    $c('conf-cartao').hidden = false;
    $c('conf-titulo').textContent = T('Encomenda recebida');
    $c('conf-mensagem').textContent = `${T('Número da encomenda')}: ${numero}. ${T('Guarde este número.')}`;
    $c('conf-consulta-form').addEventListener('submit', ev => {
      ev.preventDefault();
      carregar($c('conf-email').value.trim());
    });
    const email = emailGuardado();
    if(email) carregar(email); else $c('conf-consulta-form').hidden = false;
  });
})();
