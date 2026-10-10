  document.getElementById('cd-botao').addEventListener('click', async () => {
    const nome = document.getElementById('cd-nome').value.trim();
    const email = document.getElementById('cd-email').value.trim();
    const palavraPasse = document.getElementById('cd-senha').value;
    const erroEl = document.getElementById('cd-erro');
    try{
      const resultado = await apiFetch('/auth/clientes/registar', { method: 'POST', body: JSON.stringify({ nome, email, palavraPasse }) });
      guardarTokenCliente(resultado.token);
      window.location.href = 'painel.html';
    }catch(e){
      erroEl.textContent = e.message; erroEl.style.display = 'block';
    }
  });
