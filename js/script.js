// ---------- Carrinho (armazenado no navegador) ----------
const CARRINHO_CHAVE = 'lumina_carrinho';
const CUPAO_CHAVE = 'lumina_cupao';
const CARRINHO_MAX_QTD = 99;
function tr(texto){ try{ return (window.LUMINA && window.LUMINA.t) ? window.LUMINA.t(texto) : texto; }catch(e){ return texto; } }
function moedaCarrinho(eur){ return window.LUMINA ? window.LUMINA.money(eur) : '€' + Number(eur || 0).toFixed(2); }
function lerCarrinho(){
  try{
    const dados = JSON.parse(localStorage.getItem(CARRINHO_CHAVE));
    if(!Array.isArray(dados)) return [];
    return dados
      .filter(i => i && i.produtoId != null && Number.isFinite(Number(i.preco)) && Number(i.quantidade) > 0)
      .map(i => ({ ...i, preco: Number(i.preco), quantidade: Math.min(CARRINHO_MAX_QTD, Math.floor(Number(i.quantidade))) }));
  }catch(e){ return []; }
}
function guardarCarrinho(itens){
  try{ localStorage.setItem(CARRINHO_CHAVE, JSON.stringify(itens)); }catch(e){}
  atualizarContadorCarrinho();
}
function atualizarContadorCarrinho(){
  const total = lerCarrinho().reduce((soma, item) => soma + item.quantidade, 0);
  document.querySelectorAll('.contador-carrinho').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}
function chaveItemCarrinho(i){ return String(i.produtoId) + ':' + String(i.idVariante || 0); }
function limiteStockItem(i){
  const s = (i.stock === null || i.stock === undefined) ? NaN : Number(i.stock);
  return Number.isFinite(s) && s >= 0 ? Math.min(s, CARRINHO_MAX_QTD) : CARRINHO_MAX_QTD;
}
function subtotalCarrinho(itens = lerCarrinho()){ return itens.reduce((s, i) => s + i.preco * i.quantidade, 0); }
function textoStockLimite(n){ return tr('Só existem {n} unidades disponíveis deste produto.').replace('{n}', n); }

function adicionarAoCarrinho(produtoId, nome, preco, quantidade = 1, metadados = {}){
  const qtd = Math.max(1, Math.floor(Number(quantidade)) || 1);
  const itens = lerCarrinho();
  const idVar = metadados.varianteId || null;
  const stock = (metadados.stock !== undefined && metadados.stock !== null && Number.isFinite(Number(metadados.stock))) ? Number(metadados.stock) : null;
  let item = itens.find(i => String(i.produtoId) === String(produtoId) && String(i.idVariante || 0) === String(idVar || 0));
  if(item){
    if(stock !== null) item.stock = stock;
    item.preco = Number(preco);
    if(!item.imagem && metadados.imagem) item.imagem = metadados.imagem;
    if(!item.varianteNome && metadados.varianteNome) item.varianteNome = metadados.varianteNome;
  }else{
    item = { produtoId, nome, preco: Number(preco), quantidade: 0, imagem: metadados.imagem || null, idVariante: idVar, varianteNome: metadados.varianteNome || null, stock };
    itens.push(item);
  }
  const limite = limiteStockItem(item);
  const desejada = item.quantidade + qtd;
  item.quantidade = Math.min(desejada, limite);
  if(item.quantidade < 1){
    guardarCarrinho(itens.filter(i => i !== item));
    mostrarToast(tr('Indisponível'));
    renderizarCarrinho();
    return false;
  }
  guardarCarrinho(itens);
  try{ sessionStorage.removeItem('lumina_carrinho_sync'); }catch(e){}
  mostrarToast(desejada > limite ? textoStockLimite(limite) : `${nome} ${tr('adicionado ao carrinho')}`);
  renderizarCarrinho();
  revalidarCupaoCarrinho();
  return true;
}
function definirQuantidadeCarrinho(chave, nova){
  const itens = lerCarrinho();
  const item = itens.find(i => chaveItemCarrinho(i) === chave);
  if(!item) return;
  let q = Math.floor(Number(nova));
  if(!Number.isFinite(q) || q < 1) q = 1;
  const limite = limiteStockItem(item);
  if(q > limite){ q = limite; mostrarToast(textoStockLimite(limite)); }
  item.quantidade = Math.max(1, q);
  guardarCarrinho(itens);
  renderizarCarrinho();
  revalidarCupaoCarrinho();
}
function alterarQuantidadeCarrinho(chave, delta){
  const item = lerCarrinho().find(i => chaveItemCarrinho(i) === chave);
  if(item) definirQuantidadeCarrinho(chave, item.quantidade + delta);
}
function removerItemCarrinho(chave){
  guardarCarrinho(lerCarrinho().filter(i => chaveItemCarrinho(i) !== chave));
  renderizarCarrinho();
  revalidarCupaoCarrinho();
}
function esvaziarCarrinho(){
  try{ localStorage.removeItem(CARRINHO_CHAVE); localStorage.removeItem(CUPAO_CHAVE); }catch(e){}
  atualizarContadorCarrinho();
}

