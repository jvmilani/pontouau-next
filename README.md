# Pontouau Web

Front Next.js do Pontouau. Consome a API em `../pontouau` (`cmd/api`).

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A API precisa estar rodando:

```bash
cd ../pontouau
go run ./cmd/api
```

## Variáveis

| Var | Default | Descrição |
|-----|---------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Base URL da API |

## Deploy

- Front: Vercel / qualquer host Node (`npm run build && npm start`)
- API: Docker no repositório `pontouau` (`docker compose up --build`)

Em produção, aponte `NEXT_PUBLIC_API_URL` para a URL pública da API e configure `CORS_ORIGINS` na API com a URL deste front.
