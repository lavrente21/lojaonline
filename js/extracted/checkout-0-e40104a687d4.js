  let PORTES_EUR = 0;
  let METODO_ENVIO = null;
  let FRETE_USD = null;
  let METODO_PAGAMENTO = null;
  function moedaAtual(){return (window.LUMINA&&window.LUMINA.currency)?window.LUMINA.currency():'EUR';}
  function formatar(valor, moeda=moedaAtual()){return window.LUMINA?window.LUMINA.money(valor, moeda):`${Number(valor).toFixed(2)} ${moeda}`;}
  let TOTAL_BASE_EUR=0;
  let CUPAO_CODE=null;
  let CUPAO_DISCOUNT=0;

  function escaparHTML(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function renderizarResumoCheckout(){
    const itens = lerCarrinho();
    const container = document.getElementById('ck-lista-itens');
    if(itens.length === 0){
      container.innerHTML = '<p style="font-size:13.5px;color:#8A7A70">O seu carrinho está vazio.</p>';
    } else {
      container.innerHTML = itens.map(i => `<div class="linha-resumo"><span>${escaparHTML(i.nome)} ×${i.quantidade}</span><span>${(i.preco*i.quantidade).toFixed(2)} €</span></div>`).join('');
    }
    const subtotal = itens.reduce((s,i)=>s+i.preco*i.quantidade,0);
    const total = itens.length ? Math.max(0,subtotal-CUPAO_DISCOUNT) : 0; TOTAL_BASE_EUR=total;
    document.getElementById("ck-desconto-linha").hidden=!(CUPAO_DISCOUNT>0);document.getElementById("ck-desconto").textContent=CUPAO_DISCOUNT>0?`− ${formatar(CUPAO_DISCOUNT)}`:"—";
    document.getElementById('ck-portes').textContent = itens.length ? (PORTES_EUR ? formatar(PORTES_EUR) : 'A calcular') : '—';
    document.getElementById('ck-total').textContent = formatar(total);
    return total;
  }

  async function carregarMetodosPagamento(){
    const box=document.getElementById('ck-metodos-pagamento');
    const botao=document.getElementById('ck-botao-confirmar');
    try{
      const r=await apiFetch('/pagamentos/metodos');
      const nomes={transferencia:'Transferência bancária',multicaixa:'Multicaixa Express / referência',deposito:'Depósito bancário'};
      box.replaceChildren();
      (r.metodos||[]).forEach((metodo,index)=>{const label=document.createElement('label');label.className='campo-formulario';label.style.display='block';label.style.margin='10px 0';const radio=document.createElement('input');radio.type='radio';radio.name='ck-metodo-pagamento';radio.value=metodo;radio.checked=index===0;radio.addEventListener('change',()=>{METODO_PAGAMENTO=metodo;});label.append(radio,document.createTextNode(' '+(nomes[metodo]||metodo)));box.appendChild(label);if(index===0)METODO_PAGAMENTO=metodo;});
      if(!(r.metodos||[]).length){const p=document.createElement('p');p.textContent='Pagamento temporariamente indisponível. A loja ainda não configurou métodos válidos.';box.appendChild(p);METODO_PAGAMENTO=null;botao.disabled=true;}
      else botao.disabled=false;
    }catch(_){box.textContent='Não foi possível verificar os métodos de pagamento. Tente novamente mais tarde.';METODO_PAGAMENTO=null;botao.disabled=true;}
  }

  async function calcularPortesCheckout(){
    const itens=lerCarrinho(); PORTES_EUR=0; METODO_ENVIO=null; FRETE_USD=null;
    const box=document.getElementById('ck-frete-opcoes');
    if(!itens.length){box.textContent='';document.getElementById('ck-portes').textContent='—';renderizarResumoCheckout();return;}
    box.textContent='A consultar opções de envio…'; document.getElementById('ck-portes').textContent='A consultar';
    try{
      const r=await apiFetch('/checkout/quote',{method:'POST',body:JSON.stringify({itens:itens.map(i=>({produtoId:i.produtoId,quantidade:i.quantidade,idVariante:i.idVariante||null})),pais:document.getElementById('ck-pais').value,codigoPostal:document.getElementById('ck-codigo-postal').value.trim(),provincia:document.getElementById('ck-provincia').value.trim(),moeda:moedaAtual(),cupao:CUPAO_CODE||undefined})});
      box.replaceChildren();
      if(r.portesConfirmados&&Array.isArray(r.fornecedores)&&r.fornecedores.length){
        const valores=[];
        for(const f of r.fornecedores){const validos=(f.metodos||[]).filter(m=>Number.isFinite(Number(m.totalEUR)));if(!validos.length)continue;const m=validos.reduce((a,b)=>Number(a.totalEUR)<=Number(b.totalEUR)?a:b);valores.push(Number(m.totalEUR));const p=document.createElement('p');p.className='nota-frete';p.textContent=`${f.fornecedor}: ${m.nome} — ${formatar(m.totalEUR)}${m.prazo?' · '+m.prazo:''}`;box.appendChild(p);}
        if(valores.length===r.fornecedores.length){PORTES_EUR=Number(valores.reduce((a,b)=>a+b,0).toFixed(2));document.getElementById('ck-portes').textContent=formatar(PORTES_EUR);const note=document.createElement('p');note.className='nota-frete';note.textContent='Estimativa de referência. O total final e a disponibilidade serão confirmados antes de qualquer pagamento.';box.appendChild(note);} else {document.getElementById('ck-portes').textContent='A confirmar';}
      }else{const note=document.createElement('p');note.className='nota-frete';note.textContent=(r.avisos||[]).join(' · ')||r.mensagem||'Os portes serão confirmados manualmente antes de qualquer pagamento.';box.appendChild(note);document.getElementById('ck-portes').textContent='A confirmar';}
    }catch(e){box.textContent='Não foi possível calcular os portes automaticamente. A equipa confirmará o valor antes de qualquer pagamento.';document.getElementById('ck-portes').textContent='A confirmar';}
    renderizarResumoCheckout();
  }

  function alternarPagamentoConformePais(){calcularPortesCheckout();}
  function atualizarObrigatoriedadeTelefone(){}

  document.addEventListener('DOMContentLoaded', () => {
    renderizarResumoCheckout();
    carregarMetodosPagamento();
    document.getElementById('ck-pais').addEventListener('change', ()=>{localStorage.setItem('lumina_country', document.getElementById('ck-pais').value);calcularPortesCheckout();});
    document.getElementById('ck-codigo-postal').addEventListener('blur', calcularPortesCheckout);
    document.getElementById('ck-provincia').addEventListener('blur', calcularPortesCheckout);
    calcularPortesCheckout();
    document.getElementById('ck-aplicar-cupao').addEventListener('click',async()=>{const campo=document.getElementById('ck-cupao'),msg=document.getElementById('ck-cupao-msg'),codigo=campo.value.trim();if(!codigo){CUPAO_CODE=null;CUPAO_DISCOUNT=0;msg.textContent='Cupão removido.';msg.style.color='#2E7D4F';renderizarResumoCheckout();return;}const subtotal=lerCarrinho().reduce((s,i)=>s+Number(i.preco)*Number(i.quantidade),0);const btn=document.getElementById('ck-aplicar-cupao');btn.disabled=true;msg.textContent='A validar…';try{const r=await apiFetch('/checkout/validar-cupao',{method:'POST',body:JSON.stringify({codigo,subtotalEUR:subtotal})});CUPAO_CODE=r.codigo;CUPAO_DISCOUNT=Number(r.descontoEUR||0);msg.textContent=`Cupão aplicado: desconto de ${formatar(CUPAO_DISCOUNT)}.`;msg.style.color='#2E7D4F';renderizarResumoCheckout();}catch(e){CUPAO_CODE=null;CUPAO_DISCOUNT=0;msg.textContent=e.message;msg.style.color='#B14B33';renderizarResumoCheckout();}finally{btn.disabled=false;}});

    document.getElementById('ck-botao-confirmar').addEventListener('click', async () => {
      const erroEl = document.getElementById('ck-erro');
      erroEl.style.display = 'none';
      const itens = lerCarrinho();
      if(itens.length === 0){ erroEl.textContent = 'O seu carrinho está vazio.'; erroEl.style.display='block'; return; }

      const nome = document.getElementById('ck-nome').value.trim();
      const email = document.getElementById('ck-email').value.trim();
      const cidade = document.getElementById('ck-cidade').value.trim();
      const provincia = document.getElementById('ck-provincia').value.trim();
      const morada = document.getElementById('ck-morada').value.trim();
      const moradaLinha2 = document.getElementById('ck-morada-linha2').value.trim();
      const codigoPostal = document.getElementById('ck-codigo-postal').value.trim();
      const pais = document.getElementById('ck-pais').value;
      const telefone = document.getElementById('ck-telefone').value.trim();
      const metodo = METODO_PAGAMENTO;

      if(!METODO_PAGAMENTO){erroEl.textContent='Não há métodos de pagamento configurados neste momento. A encomenda não foi criada.';erroEl.style.display='block';return;}
      if(!nome || !email || !cidade || !morada){
        erroEl.textContent = 'Preencha nome, e-mail, cidade e morada.'; erroEl.style.display='block'; return;
      }
      

      const corpo = {
        nome, email, telefoneCliente: telefone || undefined,
        itens: itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, idVariante: i.idVariante || null })),
        moradaEntrega: { linha1: morada, linha2: moradaLinha2 || undefined, cidade, provincia: provincia || undefined, codigoPostal, pais },
        moeda: moedaAtual(),
        metodoPagamento: metodo,
        cupao: CUPAO_CODE || undefined
      };

      const botao = document.getElementById('ck-botao-confirmar');
      botao.textContent = 'A processar...'; botao.disabled = true;
      try{
        const resultado = await apiFetch('/checkout', { method: 'POST', body: JSON.stringify(corpo) });
        localStorage.removeItem('lumina_carrinho');
        if (resultado.pagamento?.urlCheckout) { window.location.href = resultado.pagamento.urlCheckout; return; }
        const params = new URLSearchParams({
          numero: resultado.numeroPedido,
          totalEUR: resultado.totalEUR,
          totalMoeda: resultado.totalMoeda || '',
          moeda: resultado.moeda || corpo.moeda,
          rota: resultado.rotaEnvio,
          idCobranca: resultado.pagamento.idCobranca || '',
          metodo: resultado.pagamento.metodo || '',
          mensagem: resultado.pagamento.mensagem || ''
        });
        window.location.href = 'confirmacao.html?' + params.toString();
      }catch(e){
        erroEl.textContent = 'Não foi possível registar a encomenda: ' + e.message;
        erroEl.style.display = 'block';
        botao.textContent = 'Confirmar pedido'; botao.disabled = false;
      }
    });
  });