// ---------- Cupão (partilhado entre carrinho e checkout) ----------
function lerCupao(){
  try{ const c = JSON.parse(localStorage.getItem(CUPAO_CHAVE)); return c && c.codigo ? c : null; }catch(e){ return null; }
}
function guardarCupao(c){
  try{ c ? localStorage.setItem(CUPAO_CHAVE, JSON.stringify(c)) : localStorage.removeItem(CUPAO_CHAVE); }catch(e){}
}
async function validarCupaoCarrinho(codigo){
  const subtotal = subtotalCarrinho();
  if(subtotal <= 0) throw new Error(tr('O seu carrinho está vazio.'));
  const r = await apiFetch('/checkout/validar-cupao', { method:'POST', body: JSON.stringify({ codigo, subtotalEUR: subtotal }) });
  guardarCupao({ codigo: r.codigo, descontoEUR: Number(r.descontoEUR || 0) });
  return r;
}
let _cupaoTimer = null;
function revalidarCupaoCarrinho(){
  const c = lerCupao();
  if(!c) return;
  clearTimeout(_cupaoTimer);
  _cupaoTimer = setTimeout(async () => {
    try{ await validarCupaoCarrinho(c.codigo); }
    catch(e){ guardarCupao(null); mostrarMensagemCupao(e.message, true); }
    renderizarPaginaCarrinho();
  }, 400);
}
function mostrarMensagemCupao(texto, erro){
  const el = document.getElementById('cp-cupao-msg');
  if(!el) return;
  el.textContent = texto || '';
  el.style.color = erro ? '#B14B33' : '#2E7D4F';
}

// ---------- Sincronizar o carrinho com o catálogo (preço, stock, variantes) ----------
async function sincronizarCarrinhoComCatalogo(opcoes = {}){
  const avisos = [];
  const itens = lerCarrinho();
  if(!itens.length || !window.LUMINA_API_BASE_URL) return avisos;
  try{
    const ultimo = Number(sessionStorage.getItem('lumina_carrinho_sync') || 0);
    if(!opcoes.forcar && Date.now() - ultimo < 60000) return avisos;
  }catch(e){}
  const ids = [...new Set(itens.map(i => String(i.produtoId)))];
  const catalogo = {};
  await Promise.all(ids.map(async id => {
    try{ catalogo[id] = { p: await apiFetch('/produtos/' + encodeURIComponent(id)) }; }
    catch(e){ catalogo[id] = { naoEncontrado: /n[ãa]o encontrado|inv[áa]lido/i.test(String(e.message || '')) }; }
  }));
  let alterado = false;
  const resultado = [];
  for(const item of itens){
    const entrada = catalogo[String(item.produtoId)];
    if(!entrada || (!entrada.p && !entrada.naoEncontrado)){ resultado.push(item); continue; } // erro de rede: não mexer
    if(entrada.naoEncontrado){ avisos.push(`${item.nome}: ${tr('já não está disponível e foi removido do carrinho.')}`); alterado = true; continue; }
    const p = entrada.p;
    const base = Number(p.precoAtualEUR ?? p.precoVendaEUR ?? item.preco);
    let preco = base, stock = Number(p.stockDisponivel ?? 0), varianteNome = item.varianteNome || null;
    if(item.idVariante){
      const v = (p.variantes || []).find(x => String(x.id) === String(item.idVariante));
      if(!v){ avisos.push(`${item.nome}: ${tr('a opção escolhida já não está disponível e o produto foi removido do carrinho.')}`); alterado = true; continue; }
      preco = base + Number(v.preco_extra_eur || 0);
      stock = Number(v.stock ?? 0);
      varianteNome = v.valor_opcao || v.nome || varianteNome;
    }else if(p.temVariantes){
      avisos.push(`${item.nome}: ${tr('escolha uma opção na página do produto. O artigo foi removido do carrinho.')}`); alterado = true; continue;
    }
    if(!(stock > 0)){ avisos.push(`${item.nome}: ${tr('está esgotado e foi removido do carrinho.')}`); alterado = true; continue; }
    const novo = { ...item, nome: p.nome || item.nome, stock, varianteNome, imagem: item.imagem || p.imagem_principal || null };
    if(Math.abs(preco - item.preco) > 0.004){ novo.preco = Number(preco.toFixed(2)); avisos.push(`${novo.nome}: ${tr('o preço foi atualizado.')}`); alterado = true; }
    if(novo.quantidade > stock){ novo.quantidade = Math.min(stock, CARRINHO_MAX_QTD); avisos.push(`${novo.nome}: ${textoStockLimite(stock)}`); alterado = true; }
    if(novo.stock !== item.stock || novo.varianteNome !== item.varianteNome || novo.nome !== item.nome || novo.imagem !== item.imagem) alterado = true;
    resultado.push(novo);
  }
  try{ sessionStorage.setItem('lumina_carrinho_sync', String(Date.now())); }catch(e){}
  if(alterado){ guardarCarrinho(resultado); renderizarCarrinho(); }
  if(avisos.length){
    const caixa = document.getElementById('carrinho-avisos') || document.getElementById('ck-avisos');
    if(caixa){ caixa.replaceChildren(...avisos.map(a => { const p = document.createElement('p'); p.textContent = a; return p; })); caixa.hidden = false; }
    else mostrarToast(avisos[0]);
  }
  return avisos;
}

