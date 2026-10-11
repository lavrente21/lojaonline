  function escaparRastreio(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const T = t => (typeof tr === 'function' ? tr(t) : t);
  async function rastrear(){
    const numero = document.getElementById('rt-numero').value.trim().replace(/^#/, '');
    const resultadoEl = document.getElementById('rt-resultado');
    const botao = document.getElementById('rt-botao');
    const email = document.getElementById('rt-email').value.trim();
    if(!numero){ resultadoEl.textContent = T('Introduza o número da encomenda.'); return; }
    if(!email){ resultadoEl.textContent = T('Introduza o e-mail usado na encomenda.'); return; }
    resultadoEl.innerHTML = `<p style="font-size:14px;color:#8A7A70">${escaparRastreio(T('A procurar...'))}</p>`;
    botao.disabled = true;
    try{
      const pedido = await apiFetch('/pedidos/rastrear/' + encodeURIComponent(numero) + '?email=' + encodeURIComponent(email), {semRedirecionar:true});
      const envios = (pedido.envios || []).map(e => `
        <div class="envio-pedido"><strong>${escaparRastreio(T('Volume'))} ${e.volume}</strong>
        ${e.rastreio1 ? `<div class="linha-dado"><span class="rotulo-dado">${escaparRastreio(T('Código de rastreio'))}</span><span class="valor-dado">${escaparRastreio(e.rastreio1)}</span></div>` : ''}
        ${e.rastreio2 ? `<div class="linha-dado"><span class="rotulo-dado">${escaparRastreio(T('Rastreio local'))}</span><span class="valor-dado">${escaparRastreio(e.rastreio2)}</span></div>` : ''}
        ${!e.rastreio1 && !e.rastreio2 ? `<p class="pequeno">${escaparRastreio(T('Ainda sem código de rastreio.'))}</p>` : ''}</div>`).join('');
      resultadoEl.innerHTML = `<div class="cartao-conta" style="text-align:left" id="rt-cartao">
          <h2>${escaparRastreio(T('Encomenda'))} #${escaparRastreio(pedido.numeroPedido)}</h2>
          <p style="margin-bottom:14px"><span class="badge-status ${classeEstadoPedido(pedido.estado)}">${escaparRastreio(estadoPT(pedido.estado))}</span></p>
          <div id="rt-progresso"></div>
          ${envios || `<p style="font-size:13.5px;color:#8A7A70">${escaparRastreio(T('Ainda sem informação de envio.'))}</p>`}
        </div>`;
      if(window.LuminaPedido){ const pr = LuminaPedido.progresso(pedido.estado); if(pr) document.getElementById('rt-progresso').appendChild(pr); }
    }catch(e){
      resultadoEl.textContent = T('Não foi possível encontrar essa encomenda:') + ' ' + e.message;
    }finally{ botao.disabled = false; }
  }
  document.getElementById('rt-botao').addEventListener('click', rastrear);
  ['rt-numero','rt-email'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); rastrear(); } }));
