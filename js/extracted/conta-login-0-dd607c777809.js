  document.getElementById('lg-botao').addEventListener('click', async () => {
    const email = document.getElementById('lg-email').value.trim();
    const palavraPasse = document.getElementById('lg-senha').value;
    const erroEl = document.getElementById('lg-erro');
    try{
      const resultado = await apiFetch('/auth/clientes/login', { method: 'POST', body: JSON.stringify({ email, palavraPasse }) });
      guardarTokenCliente(resultado.token);
      window.location.href = 'painel.html';
    }catch(e){
      erroEl.textContent = e.message; erroEl.style.display = 'block';
    }
  });