// ---------- Renderização do carrinho (drawer e página) ----------
function htmlItemCarrinho(item){
  const chave = chaveItemCarrinho(item);
  const img = safeImageUrl(item.imagem);
  const link = '/produto.html?id=' + encodeURIComponent(item.produtoId);
  const limite = limiteStockItem(item);
  const q = item.quantidade;
  return `<div class="linha-carrinho" data-chave="${escHtml(chave)}">
    <a class="miniatura-carrinho" href="${link}" tabindex="-1" aria-hidden="true">${img ? `<img src="${escHtml(img)}" alt="" loading="lazy">` : ''}</a>
    <div class="info-carrinho">
      <a class="nome-carrinho" href="${link}">${escHtml(item.nome)}</a>
      ${item.varianteNome ? `<div class="variante-carrinho">${escHtml(item.varianteNome)}</div>` : ''}
      <div class="preco-unit-carrinho">${moedaCarrinho(item.preco)}</div>
      <div class="controlos-carrinho">
        <div class="stepper-qtd" role="group" aria-label="${escHtml(tr('Quantidade'))}">
          <button type="button" data-acao="menos" aria-label="${escHtml(tr('Diminuir quantidade'))}"${q <= 1 ? ' disabled' : ''}>−</button>
          <input type="number" inputmode="numeric" min="1" max="${limite}" value="${q}" data-acao="qtd" aria-label="${escHtml(tr('Quantidade'))}">
          <button type="button" data-acao="mais" aria-label="${escHtml(tr('Aumentar quantidade'))}"${q >= limite ? ' disabled' : ''}>+</button>
        </div>
        <button type="button" class="remover-item-btn" data-acao="remover">${escHtml(tr('Remover'))}</button>
      </div>
    </div>
    <div class="total-linha-carrinho">${moedaCarrinho(item.preco * q)}</div>
  </div>`;
}
function ligarEventosCarrinho(container){
  if(!container || container.dataset.carrinhoLigado) return;
  container.dataset.carrinhoLigado = '1';
  container.addEventListener('click', e => {
    const b = e.target.closest('button[data-acao]');
    const linha = b && b.closest('[data-chave]');
    if(!b || !linha) return;
    const chave = linha.dataset.chave;
    if(b.dataset.acao === 'mais') alterarQuantidadeCarrinho(chave, 1);
    else if(b.dataset.acao === 'menos') alterarQuantidadeCarrinho(chave, -1);
    else if(b.dataset.acao === 'remover') removerItemCarrinho(chave);
  });
  container.addEventListener('change', e => {
    const campo = e.target.closest('input[data-acao="qtd"]');
    const linha = campo && campo.closest('[data-chave]');
    if(campo && linha) definirQuantidadeCarrinho(linha.dataset.chave, campo.value);
  });
}
function renderizarDrawerCarrinho(){
  const container = document.querySelector('.itens-drawer');
  const rodape = document.querySelector('.rodape-drawer');
  if(!container) return;
  ligarEventosCarrinho(container);
  const itens = lerCarrinho();
  if(itens.length === 0){
    container.innerHTML = `<p class="carrinho-vazio">${escHtml(tr('O seu carrinho está vazio.'))}</p>`;
    if(rodape) rodape.style.display = 'none';
    return;
  }
  if(rodape){
    rodape.style.display = 'block';
    if(!rodape.querySelector('.ver-carrinho-link')){
      const a = document.createElement('a');
      a.className = 'ver-carrinho-link'; a.href = '/carrinho.html'; a.textContent = tr('Ver carrinho');
      rodape.appendChild(a);
    }
  }
  container.innerHTML = itens.map(htmlItemCarrinho).join('');
  const spanSubtotal = document.querySelector('.valor-subtotal');
  if(spanSubtotal) spanSubtotal.textContent = moedaCarrinho(subtotalCarrinho(itens));
}
function renderizarCarrinho(){
  renderizarDrawerCarrinho();
  renderizarPaginaCarrinho();
  atualizarContadorCarrinho();
}

