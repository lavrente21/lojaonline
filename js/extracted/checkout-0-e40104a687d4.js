  let PORTES_EUR = 0;
  let METODO_ENVIO = null;
  let FRETE_USD = null;
  let METODO_PAGAMENTO = null;
  let TOTAL_BASE_EUR = 0;
  let CUPAO_CODE = null;
  let CUPAO_DISCOUNT = 0;
  let A_ENVIAR = false;
  let _quoteSeq = 0;

  const $ck = id => document.getElementById(id);
  function moedaAtual(){return (window.LUMINA&&window.LUMINA.currency)?window.LUMINA.currency():'EUR';}
  function formatar(valor, moeda=moedaAtual()){return window.LUMINA?window.LUMINA.money(valor, moeda):`${Number(valor).toFixed(2)} ${moeda}`;}
  function escaparHTML(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // ---------- Países no idioma do utilizador ----------
  function localizarPaises(){
    const sel = $ck('ck-pais'); if(!sel) return;
    const lang = (window.LUMINA && window.LUMINA.lang && window.LUMINA.lang()) || 'pt';
    const loc = lang === 'pt' ? 'pt-PT' : lang;
    let nomes; try{ nomes = new Intl.DisplayNames([loc], {type:'region'}); }catch(e){ return; }
    const opcoes = [...sel.options];
    opcoes.forEach(o => { try{ const n = nomes.of(o.value); if(n && n !== o.value) o.textContent = n; }catch(e){} });
    const col = new Intl.Collator(loc);
    opcoes.sort((a,b) => col.compare(a.textContent, b.textContent)).forEach(o => sel.appendChild(o));
  }
  function paisInicial(){
    const sel = $ck('ck-pais'); if(!sel) return;
    const existe = c => [...sel.options].some(o => o.value === c);
    const guardado = String(localStorage.getItem('lumina_country') || '').toUpperCase();
    let escolha = existe(guardado) ? guardado : null;
    if(!escolha){
      for(const l of (navigator.languages || [navigator.language || ''])){
        const m = String(l).match(/[-_]([A-Za-z]{2})$/);
        if(m && existe(m[1].toUpperCase())){ escolha = m[1].toUpperCase(); break; }
      }
    }
    sel.value = escolha || (existe('AO') ? 'AO' : sel.options[0].value);
  }

  // ---------- Resumo ----------
  function renderizarResumoCheckout(){
    const itens = lerCarrinho();
    const container = $ck('ck-lista-itens');
    if(itens.length === 0){
      container.innerHTML = `<p style="font-size:13.5px;color:#8A7A70">${escaparHTML(tr('O seu carrinho está vazio.'))} <a href="loja.html" style="text-decoration:underline">${escaparHTML(tr('Ver produtos'))}</a></p>`;
    } else {
      container.innerHTML = itens.map(i => `<div class="linha-resumo"><span>${escaparHTML(i.nome)}${i.varianteNome?` <small style="color:#8A7A70">(${escaparHTML(i.varianteNome)})</small>`:''} ×${i.quantidade}</span><span>${formatar(i.preco*i.quantidade)}</span></div>`).join('');
    }
    const subtotal = itens.reduce((s,i)=>s+i.preco*i.quantidade,0);
    const desconto = Math.min(subtotal, CUPAO_DISCOUNT);
    const total = itens.length ? Math.max(0,subtotal-desconto) : 0; TOTAL_BASE_EUR = total;
    $ck('ck-desconto-linha').hidden = !(desconto>0);
    $ck('ck-desconto').textContent = desconto>0 ? `− ${formatar(desconto)}` : '—';
    $ck('ck-portes').textContent = itens.length ? (PORTES_EUR ? formatar(PORTES_EUR) : tr('A calcular')) : '—';
    $ck('ck-total').textContent = formatar(total);
    $ck('ck-botao-confirmar').disabled = A_ENVIAR || !itens.length || !METODO_PAGAMENTO;
    return total;
  }

  // ---------- Métodos de pagamento ----------
  const NOMES_METODO = {transferencia:'Transferência bancária',multicaixa:'Multicaixa Express / referência',deposito:'Depósito bancário'};
  const NOTAS_METODO = {
    transferencia:'Depois de confirmarmos os portes, receberá por e-mail o IBAN, o valor final e a referência a indicar na transferência.',
    multicaixa:'Depois de confirmarmos os portes, receberá por e-mail a entidade, o valor final e a referência a indicar.',
    deposito:'Depois de confirmarmos os portes, receberá por e-mail os dados bancários e o valor final a depositar.'
  };
  function atualizarNotaMetodo(){
    const n = $ck('ck-metodo-nota'); if(!n) return;
    n.textContent = METODO_PAGAMENTO ? tr(NOTAS_METODO[METODO_PAGAMENTO] || '') : '';
    n.hidden = !n.textContent;
  }
  async function carregarMetodosPagamento(){
    const box = $ck('ck-metodos-pagamento');
    try{
      const r = await apiFetch('/pagamentos/metodos');
      box.replaceChildren();
      (r.metodos||[]).forEach((metodo,index)=>{
        const label = document.createElement('label'); label.className='campo-formulario'; label.style.display='block'; label.style.margin='10px 0';
        const radio = document.createElement('input'); radio.type='radio'; radio.name='ck-metodo-pagamento'; radio.value=metodo; radio.checked=index===0;
        radio.addEventListener('change',()=>{METODO_PAGAMENTO=metodo;atualizarNotaMetodo();renderizarResumoCheckout();});
        label.append(radio, document.createTextNode(' '+tr(NOMES_METODO[metodo]||metodo)));
        box.appendChild(label);
        if(index===0) METODO_PAGAMENTO = metodo;
      });
      if(!(r.metodos||[]).length){
        const p = document.createElement('p'); p.textContent = tr('Pagamento temporariamente indisponível. A loja ainda não configurou métodos válidos.'); box.appendChild(p); METODO_PAGAMENTO = null;
      }
    }catch(_){ box.textContent = tr('Não foi possível verificar os métodos de pagamento. Tente novamente mais tarde.'); METODO_PAGAMENTO = null; }
    atualizarNotaMetodo(); renderizarResumoCheckout();
  }

  // ---------- Portes (estimativa) ----------
  async function calcularPortesCheckout(){
    const itens = lerCarrinho(); PORTES_EUR = 0; METODO_ENVIO = null; FRETE_USD = null;
    const box = $ck('ck-frete-opcoes');
    if(!itens.length){ box.textContent=''; $ck('ck-portes').textContent='—'; renderizarResumoCheckout(); return; }
    const seq = ++_quoteSeq;
    box.textContent = tr('A consultar opções de envio…'); $ck('ck-portes').textContent = tr('A consultar');
    try{
      const r = await apiFetch('/checkout/quote',{method:'POST',body:JSON.stringify({itens:itens.map(i=>({produtoId:i.produtoId,quantidade:i.quantidade,idVariante:i.idVariante||null})),pais:$ck('ck-pais').value,codigoPostal:$ck('ck-codigo-postal').value.trim(),provincia:$ck('ck-provincia').value.trim(),moeda:moedaAtual(),cupao:CUPAO_CODE||undefined})});
      if(seq !== _quoteSeq) return; // resposta antiga
      box.replaceChildren();
      if(r.portesConfirmados&&Array.isArray(r.fornecedores)&&r.fornecedores.length){
        const valores=[];
        for(const f of r.fornecedores){
          const validos=(f.metodos||[]).filter(m=>Number.isFinite(Number(m.totalEUR)));
          if(!validos.length) continue;
          const m=validos.reduce((a,b)=>Number(a.totalEUR)<=Number(b.totalEUR)?a:b);
          valores.push(Number(m.totalEUR));
          const p=document.createElement('p'); p.className='nota-frete'; p.textContent=`${f.fornecedor}: ${m.nome} — ${formatar(m.totalEUR)}${m.prazo?' · '+m.prazo:''}`; box.appendChild(p);
        }
        if(valores.length===r.fornecedores.length){
          PORTES_EUR=Number(valores.reduce((a,b)=>a+b,0).toFixed(2)); $ck('ck-portes').textContent=formatar(PORTES_EUR);
          const note=document.createElement('p'); note.className='nota-frete'; note.textContent=tr('Estimativa de referência. O total final e a disponibilidade serão confirmados antes de qualquer pagamento.'); box.appendChild(note);
        } else { $ck('ck-portes').textContent = tr('A confirmar'); }
      }else{
        const note=document.createElement('p'); note.className='nota-frete'; note.textContent=(r.avisos||[]).join(' · ')||r.mensagem||tr('Os portes serão confirmados manualmente antes de qualquer pagamento.'); box.appendChild(note); $ck('ck-portes').textContent=tr('A confirmar');
      }
    }catch(e){
      if(seq !== _quoteSeq) return;
      box.textContent = e.message && /entrega.*breve|parceiro/i.test(e.message) ? e.message : tr('Não foi possível calcular os portes automaticamente. A equipa confirmará o valor antes de qualquer pagamento.');
      $ck('ck-portes').textContent = tr('A confirmar');
    }
    renderizarResumoCheckout();
  }

  // ---------- Cupão (partilhado com o carrinho) ----------
  async function aplicarCupaoCheckout(codigo, silencioso){
    const msg = $ck('ck-cupao-msg'), btn = $ck('ck-aplicar-cupao');
    if(!codigo){ CUPAO_CODE=null; CUPAO_DISCOUNT=0; guardarCupao(null); if(!silencioso){msg.textContent=tr('Cupão removido.'); msg.style.color='#2E7D4F';} renderizarResumoCheckout(); return; }
    btn.disabled = true; msg.textContent = tr('A validar…'); msg.style.color = '#5B4C43';
    try{
      const r = await validarCupaoCarrinho(codigo);
      CUPAO_CODE = r.codigo; CUPAO_DISCOUNT = Number(r.descontoEUR||0);
      msg.textContent = `${tr('Cupão aplicado: desconto de')} ${formatar(CUPAO_DISCOUNT)}.`; msg.style.color='#2E7D4F';
    }catch(e){
      CUPAO_CODE=null; CUPAO_DISCOUNT=0; guardarCupao(null); msg.textContent=e.message; msg.style.color='#B14B33';
    }finally{ btn.disabled=false; }
    renderizarResumoCheckout(); calcularPortesCheckout();
  }

  // ---------- Dados da conta e moradas guardadas ----------
  function definirSeVazio(id, valor){ const el=$ck(id); if(el && !el.value.trim() && valor) el.value = valor; }
  function aplicarEndereco(a){
    const sel = $ck('ck-pais');
    const codigo = String(a.pais||'').toUpperCase();
    if([...sel.options].some(o=>o.value===codigo)) sel.value = codigo;
    else { const o=[...sel.options].find(x=>x.textContent.trim().toLowerCase()===String(a.pais||'').trim().toLowerCase()); if(o) sel.value=o.value; }
    localStorage.setItem('lumina_country', sel.value);
    $ck('ck-cidade').value = a.cidade || '';
    $ck('ck-codigo-postal').value = a.codigo_postal || '';
    $ck('ck-provincia').value = a.provincia || '';
    $ck('ck-morada').value = a.linha1 || '';
    $ck('ck-morada-linha2').value = a.linha2 || '';
    if(a.telefone) definirSeVazio('ck-telefone', a.telefone);
    calcularPortesCheckout();
  }
  async function preencherComConta(){
    if(!obterTokenCliente()) return;
    const nota = $ck('ck-conta-nota');
    try{
      const [c, ends] = await Promise.all([
        apiFetch('/auth/clientes/me',{semRedirecionar:true}),
        apiFetch('/auth/clientes/enderecos',{semRedirecionar:true}).catch(()=>[])
      ]);
      const partes = String(c.nome||'').trim().split(/\s+/);
      definirSeVazio('ck-nome', partes.shift()||'');
      definirSeVazio('ck-apelido', partes.join(' '));
      definirSeVazio('ck-email', c.email);
      definirSeVazio('ck-telefone', c.telefone);
      nota.textContent = `${tr('Sessão iniciada como')} ${c.email}. ${tr('A encomenda ficará associada à sua conta.')}`; nota.hidden = false;
      if(Array.isArray(ends) && ends.length){
        const sel = $ck('ck-endereco-guardado');
        sel.innerHTML = `<option value="">${escaparHTML(tr('Introduzir outra morada'))}</option>` + ends.map(a=>`<option value="${a.id}">${escaparHTML((a.rotulo?a.rotulo+' — ':'')+a.linha1+', '+a.cidade)}${a.predefinido?' ★':''}</option>`).join('');
        $ck('ck-bloco-enderecos').hidden = false;
        sel.addEventListener('change',()=>{ const a=ends.find(x=>String(x.id)===sel.value); if(a) aplicarEndereco(a); });
        const vazio = !$ck('ck-morada').value.trim() && !$ck('ck-cidade').value.trim();
        const pred = ends.find(a=>a.predefinido) || ends[0];
        if(vazio && pred){ sel.value = String(pred.id); aplicarEndereco(pred); }
      }
    }catch(e){
      nota.textContent = tr('A sua sessão expirou. Pode continuar como convidado ou iniciar sessão novamente.'); nota.hidden = false;
    }
  }

  // ---------- Validação ----------
  function marcarInvalido(id, msg){
    const el = $ck(id); if(!el) return msg;
    el.setAttribute('aria-invalid','true');
    el.addEventListener('input', ()=>el.removeAttribute('aria-invalid'), {once:true});
    return msg;
  }
  function validarFormulario(){
    ['ck-nome','ck-apelido','ck-email','ck-telefone','ck-cidade','ck-morada','ck-aceito'].forEach(id=>$ck(id)?.removeAttribute('aria-invalid'));
    const v = id => $ck(id).value.trim();
    if(!lerCarrinho().length) return {msg:tr('O seu carrinho está vazio.')};
    if(!METODO_PAGAMENTO) return {msg:tr('Não há métodos de pagamento configurados neste momento. A encomenda não foi criada.')};
    if(!v('ck-nome')) return {msg:marcarInvalido('ck-nome',tr('Indique o seu nome.')), campo:'ck-nome'};
    if(!v('ck-apelido')) return {msg:marcarInvalido('ck-apelido',tr('Indique o seu apelido.')), campo:'ck-apelido'};
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('ck-email'))) return {msg:marcarInvalido('ck-email',tr('Indique um e-mail válido.')), campo:'ck-email'};
    if(v('ck-telefone').replace(/\D/g,'').length < 7) return {msg:marcarInvalido('ck-telefone',tr('Indique um telefone válido, com indicativo do país.')), campo:'ck-telefone'};
    if(!v('ck-morada')) return {msg:marcarInvalido('ck-morada',tr('Indique a morada de entrega.')), campo:'ck-morada'};
    if(!v('ck-cidade')) return {msg:marcarInvalido('ck-cidade',tr('Indique a cidade.')), campo:'ck-cidade'};
    if(!$ck('ck-aceito').checked) return {msg:marcarInvalido('ck-aceito',tr('Tem de aceitar os Termos de uso e a Política de privacidade.')), campo:'ck-aceito'};
    return null;
  }
  function mostrarErro(texto, campo){
    const el = $ck('ck-erro'); el.textContent = texto; el.style.display = 'block';
    const alvo = campo && $ck(campo); (alvo || el).focus({preventScroll:false});
    (alvo || el).scrollIntoView({behavior:'smooth', block:'center'});
  }

  async function registarEncomenda(){
    if(A_ENVIAR) return;
    const erroEl = $ck('ck-erro'); erroEl.style.display = 'none';
    const invalido = validarFormulario();
    if(invalido){ mostrarErro(invalido.msg, invalido.campo); return; }

    const itens = lerCarrinho();
    const nome = [$ck('ck-nome').value.trim(), $ck('ck-apelido').value.trim()].filter(Boolean).join(' ');
    const email = $ck('ck-email').value.trim();
    const corpo = {
      nome, email, telefoneCliente: $ck('ck-telefone').value.trim(),
      itens: itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, idVariante: i.idVariante || null })),
      moradaEntrega: {
        linha1: $ck('ck-morada').value.trim(),
        linha2: $ck('ck-morada-linha2').value.trim() || undefined,
        cidade: $ck('ck-cidade').value.trim(),
        provincia: $ck('ck-provincia').value.trim() || undefined,
        codigoPostal: $ck('ck-codigo-postal').value.trim(),
        pais: $ck('ck-pais').value
      },
      moeda: moedaAtual(),
      metodoPagamento: METODO_PAGAMENTO,
      cupao: CUPAO_CODE || undefined
    };
    const botao = $ck('ck-botao-confirmar'), textoOriginal = botao.textContent;
    A_ENVIAR = true; botao.textContent = tr('A processar...'); botao.disabled = true;
    try{
      const resultado = await apiFetch('/checkout', { method:'POST', body: JSON.stringify(corpo) });
      try{ sessionStorage.setItem('lumina_ultimo_pedido', JSON.stringify({ numero: resultado.numeroPedido, email, ts: Date.now() })); }catch(_){}
      esvaziarCarrinho();
      if(resultado.pagamento?.urlCheckout){ window.location.href = resultado.pagamento.urlCheckout; return; }
      window.location.href = 'confirmacao.html?numero=' + encodeURIComponent(resultado.numeroPedido);
    }catch(e){
      A_ENVIAR = false; botao.textContent = textoOriginal; renderizarResumoCheckout();
      mostrarErro(tr('Não foi possível registar a encomenda:') + ' ' + e.message);
      if(/stock|dispon|pre[çc]o|esgot|variante|produto/i.test(String(e.message||''))){
        sincronizarCarrinhoComCatalogo({forcar:true}).then(()=>{renderizarResumoCheckout();calcularPortesCheckout();});
      }
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    localizarPaises(); paisInicial();
    renderizarResumoCheckout();
    carregarMetodosPagamento();

    $ck('ck-pais').addEventListener('change', ()=>{localStorage.setItem('lumina_country', $ck('ck-pais').value);calcularPortesCheckout();});
    $ck('ck-codigo-postal').addEventListener('blur', calcularPortesCheckout);
    $ck('ck-provincia').addEventListener('blur', calcularPortesCheckout);
    $ck('ck-aplicar-cupao').addEventListener('click', ()=>aplicarCupaoCheckout($ck('ck-cupao').value.trim(), false));
    $ck('ck-cupao').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); aplicarCupaoCheckout($ck('ck-cupao').value.trim(), false); } });
    $ck('ck-botao-confirmar').addEventListener('click', registarEncomenda);
    const reRender = ()=>{ renderizarResumoCheckout(); };
    window.addEventListener('lumina:currency-changed', ()=>{ reRender(); calcularPortesCheckout(); });
    window.addEventListener('lumina:currency-ready', reRender);

    // Sincroniza preços/stock antes de mostrar totais; depois portes, cupão e dados da conta
    await sincronizarCarrinhoComCatalogo({forcar:true});
    renderizarResumoCheckout();
    const guardado = lerCupao();
    if(guardado){ $ck('ck-cupao').value = guardado.codigo; await aplicarCupaoCheckout(guardado.codigo, true); }
    else calcularPortesCheckout();
    preencherComConta();
  });
