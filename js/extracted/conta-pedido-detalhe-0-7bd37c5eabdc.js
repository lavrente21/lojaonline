if(!obterTokenCliente())location.href='login.html';
document.addEventListener('DOMContentLoaded',()=>{
  const $p=id=>document.getElementById(id);
  const T=t=>(typeof tr==='function'?tr(t):t);
  const numero=new URLSearchParams(location.search).get('numero');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eur=v=>LuminaPedido.dinheiro(v,'EUR');
  function nomePais(cod){try{return new Intl.DisplayNames([LuminaPedido.locale()],{type:'region'}).of(String(cod).toUpperCase())||cod}catch(e){return cod}}

  async function carregar(){
    if(!numero){$p('pd-erro').textContent=T('Pedido não indicado.');return;}
    $p('pd-erro').textContent='';
    let p;
    try{p=await apiFetch('/pedidos/meus/'+encodeURIComponent(numero));}
    catch(e){$p('pd-erro').textContent=e.message;return;}
    $p('pd-titulo').textContent=T('Encomenda')+' #'+p.numeroPedido;
    $p('pd-data').textContent=T('Feita em')+' '+LuminaPedido.dataHora(p.criadoEm);
    document.title=T('Encomenda')+' #'+p.numeroPedido+' — Lúmina';

    // Painel de estado + pagamento (usa o e-mail da conta para validar o acesso)
    const painel=$p('pd-painel');
    const refrescar=()=>carregar();
    try{
      const d=await LuminaPedido.buscar(p.numeroPedido,p.clienteEmail);
      LuminaPedido.render(painel,d,{numero:p.numeroPedido,email:p.clienteEmail,aoAtualizar:refrescar});
    }catch(e){
      painel.replaceChildren(LuminaPedido.el('span',{class:'badge-status '+classeEstadoPedido(p.estado),text:estadoPT(p.estado)}));
    }

    // Artigos e totais
    $p('pd-cartao-itens').hidden=false;
    $p('pd-itens').innerHTML=(p.itens||[]).map(i=>`<div class="linha-resumo"><span>${esc(i.nome_produto||T('Produto'))} ×${Number(i.quantidade||1)}</span><span>${eur(Number(i.preco_unitario_eur||0)*Number(i.quantidade||1))}</span></div>`).join('');
    const sub=p.subtotalEUR!=null?p.subtotalEUR:Math.max(0,Number(p.totalEUR||0)-Number(p.freteEUR||0)+Number(p.descontoEUR||0));
    $p('pd-subtotal').textContent=eur(sub);
    $p('pd-desconto-linha').hidden=!(p.descontoEUR>0);
    if(p.descontoEUR>0){$p('pd-desconto').textContent='− '+eur(p.descontoEUR);$p('pd-cupao').textContent=p.cupaoCodigo?'('+p.cupaoCodigo+')':'';}
    const portesConf=p.portesEstado==='confirmado'||p.freteEUR!=null&&p.portesEstado!=='por_confirmar';
    $p('pd-portes').textContent=portesConf?eur(p.freteEUR||0):T('A confirmar');
    $p('pd-total').textContent=portesConf?eur(p.totalEUR):eur(p.totalEUR)+' + '+T('portes');
    const vm=$p('pd-valor-moeda');
    if(portesConf&&p.pagamento&&p.pagamento.moeda&&p.pagamento.moeda!=='EUR'&&p.pagamento.valor_esperado!=null){
      vm.textContent=T('Valor a pagar')+': '+LuminaPedido.dinheiro(p.pagamento.valor_esperado,p.pagamento.moeda);vm.hidden=false;
    }else vm.hidden=true;

    // Morada
    const m=p.moradaEntrega||{};
    if(m.linha1){
      const linhas=[p.clienteNome,m.linha1,m.linha2,[m.codigoPostal,m.cidade].filter(Boolean).join(' '),m.provincia,nomePais(m.pais),m.telefone&&('☎ '+m.telefone)].filter(Boolean);
      $p('pd-morada').innerHTML=linhas.map(esc).join('<br>');
      $p('pd-cartao-morada').hidden=false;
    }

    // Envio e rastreio
    const envios=(p.envios||[]).filter(e=>e.rastreio1||e.rastreio2||e.prazoEstimadoDias);
    if(envios.length){
      $p('pd-envios').innerHTML=envios.map(e=>`<div class="envio-pedido"><strong>${T('Volume')} ${e.volume}</strong>${e.rastreio1?`<div class="linha-dado"><span class="rotulo-dado">${esc(T('Código de rastreio'))}</span><span class="valor-dado">${esc(e.rastreio1)}</span></div>`:''}${e.rastreio2?`<div class="linha-dado"><span class="rotulo-dado">${esc(T('Rastreio local'))}</span><span class="valor-dado">${esc(e.rastreio2)}</span></div>`:''}${e.prazoEstimadoDias?`<p class="pequeno">${esc(T('Prazo estimado'))}: ${esc(e.prazoEstimadoDias)} ${esc(T('dias'))}</p>`:''}</div>`).join('');
      $p('pd-cartao-envio').hidden=false;
    }
  }
  carregar();
});