// ---------- Carregar produtos reais da API (loja.html e index.html) ----------
function escHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function safeImageUrl(v){const s=String(v||'').trim();if(!s)return '';if(/^https:\/\//i.test(s)||/^\/(?!\/)/.test(s)||/^(\.\.\/|\.\/)/.test(s))return s;return '';}
function cardProduto(p){
  const preco=Number(p.precoAtualEUR??p.precoVendaEUR??0);
  const venda=Number(p.precoVendaEUR??0);
  const promo=p.promocaoAtiva&&Number(p.promocaoPrecoEUR)>0&&Number(p.promocaoPrecoEUR)<venda;
  const tags=String(p.etiqueta||'').split(/\s+/).filter(Boolean).slice(0,2);
  const badges=[p.destaque?'<span class="selo-produto">Destaque</span>':'',...tags.map(t=>`<span class="selo-produto selo-tag">${escHtml(t)}</span>`),promo?'<span class="selo-produto selo-promocao">Promoção</span>':''].filter(Boolean).join('');
  const indisponivel=Number(p.stockDisponivel??p.stock??0)<=0;
  return `<article class="cartao-produto${indisponivel?' produto-indisponivel':''}">
    <a href="produto.html?id=${encodeURIComponent(p.id)}" class="cartao-produto-link">
      <div class="imagem-produto">${badges}${safeImageUrl(p.imagemPrincipal)?`<img src="${escHtml(safeImageUrl(p.imagemPrincipal))}" alt="${escHtml(p.imagemAlt||p.nome)}" loading="lazy">`:''}</div>
      <div class="info-produto"><div class="categoria-produto">${escHtml(p.categoria||'')}</div><h3>${escHtml(p.nome)}</h3>
      <div class="preco-produto-adminfront">${promo?`<del class="preco-anterior" data-lumina-eur="${venda}">${window.LUMINA?window.LUMINA.money(venda):venda.toFixed(2)+' €'}</del>`:''}<div class="preco" data-lumina-eur="${preco}">${window.LUMINA?window.LUMINA.money(preco):preco.toFixed(2)+' €'}</div></div>
      ${indisponivel?'<small class="produto-stock-indisponivel">Indisponível</small>':''}</div>
    </a>
    ${indisponivel?'':(p.temVariantes?`<a class="botao-add-rapido botao-add-rapido-link" href="/produto.html?id=${encodeURIComponent(p.id)}">Escolher opção</a>`:`<button class="botao-add-rapido" data-id="${p.id}" data-nome="${escHtml(p.nome)}" data-preco="${preco}" data-stock="${Number(p.stockDisponivel??p.stock??0)}" data-imagem="${encodeURIComponent(p.imagemPrincipal||'')}">Adicionar ao carrinho</button>`)}
  </article>`;
}
async function carregarProdutosNaGrade(seletorContainer, opcoes={}){
  const container=document.querySelector(seletorContainer); if(!container)return;
  try{
    const q=new URLSearchParams();
    if(opcoes.destaque)q.set('destaque','true');
    if(opcoes.promocao)q.set('promocao','true');
    if(opcoes.categoria)q.set('categoria',opcoes.categoria);
    if(opcoes.tag)q.set('tag',opcoes.tag);
    if(opcoes.q)q.set('q',opcoes.q);
    if(opcoes.ordenar)q.set('ordenar',opcoes.ordenar);
    if(opcoes.limit)q.set('limite',String(opcoes.limit));
    const produtos=await apiFetch('/produtos'+(q.toString()?'?'+q:'') );
    if(!produtos.length){container.innerHTML='<p class="catalogo-vazio">Ainda não há produtos publicados nesta seleção.</p>';return;}
    container.innerHTML=produtos.map(cardProduto).join('');
    container.querySelectorAll('button.botao-add-rapido').forEach(botao=>botao.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();adicionarAoCarrinho(botao.dataset.id,botao.dataset.nome,parseFloat(botao.dataset.preco),1,{imagem:decodeURIComponent(botao.dataset.imagem||''),stock:botao.dataset.stock});}));
  }catch(e){console.error(e);container.innerHTML='<p class="catalogo-vazio">Não foi possível carregar o catálogo neste momento.</p>';}
}
function obterFiltrosLoja(){
  const params=new URLSearchParams(location.search);
  const categoriaRaw=params.get('cat')||''; const categoriaPagina=({'hair':'Hair care','body':'Body care','skincare':'Skincare','maquilhagem':'Maquilhagem'}[categoriaRaw.toLowerCase()]||categoriaRaw);
  const categorias=[...document.querySelectorAll('[data-filtro-categoria]:checked')].map(x=>x.dataset.filtroCategoria);
  const pele=[...document.querySelectorAll('[data-filtro-pele]:checked')].map(x=>x.dataset.filtroPele);
  const cabelo=[...document.querySelectorAll('[data-filtro-cabelo]:checked')].map(x=>x.dataset.filtroCabelo);
  const tags=[...document.querySelectorAll('[data-filtro-tag]:checked')].map(x=>x.dataset.filtroTag);
  const promo=document.querySelector('[data-filtro-promocao]')?.checked; const destaque=document.querySelector('[data-filtro-destaque]')?.checked;
  return {q:params.get('q')||'',categoria:categorias[0]||categoriaPagina||'',tag:tags[0]||'',promocao:!!promo||params.get('promocao')==='true',destaque:!!destaque||params.get('destaque')==='true',ordenar:document.querySelector('.barra-loja select')?.value||'destaques',pele,cabelo};
}
async function carregarLojaComFiltros(){
  const container=document.querySelector('.grade-produtos.loja');if(!container)return;
  const f=obterFiltrosLoja();
  const q=new URLSearchParams();if(f.q)q.set('q',f.q);if(f.categoria)q.set('categoria',f.categoria);if(f.tag)q.set('tag',f.tag);if(f.promocao)q.set('promocao','true');if(f.destaque)q.set('destaque','true');
  if(f.ordenar==='Preço: menor para maior')q.set('ordenar','preco_asc');else if(f.ordenar==='Preço: maior para menor')q.set('ordenar','preco_desc');else if(f.ordenar==='Novidades')q.set('ordenar','novidades');else q.set('ordenar','destaques');
  try{let produtos=await apiFetch('/produtos'+(q.toString()?'?'+q:''));
    const match=(p,key,vals)=>!vals.length||vals.some(v=>String(p[key]||'').toLowerCase().split(/[,;\n]+|\s+/).includes(v.toLowerCase()));
    produtos=produtos.filter(p=>match(p,'tipoPele',f.pele)||!f.pele.length).filter(p=>match(p,'tipoCabelo',f.cabelo)||!f.cabelo.length);
    container.innerHTML=produtos.length?produtos.map(cardProduto).join(''):'<p class="catalogo-vazio">Não existem produtos para os filtros selecionados.</p>';
    const contador=document.querySelector('[data-contador-produtos]');if(contador)contador.textContent=`${produtos.length} ${produtos.length===1?'produto':'produtos'}`;
    container.querySelectorAll('button.botao-add-rapido').forEach(botao=>botao.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();adicionarAoCarrinho(botao.dataset.id,botao.dataset.nome,parseFloat(botao.dataset.preco),1,{imagem:decodeURIComponent(botao.dataset.imagem||''),stock:botao.dataset.stock});}));
  }catch(e){container.innerHTML='<p class="catalogo-vazio">Não foi possível carregar o catálogo neste momento.</p>';}
}
function iniciarFiltrosLoja(){document.querySelectorAll('.filtros input').forEach(i=>i.addEventListener('change',carregarLojaComFiltros));document.querySelector('.barra-loja select')?.addEventListener('change',carregarLojaComFiltros);}

