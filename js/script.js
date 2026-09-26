// ---------- Carrinho (armazenado no navegador) ----------
function lerCarrinho(){
  try{ return JSON.parse(localStorage.getItem('lumina_carrinho')) || []; }
  catch(e){ return []; }
}
function guardarCarrinho(itens){
  localStorage.setItem('lumina_carrinho', JSON.stringify(itens));
  atualizarContadorCarrinho();
}
function atualizarContadorCarrinho(){
  const itens = lerCarrinho();
  const total = itens.reduce((soma, item) => soma + item.quantidade, 0);
  document.querySelectorAll('.contador-carrinho').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}
function adicionarAoCarrinho(nome, preco, quantidade = 1){
  const itens = lerCarrinho();
  const existente = itens.find(i => i.nome === nome);
  if(existente){ existente.quantidade += quantidade; }
  else{ itens.push({ nome, preco, quantidade }); }
  guardarCarrinho(itens);
  mostrarToast(`${nome} adicionado ao carrinho`);
  renderizarDrawerCarrinho();
}
function renderizarDrawerCarrinho(){
  const container = document.querySelector('.itens-drawer');
  const rodape = document.querySelector('.rodape-drawer');
  if(!container) return;
  const itens = lerCarrinho();
  if(itens.length === 0){
    container.innerHTML = '<p class="carrinho-vazio">O seu carrinho está vazio.</p>';
    if(rodape) rodape.style.display = 'none';
    return;
  }
  if(rodape) rodape.style.display = 'block';
  container.innerHTML = itens.map(item => `
    <div class="item-drawer">
      <div class="miniatura-item"></div>
      <div style="flex:1">
        <div style="font-size:14px;margin-bottom:4px">${item.nome}</div>
        <div style="font-size:13px;color:#8A7A70">Qtd: ${item.quantidade} · €${(item.preco * item.quantidade).toFixed(2)}</div>
      </div>
    </div>
  `).join('');
  const subtotal = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
  const spanSubtotal = document.querySelector('.valor-subtotal');
  if(spanSubtotal) spanSubtotal.textContent = `€${subtotal.toFixed(2)}`;
}

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
    form.addEventListener('submit', e => {
      e.preventDefault();
      mostrarToast('Obrigado por subscrever! Verifique o seu e-mail.');
      form.reset();
    });
  });
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

  document.querySelectorAll('.botao-add-rapido, .botao-add-produto').forEach(botao => {
    botao.addEventListener('click', () => {
      const nome = botao.dataset.nome || 'Produto';
      const preco = parseFloat(botao.dataset.preco || '0');
      const quantidadeEl = document.querySelector('.seletor-quantidade span');
      const quantidade = quantidadeEl ? parseInt(quantidadeEl.textContent) : 1;
      adicionarAoCarrinho(nome, preco, botao.classList.contains('botao-add-produto') ? quantidade : 1);
    });
  });
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
  const itens = lerCarrinho();
  if(itens.length === 0){
    container.innerHTML = '<div class="estado-vazio">O seu carrinho está vazio. <a href="loja.html" style="color:var(--terracota-escuro)">Ver produtos</a></div>';
  } else {
    container.innerHTML = itens.map((item, i) => `
      <div class="linha-item-carrinho">
        <div class="miniatura-linha"></div>
        <div>
          <div style="font-size:15px;margin-bottom:4px">${item.nome}</div>
          <div class="remover-item" onclick="removerDoCarrinho(${i})" style="cursor:pointer">Remover</div>
        </div>
        <div style="font-size:14px">Qtd: ${item.quantidade}</div>
        <div style="font-weight:600">€${(item.preco * item.quantidade).toFixed(2)}</div>
      </div>
    `).join('');
  }
  const subtotal = itens.reduce((s,i)=> s + i.preco*i.quantidade, 0);
  document.querySelectorAll('.valor-subtotal-pagina').forEach(el => el.textContent = `€${subtotal.toFixed(2)}`);
  document.querySelectorAll('.valor-total-pagina').forEach(el => el.textContent = `€${(subtotal >= 45 || subtotal===0 ? subtotal : subtotal+4.90).toFixed(2)}`);
}
function removerDoCarrinho(indice){
  const itens = lerCarrinho();
  itens.splice(indice,1);
  guardarCarrinho(itens);
  renderizarPaginaCarrinho();
}

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
  renderizarPaginaCarrinho();
  iniciarPagamento();
});
