const params = new URLSearchParams(window.location.search);
const nomes = {'skincare':'Skincare','hair':'Hair care','body':'Body care','maquilhagem':'Maquilhagem'};
const titulo = document.getElementById('titulo-categoria');
if(titulo && params.get('cat') && nomes[params.get('cat')]) titulo.textContent = nomes[params.get('cat')];
const link=document.getElementById('categoria-ver-loja'); if(link&&params.get('cat')) link.href='loja.html?cat='+encodeURIComponent(nomes[params.get('cat')]||params.get('cat')); 