// ---------- Toast ----------
function mostrarToast(texto){
  let toast = document.querySelector('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = texto;
  toast.classList.add('mostrar');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('mostrar'), 2500);
}

// ---------- Drawer do carrinho ----------
function abrirCarrinho(){
  document.querySelector('.overlay-carrinho')?.classList.add('aberto');
  document.querySelector('.drawer-carrinho')?.classList.add('aberto');
  renderizarDrawerCarrinho();
  sincronizarCarrinhoComCatalogo();
}
function fecharCarrinho(){
  document.querySelector('.overlay-carrinho')?.classList.remove('aberto');
  document.querySelector('.drawer-carrinho')?.classList.remove('aberto');
}

// ---------- Abas de produto ----------
function iniciarAbasProduto(){
  const botoes = document.querySelectorAll('.botao-aba');
  botoes.forEach(botao => {
    botao.addEventListener('click', () => {
      const alvo = botao.dataset.aba;
      document.querySelectorAll('.botao-aba').forEach(b => b.classList.remove('ativa'));
      document.querySelectorAll('.conteudo-aba').forEach(c => c.classList.remove('ativa'));
      botao.classList.add('ativa');
      document.querySelector(`.conteudo-aba[data-aba="${alvo}"]`)?.classList.add('ativa');
    });
  });
}

