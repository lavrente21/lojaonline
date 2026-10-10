# Deploy Netlify — loja Lúmina

O backend deve ser publicado e validado primeiro. Não inventar URLs.

Variáveis de build obrigatórias:
- `LUMINA_API_BASE_URL`: URL HTTPS real do serviço de API, sem adivinhar host.
- `SITE_URL`: URL HTTPS canónica real da loja (necessária na loja para gerar sitemap).
- `LUMINA_LEGAL_VALIDADO`: `true` apenas após validação jurídica e contabilística do titular; caso contrário manter `false`.

O build gera `js/config.js`. Se a URL da API estiver vazia, a loja mostra aviso e as chamadas não são feitas. Loja: `node scripts/write-config.js && node scripts/generate-sitemap.js`. Admin: `node scripts/write-config.js`. Configure os valores no painel Netlify; nunca comite credenciais ou URLs provisórias.
