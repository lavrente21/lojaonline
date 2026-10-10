document.addEventListener('DOMContentLoaded', async()=>{
 const grid=document.querySelector('.grade-promocoes');
 try{
  const produtos=await apiFetch('/produtos?promocao=true&ordenar=novidades');
  if(!produtos.length){grid.innerHTML='<p class="catalogo-vazio">Ainda não existem promoções ativas.</p>';return;}
  grid.innerHTML=produtos.map(cardProduto).join('');
  grid.querySelectorAll('.botao-add-rapido').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();adicionarAoCarrinho(b.dataset.id,b.dataset.nome,Number(b.dataset.preco),1,{imagem:decodeURIComponent(b.dataset.imagem||'')});}));
 }catch(e){grid.innerHTML='<p class="catalogo-vazio">Não foi possível carregar as promoções. Tente novamente mais tarde.</p>';}
});