// ---------- Seletor de variação ----------
function iniciarVariacoes(){
  document.querySelectorAll('.opcoes-variacao').forEach(grupo => {
    grupo.querySelectorAll('.opcao-variacao').forEach(opcao => {
      opcao.addEventListener('click', () => {
        grupo.querySelectorAll('.opcao-variacao').forEach(o => o.classList.remove('selecionada'));
        opcao.classList.add('selecionada');
      });
    });
  });
}

// ---------- Seletor de quantidade ----------
function iniciarQuantidade(){
  document.querySelectorAll('.seletor-quantidade').forEach(seletor => {
    const span = seletor.querySelector('span');
    seletor.querySelector('.diminuir')?.addEventListener('click', () => {
      let valor = parseInt(span.textContent);
      if(valor > 1) span.textContent = valor - 1;
    });
    seletor.querySelector('.aumentar')?.addEventListener('click', () => {
      let valor = parseInt(span.textContent);
      span.textContent = valor + 1;
    });
  });
}

// ---------- Newsletter ----------
function iniciarNewsletter(){
  document.querySelectorAll('.form-newsletter').forEach(form => {
    if(!form.querySelector('[name=consentimento]')){const label=document.createElement('label');label.className='consentimento-newsletter';const check=document.createElement('input');check.type='checkbox';check.name='consentimento';check.required=true;label.append(check,document.createTextNode(' Aceito receber a newsletter e consultei a política de privacidade.'));form.insertBefore(label,form.querySelector('button'));}
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input=form.querySelector('input[type="email"]'), msg=form.querySelector('.newsletter-msg') || (()=>{const x=document.createElement('p');x.className='newsletter-msg';form.appendChild(x);return x})();
      const btn=form.querySelector('button'), consent=form.querySelector('[name=consentimento]'); if(!input)return;if(!consent||!consent.checked){msg.textContent='Assinale o consentimento para subscrever.';return;}
      msg.textContent='A enviar...'; if(btn)btn.disabled=true;
      try{await apiFetch('/publico/newsletter',{method:'POST',body:JSON.stringify({email:input.value,consentimento:true})});msg.textContent='Pedido recebido. Consulte o seu e-mail para confirmar a subscrição.';form.reset();}
      catch(err){msg.textContent=err.message;} finally{if(btn)btn.disabled=false;}
    });
  });
}

async function carregarHeroReal(){
  const hero=document.getElementById('hero-produto');
  const media=document.getElementById('hero-produto-media');
  const nome=document.getElementById('hero-produto-nome');
  if(!hero || !media || !nome) return;
  try{
    const produtos=await apiFetch('/produtos?destaque=true&limite=1');
    const p=Array.isArray(produtos) && produtos[0];
    if(!p) return;
    hero.href=`produto.html?id=${encodeURIComponent(p.id)}`;
    nome.textContent=p.nome || 'Produto de beleza';
    if(p.imagem_principal){
      media.innerHTML=`<img src="${escHtml(safeImageUrl(p.imagem_principal))}" alt="${escHtml(p.nome || 'Produto Lúmina')}" loading="eager">`;
    }
  }catch(e){
    // Mantém o hero institucional quando o catálogo ainda não está disponível.
  }
}


