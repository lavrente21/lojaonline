# Lúmina — Loja pública (front-end ligado ao backend)

## Como testar tudo a funcionar

1. Arrancar o backend primeiro (ver `lumina-backend/README.md`):
   ```bash
   cd lumina-backend
   npm install
   cp .env.example .env
   node seed.js
   node server.js
   ```
   Isto deixa a API a correr em `http://localhost:3000`.

2. Abrir `index.html` desta pasta diretamente no navegador (duplo clique, ou
   com um servidor local simples tipo `npx serve .`).

## O que já está ligado à API real

- **Home / Loja / Produto** — os produtos vêm de `GET /api/produtos` (editáveis no admin)
- **Carrinho** — guardado no navegador, com o ID real do produto
- **Checkout** — chama `POST /api/checkout`. Se o país de entrega for **Angola**,
  aparece automaticamente a opção de pagar em **Kwanza (Multicaixa Express)**
- **Confirmação** — mostra o número de pedido real, total em EUR ou AOA, e o
  prazo estimado (mais longo se for via agente de carga)
- **Rastrear encomenda** — busca o estado real do pedido, incluindo os dois
  rastreios (fornecedor→agente e agente→destino final) quando aplicável
- **Conta do cliente** (login/registo/meus pedidos) — autenticação real com JWT

## Nota

Se o backend não estiver a correr, as páginas mostram uma mensagem a avisar
("Não foi possível ligar ao servidor") em vez de falhar silenciosamente.
