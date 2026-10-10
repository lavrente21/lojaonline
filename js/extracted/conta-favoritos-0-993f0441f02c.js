document.addEventListener('DOMContentLoaded',async()=>{
 const el=document.getElementById('favoritos-real');
 try{
  if(!obterTokenCliente()){el.innerHTML='<p class="catalogo-vazio">Inicie sessão para consultar os seus favoritos.</p>';return;}
  const rows=await apiFetch('/publico/favoritos');
  if(!rows.length){el.innerHTML='<p class="catalogo-vazio">Ainda não adicionou produtos aos favoritos.</p>';return;}
  el.innerHTML=rows.map(p=>cardProduto(p)).join('');
 }catch(e){el.textContent='Não foi possível carregar os favoritos: '+e.message;}
});
