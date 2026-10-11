/* Painel de pagamento manual do pedido — partilhado entre confirmacao.html e conta/pedido-detalhe.html.
   Usa apenas textContent/createElement (sem innerHTML com dados do servidor). */
(function(){
  'use strict';
  const T = t => (typeof tr === 'function' ? tr(t) : t);
  const LOCALES = { pt:'pt-PT', en:'en-US', es:'es-ES', fr:'fr-FR' };
  function locale(){ try{ return LOCALES[window.LUMINA.lang()] || 'pt-PT'; }catch(e){ return 'pt-PT'; } }
  function dinheiro(valor, moeda){
    try{ return new Intl.NumberFormat(locale(), { style:'currency', currency: moeda || 'EUR' }).format(Number(valor)); }
    catch(e){ return Number(valor).toFixed(2) + ' ' + (moeda || 'EUR'); }
  }
  function dataHora(v){ try{ return new Date(v).toLocaleString(locale(), { dateStyle:'medium', timeStyle:'short' }); }catch(e){ return String(v); } }
  function el(tag, props, ...filhos){
    const n = document.createElement(tag);
    if(props) for(const [k,v] of Object.entries(props)){
      if(v === undefined || v === null || v === false) continue;
      if(k === 'class') n.className = v; else if(k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : v);
    }
    for(const f of filhos.flat()) if(f != null) n.append(f.nodeType ? f : document.createTextNode(String(f)));
    return n;
  }

  const ETAPAS = [
    { chave:'registada', rotulo:'Encomenda registada', estados:['novo','aguarda_confirmacao_portes'] },
    { chave:'pagamento', rotulo:'Pagamento', estados:['aguarda_pagamento','comprovativo_enviado'] },
    { chave:'preparacao', rotulo:'Em preparação', estados:['pago','processando','em_processamento'] },
    { chave:'envio', rotulo:'Enviada', estados:['enviado_ao_agente','a_caminho','a_caminho_destino_final'] },
    { chave:'entregue', rotulo:'Entregue', estados:['entregue'] }
  ];
  function progresso(estado){
    const idx = ETAPAS.findIndex(e => e.estados.includes(estado));
    if(idx < 0) return null; // cancelado, expirado, reembolsado…
    const ol = el('ol', { class:'passos-estado', 'aria-label': T('Progresso da encomenda') });
    ETAPAS.forEach((e, i) => ol.append(el('li', { class: i < idx ? 'feito' : i === idx ? 'atual' : '', 'aria-current': i === idx ? 'step' : false }, el('span', { class:'ponto' }), el('span', { text: T(e.rotulo) }))));
    return ol;
  }

  function copiavel(rotulo, valor, textoACopiar){
    const botao = el('button', { type:'button', class:'copiar-btn', text: T('Copiar') });
    botao.addEventListener('click', async () => {
      const txt = String(textoACopiar ?? valor);
      try{ await navigator.clipboard.writeText(txt); }
      catch(e){ const ta = el('textarea', { style:'position:fixed;opacity:0' }); ta.value = txt; document.body.append(ta); ta.select(); try{ document.execCommand('copy'); }catch(_){} ta.remove(); }
      botao.textContent = T('Copiado'); setTimeout(() => { botao.textContent = T('Copiar'); }, 1800);
    });
    return el('div', { class:'linha-dado' }, el('span', { class:'rotulo-dado', text: T(rotulo) }), el('span', { class:'valor-dado', text: String(valor) }), botao);
  }
  function simples(rotulo, valor){
    return el('div', { class:'linha-dado' }, el('span', { class:'rotulo-dado', text: T(rotulo) }), el('span', { class:'valor-dado', text: String(valor) }));
  }

  const ROTULOS = { titular:'Titular', banco:'Banco', iban:'IBAN', swift:'SWIFT', entidade:'Entidade Multicaixa', telefone:'Telefone Multicaixa', instrucoesExtra:'Instruções adicionais' };

  function mensagem(texto, tipo){ return el('p', { class:'msg-painel ' + (tipo || ''), role: tipo === 'erro' ? 'alert' : 'status', text: texto }); }

  async function buscar(numero, email){
    return apiFetch('/pagamentos/pedido/' + encodeURIComponent(numero) + '/detalhes', { method:'POST', body: JSON.stringify({ email }), semRedirecionar:true });
  }

  function formUpload(numero, email, aoAtualizar, rotuloBotao){
    const msg = el('p', { class:'msg-painel', role:'status' });
    const input = el('input', { type:'file', id:'pp-comprovativo', accept:'application/pdf,image/jpeg,image/png,image/webp', required:true });
    const enviar = el('button', { type:'submit', class:'btn btn-primario', text: T(rotuloBotao || 'Enviar comprovativo') });
    const form = el('form', { class:'form-comprovativo' },
      el('label', { for:'pp-comprovativo', text: T('Comprovativo de pagamento (PDF, JPG, PNG ou WebP, até 5 MB)') }), input, enviar, msg);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = input.files[0];
      msg.className = 'msg-painel';
      if(!f){ msg.textContent = T('Selecione um ficheiro.'); msg.classList.add('erro'); return; }
      if(f.size > 5 * 1024 * 1024){ msg.textContent = T('O ficheiro excede 5 MB.'); msg.classList.add('erro'); return; }
      if(!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)){ msg.textContent = T('Formato não permitido. Use PDF, JPG, PNG ou WebP.'); msg.classList.add('erro'); return; }
      const data = new FormData(); data.append('email', email); data.append('comprovativo', f);
      enviar.disabled = true; enviar.textContent = T('A enviar…');
      try{
        const d = await apiFetch('/pagamentos/comprovativo/' + encodeURIComponent(numero), { method:'POST', body: data, semRedirecionar:true });
        msg.textContent = d.mensagem || T('Comprovativo enviado para análise.'); msg.classList.add('ok');
        setTimeout(() => aoAtualizar && aoAtualizar(), 1200);
      }catch(e){ msg.textContent = e.message; msg.classList.add('erro'); enviar.disabled = false; enviar.textContent = T(rotuloBotao || 'Enviar comprovativo'); }
    });
    return form;
  }

  function blocoCancelar(numero, email, aoAtualizar){
    const msg = el('p', { class:'msg-painel', role:'status' });
    const caixa = el('div', { class:'cancelar-pedido' });
    const abrir = el('button', { type:'button', class:'link-perigo', text: T('Cancelar encomenda') });
    abrir.addEventListener('click', () => {
      abrir.hidden = true;
      const sim = el('button', { type:'button', class:'btn btn-secundario', text: T('Sim, cancelar') });
      const nao = el('button', { type:'button', class:'link-simples', text: T('Voltar') });
      const pergunta = el('div', { class:'confirmar-cancelar' }, el('span', { text: T('Tem a certeza? O stock reservado será libertado e esta ação não pode ser desfeita.') }), sim, nao);
      nao.addEventListener('click', () => { pergunta.remove(); abrir.hidden = false; });
      sim.addEventListener('click', async () => {
        sim.disabled = true; msg.textContent = '';
        try{
          await apiFetch('/pagamentos/pedido/' + encodeURIComponent(numero) + '/cancelar', { method:'POST', body: JSON.stringify({ email }), semRedirecionar:true });
          aoAtualizar && aoAtualizar();
        }catch(e){ msg.textContent = e.message; msg.className = 'msg-painel erro'; sim.disabled = false; }
      });
      caixa.insertBefore(pergunta, msg);
    });
    caixa.append(abrir, msg);
    return caixa;
  }

  /** Constrói o painel. `d` = resposta de /pagamentos/pedido/:numero/detalhes */
  function render(container, d, { numero, email, aoAtualizar } = {}){
    container.replaceChildren();
    const estado = d.estado;
    const pg = d.pagamento || {};
    const topo = el('div', { class:'painel-topo' },
      el('span', { class:'badge-status ' + (typeof classeEstadoPedido === 'function' ? classeEstadoPedido(estado) : ''), text: typeof estadoPT === 'function' ? estadoPT(estado) : estado }),
      el('span', { class:'painel-numero', text: T('Encomenda') + ' ' + d.numeroPedido }));
    container.append(topo);
    const prog = progresso(estado); if(prog) container.append(prog);

    const valor = pg.valor_esperado ?? d.totalEUR;

    if(estado === 'aguarda_confirmacao_portes'){
      container.append(el('div', { class:'caixa-info' },
        el('strong', { text: T('Estamos a confirmar os portes') }),
        el('p', { text: T('Vamos calcular o valor final do envio e enviar-lhe um e-mail com o total a pagar e os dados para transferência. Por favor, não pague antes de receber esse e-mail.') }),
        el('p', { class:'pequeno', text: T('Esta página atualiza-se quando voltar a abri-la. Pode guardar o número da encomenda.') })));
      container.append(blocoCancelar(numero, email, aoAtualizar));
      return;
    }

    if(estado === 'aguarda_pagamento' || estado === 'comprovativo_enviado'){
      const caixa = el('div', { class:'caixa-pagamento' });
      if(estado === 'comprovativo_enviado'){
        caixa.append(el('div', { class:'caixa-info ok' }, el('strong', { text: T('Comprovativo recebido') }), el('p', { text: T('A nossa equipa está a verificar o seu pagamento. Receberá um e-mail assim que for confirmado.') })));
      }else{
        caixa.append(el('h3', { text: T('Como pagar') }));
        caixa.append(el('p', { class:'pequeno', text: T('Faça o pagamento do valor exato indicado, usando a referência abaixo, e depois envie o comprovativo.') }));
      }
      const dados = el('div', { class:'dados-pagamento' });
      dados.append(copiavel('Valor a pagar', dinheiro(valor, pg.moeda), Number(valor).toFixed(2)));
      if(pg.referencia_pagamento) dados.append(copiavel('Referência a indicar', pg.referencia_pagamento));
      if(d.dadosPagamento){
        for(const [k, v] of Object.entries(d.dadosPagamento)){
          if(v === undefined || v === null || v === '' || k === 'metodo' || k === 'prazoHoras') continue;
          const rotulo = ROTULOS[k] || k;
          dados.append(['iban','entidade','telefone','swift'].includes(k) ? copiavel(rotulo, v) : simples(rotulo, v));
        }
      }
      if(pg.prazo_pagamento_em) dados.append(simples('Prazo de pagamento', dataHora(pg.prazo_pagamento_em)));
      caixa.append(dados);
      if(!d.dadosPagamento) caixa.append(mensagem(T('Os dados de pagamento não estão disponíveis neste momento. Contacte a loja.'), 'erro'));
      container.append(caixa);
      if(d.dadosPagamento){
        if(estado === 'aguarda_pagamento') container.append(formUpload(numero, email, aoAtualizar));
        else{
          const det = el('details', { class:'outro-comprovativo' }, el('summary', { text: T('Enviar outro comprovativo') }), formUpload(numero, email, aoAtualizar, 'Enviar novo comprovativo'));
          container.append(det);
        }
      }
      container.append(blocoCancelar(numero, email, aoAtualizar));
      return;
    }

    const textos = {
      pago: 'Pagamento confirmado. Estamos a preparar a sua encomenda.',
      processando: 'A sua encomenda está a ser preparada.',
      em_processamento: 'A sua encomenda está a ser preparada.',
      enviado_ao_agente: 'A sua encomenda já seguiu para o agente de carga.',
      a_caminho: 'A sua encomenda está a caminho.',
      a_caminho_destino_final: 'A sua encomenda está a caminho do destino final.',
      entregue: 'Encomenda entregue. Obrigado pela sua compra!',
      cancelado: 'Esta encomenda foi cancelada.',
      expirado: 'O prazo de pagamento terminou e a encomenda expirou. Pode fazer uma nova encomenda na loja.',
      reembolsado: 'Esta encomenda foi reembolsada.',
      reembolso_parcial: 'Esta encomenda foi parcialmente reembolsada.'
    };
    container.append(el('div', { class:'caixa-info' + (['cancelado','expirado'].includes(estado) ? ' neutro' : ' ok'), }, el('p', { text: T(textos[estado] || 'Estado da encomenda atualizado.') })));
  }

  window.LuminaPedido = { buscar, render, progresso, dinheiro, dataHora, el, locale };
})();
