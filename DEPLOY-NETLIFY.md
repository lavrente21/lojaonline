# Netlify — Lúmina

1. Suba esta pasta como site estático no Netlify.
2. Publique o site em HTTPS.
3. O frontend usa `https://lojaonline-backend.onrender.com/api` por padrão.
4. Se o serviço Render tiver outro endereço, edite `js/api.js` antes do deploy ou defina `window.LUMINA_API_BASE_URL` antes desse script.
5. No Render, inclua o domínio Netlify em `ORIGENS_PERMITIDAS`.
