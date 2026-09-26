# Admin — Netlify

Publique esta pasta como site estático separado no Netlify. O login e todas as operações administrativas passam pela API Render; não coloque credenciais de banco, Stripe, CJ, BuckyDrop ou AppyPay neste site.

## API de produção

O Admin usa por defeito `https://lumina-api.onrender.com/api`. Se o serviço Render tiver outro URL, defina `window.LUMINA_API_BASE_URL` antes de `js/api.js`.

Nunca coloque segredos de integração no Netlify.
