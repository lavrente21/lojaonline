# Lúmina — Frontend Netlify

1. Publique esta pasta no Netlify.
2. O site é estático e não usa Vite nem build step. Não é necessário configurar `VITE_API_URL`.
3. A API de produção está definida em `js/api.js` como `https://lojaonline-backend.onrender.com/api`.
4. Se precisar de outro backend, defina `window.LUMINA_API_BASE_URL` antes de carregar `js/api.js`.
5. O frontend não contém segredos de Stripe, CJ, BuckyDrop, AppyPay ou Supabase.
6. Os produtos públicos, formulários e áreas da conta usam dados reais da API do Render.