// ---------- Página inicial: destaques, promoções e produtos normais ----------
function homeCards(container, produtos){
  container.innerHTML = produtos.length ? produtos.map(cardProduto).join('') : '<p class="catalogo-vazio">Ainda não há produtos publicados nesta seleção.</p>';
  container.querySelectorAll('button.botao-add-rapido').forEach(botao=>botao.addEventListener('click',e=>{
    e.preventDefault(); e.stopPropagation();
    adicionarAoCarrinho(botao.dataset.id,botao.dataset.nome,parseFloat(botao.dataset.preco),1,{imagem:decodeURIComponent(botao.dataset.imagem||''),stock:botao.dataset.stock});
  }));
}

function homeLimiteVisivel(){ return window.innerWidth <= 640 ? 2 : 4; }

async function carregarHomeColecoes(){
  const destaques=document.querySelector('[data-home-grid="destaques"]');
  const promocoes=document.querySelector('[data-home-grid="promocoes"]');
  const normais=document.querySelector('[data-home-grid="normais"]');
  if(!destaques && !promocoes && !normais)return;
  try{
    const produtos=await apiFetch('/produtos?limite=100&ordenar=destaques');
    const publicados=Array.isArray(produtos)?produtos.filter(p=>p.ativo!==false):[];
    const isPromo=p=>p.promocaoAtiva===true && Number(p.promocaoPrecoEUR)>0 && Number(p.promocaoPrecoEUR)<Number(p.precoVendaEUR||0);
    const listaDestaques=publicados.filter(p=>p.destaque===true);
    const listaPromocoes=publicados.filter(isPromo);
    const listaNormais=publicados.filter(p=>p.destaque!==true && !isPromo(p));

    let paginaDestaques=0;
    const renderDestaques=()=>{
      if(!destaques)return;
      const porPagina=homeLimiteVisivel();
      const inicio=paginaDestaques*porPagina;
      homeCards(destaques,listaDestaques.slice(inicio,inicio+porPagina));
      const seta=document.querySelector('[data-home-next="destaques"]');
      if(seta){
        seta.hidden=listaDestaques.length<=porPagina;
        seta.disabled=inicio+porPagina>=listaDestaques.length;
        seta.setAttribute('aria-label',seta.disabled?'Não há mais produtos em destaque':'Ver mais produtos em destaque');
      }
    };
    renderDestaques();
    document.querySelector('[data-home-next="destaques"]')?.addEventListener('click',()=>{
      const porPagina=homeLimiteVisivel();
      if((paginaDestaques+1)*porPagina>=listaDestaques.length){paginaDestaques=0;}else{paginaDestaques++;}
      renderDestaques();
    });

    if(promocoes){
      homeCards(promocoes,listaPromocoes.slice(0,4));
      const mais=document.querySelector('[data-home-more="promocoes"]');
      if(mais)mais.hidden=listaPromocoes.length<=4;
      if(!listaPromocoes.length)promocoes.closest('.secao-promocoes-home')?.setAttribute('hidden','hidden');
    }

    if(normais){
      homeCards(normais,listaNormais);
      if(!listaNormais.length)normais.closest('.secao-normais-home')?.setAttribute('hidden','hidden');
    }

    if(!listaDestaques.length)destaques?.closest('.secao-destaques-home')?.setAttribute('hidden','hidden');
  }catch(e){
    console.error(e);
    [destaques,promocoes,normais].forEach(c=>{if(c)c.innerHTML='<p class="catalogo-vazio">Não foi possível carregar o catálogo neste momento.</p>';});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  atualizarContadorCarrinho();
  iniciarAbasProduto();
  iniciarVariacoes();
  iniciarQuantidade();
  iniciarNewsletter();

  document.querySelector('.botao-carrinho')?.addEventListener('click', abrirCarrinho);
  document.querySelector('.fechar-carrinho')?.addEventListener('click', fecharCarrinho);
  document.querySelector('.overlay-carrinho')?.addEventListener('click', fecharCarrinho);

  document.querySelectorAll('.botao-add-produto').forEach(botao => {
    botao.addEventListener('click', () => {
      const nome = botao.dataset.nome || 'Produto';
      const preco = parseFloat(botao.dataset.preco || '0');
      const id = botao.dataset.id;
      const quantidadeEl = document.querySelector('.seletor-quantidade span');
      const quantidade = quantidadeEl ? parseInt(quantidadeEl.textContent) : 1;
      adicionarAoCarrinho(id, nome, preco, quantidade, {imagem: botao.dataset.imagem || null});
    });
  });
  iniciarFiltrosLoja();
  carregarLojaComFiltros();
  carregarHeroReal();
  carregarHomeColecoes();
});

