  const params = new URLSearchParams(window.location.search);
  const numero = params.get('numero');
  const totalEUR = params.get('totalEUR');
  const totalMoeda = params.get('totalMoeda') || params.get('totalAOA');
  const rota = params.get('rota');
  const moeda = params.get('moeda');
  const idCobranca = params.get('idCobranca');
  const metodoPag = params.get('metodo');
  const mensagemPag = params.get('mensagem');
  function escConfirmacao(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}

  if(numero){
    document.getElementById('conf-mensagem').textContent =
      `Recebemos a sua encomenda ${numero}. A confirmação será enviada por e-mail quando o serviço estiver configurado.`;

    const caixa = document.getElementById('conf-caixa-pagamento');
    caixa.textContent='Para proteger os dados de pagamento, introduza o e-mail usado na encomenda para consultar as instruções e carregar o comprovativo.';

    document.getElementById('conf-prazo').textContent = 'A equipa confirmará a disponibilidade e os portes antes de qualquer pagamento ou envio. O prazo de entrega ainda não está confirmado.';
  } else {
    document.getElementById('conf-icone').innerHTML = `<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"></path><path d="M9 8a3 3 0 0 1 6 0"></path></svg>`;
    document.getElementById('conf-titulo').textContent = 'Nenhum pedido encontrado';
    document.getElementById('conf-mensagem').textContent = 'Não encontrámos os detalhes de nenhuma compra recente.';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('conf-consulta-form'),uploadForm=document.getElementById('conf-upload-form'),error=document.getElementById('conf-detalhes-erro'),box=document.getElementById('conf-caixa-pagamento');
    const api=String(window.LUMINA_API_BASE_URL||'').replace(/\/$/,'');
    form.addEventListener('submit',async ev=>{ev.preventDefault();error.textContent='';box.textContent='A consultar…';uploadForm.hidden=true;const email=document.getElementById('conf-email').value.trim();try{const r=await fetch(api+'/pagamentos/pedido/'+encodeURIComponent(numero)+'/detalhes',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({email})});const d=await r.json();if(!r.ok)throw new Error(d.erro||'Não foi possível consultar a encomenda.');box.replaceChildren();const add=(label,value)=>{const p=document.createElement('p');p.textContent=label+': '+String(value??'—');box.appendChild(p);};add('Encomenda',d.numeroPedido);add('Estado',d.estado);add('Valor final a pagar',Number(d.pagamento?.valor_esperado??d.totalEUR??0).toLocaleString('pt-PT',{style:'currency',currency:d.pagamento?.moeda||'EUR'}));if(d.pagamento?.referencia_pagamento)add('Referência a indicar',d.pagamento.referencia_pagamento);if(d.pagamento?.prazo_pagamento_em)add('Prazo de pagamento',new Date(d.pagamento.prazo_pagamento_em).toLocaleString('pt-PT'));if(d.dadosPagamento){for(const [k,v] of Object.entries(d.dadosPagamento)){if(v!==undefined&&v!==''&&k!=='metodo'&&k!=='prazoHoras')add(({titular:'Titular',banco:'Banco',iban:'IBAN',swift:'SWIFT',entidade:'Entidade Multicaixa',telefone:'Telefone Multicaixa',instrucoesExtra:'Instruções adicionais'})[k]||k,v);}if(['aguarda_pagamento','comprovativo_enviado'].includes(d.estado))uploadForm.hidden=false;}else{const p=document.createElement('p');p.textContent='As instruções de pagamento ainda não estão disponíveis ou a encomenda já não aceita pagamento.';box.appendChild(p);}uploadForm.dataset.email=email;}catch(e){box.textContent='';error.textContent=e.message||'Erro ao consultar a encomenda.';}});
    uploadForm.addEventListener('submit',async ev=>{ev.preventDefault();error.textContent='';const file=document.getElementById('conf-comprovativo').files[0];if(!file){error.textContent='Selecione um ficheiro.';return;}const data=new FormData();data.append('email',uploadForm.dataset.email||'');data.append('comprovativo',file);try{const r=await fetch(api+'/pagamentos/comprovativo/'+encodeURIComponent(numero),{method:'POST',body:data,cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.erro||'Falha ao enviar comprovativo.');error.textContent=d.mensagem||'Comprovativo enviado para análise.';uploadForm.hidden=true;}catch(e){error.textContent=e.message||'Falha ao enviar comprovativo.';}});
  });