// ---------- FAQ acordeão ----------
function iniciarFAQ(){
  document.querySelectorAll('.pergunta-faq').forEach(botao => {
    botao.addEventListener('click', () => {
      botao.closest('.item-faq').classList.toggle('aberto');
    });
  });
}

// ---------- Renderizar carrinho na página carrinho.html ----------
function renderizarPaginaCarrinho(){
  const container = document.querySelector('.itens-pagina-carrinho');
  if(!container) return;
  ligarEventosCarrinho(container);
  const itens = lerCarrinho();
  const vazio = itens.length === 0;
  container.innerHTML = vazio
    ? `<div class="estado-vazio">${escHtml(tr('O seu carrinho está vazio.'))} <a href="/loja.html" style="color:var(--terracota-escuro)">${escHtml(tr('Ver produtos'))}</a></div>`
    : itens.map(htmlItemCarrinho).join('');
  const subtotal = subtotalCarrinho(itens);
  const cupao = vazio ? null : lerCupao();
  const desconto = cupao ? Math.min(subtotal, Number(cupao.descontoEUR || 0)) : 0;
  const total = Math.max(0, subtotal - desconto);
  document.querySelectorAll('.valor-subtotal-pagina').forEach(el => el.textContent = moedaCarrinho(subtotal));
  document.querySelectorAll('.valor-total-pagina').forEach(el => el.textContent = moedaCarrinho(total));
  const linha = document.getElementById('cp-desconto-linha');
  if(linha){
    linha.hidden = !(desconto > 0);
    const v = document.getElementById('cp-desconto');
    if(v) v.textContent = '− ' + moedaCarrinho(desconto);
  }
  const campo = document.getElementById('cp-cupao');
  if(campo && cupao && document.activeElement !== campo) campo.value = cupao.codigo;
  const btn = document.getElementById('cp-finalizar');
  if(btn){ btn.classList.toggle('desativado', vazio); btn.setAttribute('aria-disabled', vazio ? 'true' : 'false'); }
}
function iniciarPaginaCarrinho(){
  if(!document.querySelector('.itens-pagina-carrinho')) return;
  renderizarPaginaCarrinho();
  document.getElementById('cp-finalizar')?.addEventListener('click', e => { if(!lerCarrinho().length) e.preventDefault(); });
  const aplicar = document.getElementById('cp-aplicar-cupao'), campo = document.getElementById('cp-cupao');
  const aplicarCupao = async () => {
    const codigo = (campo.value || '').trim();
    if(!codigo){ guardarCupao(null); mostrarMensagemCupao(tr('Cupão removido.'), false); renderizarPaginaCarrinho(); return; }
    aplicar.disabled = true; mostrarMensagemCupao(tr('A validar…'), false);
    try{ await validarCupaoCarrinho(codigo); mostrarMensagemCupao(tr('Cupão aplicado.'), false); }
    catch(e){ guardarCupao(null); mostrarMensagemCupao(e.message, true); }
    finally{ aplicar.disabled = false; renderizarPaginaCarrinho(); }
  };
  aplicar?.addEventListener('click', aplicarCupao);
  campo?.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); aplicarCupao(); } });
  sincronizarCarrinhoComCatalogo({ forcar: true }).then(() => { if(lerCupao()) revalidarCupaoCarrinho(); });
}
// Atualiza preços quando a moeda muda ou as taxas de câmbio terminam de carregar
window.addEventListener('lumina:currency-changed', () => renderizarCarrinho());
window.addEventListener('lumina:currency-ready', () => renderizarCarrinho());
document.addEventListener('keydown', e => { if(e.key === 'Escape') fecharCarrinho(); });

// ---------- Checkout: escolher forma de pagamento ----------
function iniciarPagamento(){
  document.querySelectorAll('.opcao-pagamento').forEach(op => {
    op.addEventListener('click', () => {
      document.querySelectorAll('.opcao-pagamento').forEach(o => o.style.borderColor = 'var(--linha)');
      op.style.borderColor = 'var(--marrom)';
      op.querySelector('input')?.setAttribute('checked','checked');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarFAQ();
  iniciarPaginaCarrinho();
  iniciarPagamento();
});

