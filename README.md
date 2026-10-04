# ORBITA — frontend operacional

Frontend separado para empresas, entregadores e administradores. Usa Next.js App Router, React, TypeScript estrito, React Hook Form, Zod, TanStack Query e Socket.IO. A interface usa CSS Modules para layouts e páginas, tokens globais para a identidade e classes semânticas compartilhadas para controles, tabelas, estados e formulários.

O contrato de identidade está integrado ao backend: o BFF cria a sessão a partir de `POST /auth/login`, consulta `GET /auth/me`, atualiza a conta em `PATCH /auth/me` e encerra sessões antigas após troca de senha. Os fluxos de documentos usam o endpoint privado multipart, com política de arquivo fornecida pela API. A autorização final continua no backend e cada tela apresenta somente respostas reais.

A identidade visual ORBITA usa verde `#00E676` e `#00C896`, preto profundo `#0A0F14`, cinza escuro `#1A2228`, cinza claro `#E9EDF2`, Sora para títulos e Inter para textos. O componente reutilizável [`Logo`](src/components/brand/logo.tsx) aplica o símbolo fornecido em navegação, autenticação, favicon e landing page. O mapa de tokens e a origem dos arquivos estão em [`docs/visual-system.md`](docs/visual-system.md).

## Instalação

Pré-requisitos: Node.js `>=22.12 <25`, npm, backend ORBITA e Redis acessível pelo servidor Next.js. Mantenha os projetos em pastas irmãs, sem copiar código do frontend para o backend:

```text
projetos/
  orbita-backend/    # também pode estar nomeado Orbita
  orbita-frontend/
```

Na pasta do frontend:

```sh
npm ci
npm run setup:env
npm run dev
```

Abra [http://localhost:3001](http://localhost:3001). O script de ambiente cria `.env.local` a partir de `.env.example`, gera uma chave aleatória e preserva um arquivo já existente. Não compartilhe nem versione `.env.local`.

O backend deve estar disponível em `http://localhost:3000/api/v1`; sua documentação fica em `http://localhost:3000/api/docs`. Inicie API, worker e infraestrutura conforme o README do backend. Na instalação local utilizada no desenvolvimento, PostgreSQL/PostGIS está na porta `54432` e Redis na `56379`, via WSL. O frontend não acessa PostgreSQL; usa somente a API e Redis para sessões. Essas portas não são uma exigência de implantação.

## Ambiente

| Variável                 | Escopo    | Uso                                                                                                                        |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `BACKEND_API_URL`        | Servidor  | Base REST do backend, incluindo `/api/v1`.                                                                                 |
| `APP_URL`                | Servidor  | Origem exata do frontend, usada na validação de origem das mutations.                                                      |
| `FRONTEND_REDIS_URL`     | Servidor  | Redis de sessões; exemplo local `redis://localhost:56379/2`, separado logicamente das filas.                               |
| `SESSION_ENCRYPTION_KEY` | Servidor  | Chave de 32 bytes em 64 caracteres hexadecimais, gerada por `setup:env`.                                                   |
| `BACKEND_IDENTITY_PATH`  | Servidor  | `/auth/me`, contrato autenticado usado para hidratar a sessão. O valor vazio também cai nesse caminho por compatibilidade. |
| `NEXT_PUBLIC_API_URL`    | Navegador | `/api/backend`, proxy no mesmo domínio. Mantenha essa base para usar a autenticação do BFF.                                |
| `NEXT_PUBLIC_WS_URL`     | Navegador | URL completa do namespace, localmente `http://localhost:3000/operations`.                                                  |
| `NEXT_PUBLIC_APP_ENV`    | Navegador | Identificação do ambiente; não é um controle de autorização.                                                               |

Não coloque chaves JWT, refresh tokens, senhas ou a chave de sessão em variáveis `NEXT_PUBLIC_*`. Em produção, configure HTTPS, `APP_URL` com a origem pública, CORS do backend para essa origem e Redis com autenticação e transporte apropriados. Todas as instâncias Next.js precisam compartilhar o Redis de sessões e a chave de criptografia. Trocar a chave invalida as sessões existentes. Redis DB 2 é separação lógica, não isolamento de segurança; um serviço Redis exclusivo pode ser usado na implantação.

## Autenticação e permissões

O navegador conversa com as rotas `/api/session/*`. Um cookie HttpOnly guarda somente um identificador aleatório opaco. Access token, refresh token e identidade ficam no Redis, criptografados com AES-256-GCM, com expiração. Em produção o cookie utiliza o prefixo `__Host-`, `Secure`, `SameSite=Lax` e `Path=/`.

O servidor renova o access token antes da expiração e serializa a rotação do refresh token por sessão no Redis. A saída remove a sessão local e solicita a revogação no backend. Mutations exigem `Origin` compatível com `APP_URL`; o proxy aplica uma lista de endpoints e métodos derivados do OpenAPI e limites de corpo. O backend continua responsável por autorização, propriedade dos dados e regras operacionais.

`AuthProvider` expõe `user`, `role`, `isAuthenticated`, `isLoading`, `login`, `logout` e `refresh`. Layouts de servidor e a navegação aplicam o controle de acesso centralizado:

| Perfil                              | Área              |
| ----------------------------------- | ----------------- |
| `BUSINESS_OWNER` / `BUSINESS_STAFF` | `/app`            |
| `DRIVER`                            | `/app/entregador` |
| `ADMIN`                             | `/admin`          |

Não há autenticação baseada em `localStorage`, identidade inferida pelo e-mail ou autorização baseada apenas em um JWT decodificado. Um staff não recebe ações de edição da empresa reservadas ao proprietário. A validação final é sempre da API.

## Estrutura

```text
src/app/                  Rotas públicas, áreas protegidas e BFF
src/components/           HTML reutilizável, feedback e navegação
src/features/             Formulários, páginas, contratos e schemas por domínio
src/services/api/         Cliente REST e operações dos domínios
src/providers/            Sessão, cache, notificações e realtime
src/lib/server/           Sessões, proxy, criptografia, origem e acesso
src/lib/                  Permissões e formatação
src/constants/            Rótulos centralizados de status
src/types/                Identidade e contratos gerados do OpenAPI
tests/                    Regressões de autenticação e segurança
docs/                     Contratos e mapas de rotas, componentes e integração
```

As páginas consomem projeções autorizadas da API. O frontend não calcula preço, saldo, repasse, elegibilidade, ordem de paradas ou sucesso de transições. Mutações só apresentam sucesso após resposta do servidor. Valores monetários são centavos; distâncias são metros; durações são segundos. Datas são formatadas em `pt-BR`, com `America/Sao_Paulo` como padrão quando o contexto não fornece outro fuso.

## Contratos REST e realtime

O snapshot em `docs/openapi.json` é exportado do backend e acompanha os paths de identidade, documentos, rotas, filiais, WhatsApp, carteiras e incidentes. Ele é a referência para paths e DTOs; os tipos de projeção usados pelas telas são revisados junto dos controllers, services e schema Prisma.

Após uma alteração autorizada no contrato do backend, atualize o snapshot e execute:

```sh
npm run api:types
npm run typecheck
npm run test
```

A geração não substitui a revisão dos tipos manuais em `src/features/*/types.ts` quando o OpenAPI não fornecer schemas de resposta. Consulte [integrações](docs/integrations.md), [contratos do entregador](docs/driver-contracts.md) e [contratos administrativos](docs/admin-contracts.md).

O `RealtimeProvider` usa `/operations`. Ele solicita ao BFF um access token curto, mantido somente em memória pelo cliente Socket.IO, e renova a conexão antes da expiração. Refresh tokens nunca são expostos. Eventos são sinais para invalidar e buscar novamente as queries; seus payloads não se tornam o estado definitivo da tela. A reconexão também invalida o cache.

GPS web é uma ação explícita em foreground. Rastreamento contínuo em segundo plano deverá ser realizado pelo futuro companion Android/iOS. Não há promessa de rastreamento confiável em PWA. Google Maps e Waze são apenas links externos com coordenadas autorizadas.

## Comandos e verificação

| Comando             | Finalidade                                                      |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Next.js em `localhost:3001`.                                    |
| `npm run build`     | Build de produção.                                              |
| `npm start`         | Executa o build na porta `3001`.                                |
| `npm run lint`      | ESLint, sem warnings permitidos.                                |
| `npm run typecheck` | Gera tipos de rotas Next.js e verifica TypeScript.              |
| `npm run test`      | Vitest: schemas, componentes, sessão, concorrência e segurança. |
| `npm run test:e2e`  | Playwright; o servidor precisa estar iniciado.                  |
| `npm run api:types` | Regenera os tipos do snapshot OpenAPI.                          |
| `npm run format`    | Formata o código e a documentação com Prettier.                 |

Para Playwright, instale Chromium com `npx playwright install chromium` ou defina `E2E_BROWSER_CHANNEL=msedge` para usar o Edge instalado. API, worker, Redis e frontend devem estar ativos. As fixtures operacionais aceitam somente API e Redis locais. A senha do admin vem de `E2E_ADMIN_PASSWORD` (com `E2E_ADMIN_EMAIL` opcional) ou de `SEED_PASSWORD` no arquivo apontado por `E2E_BACKEND_ENV`, cujo padrão local é `../Orbita/.env`. Credenciais nunca são versionadas.

Os testes operacionais criam contas identificadas por `frontend-e2e-`, empresa, unidade, veículo e entrega reais. A fixture faz login pelo próprio `/api/session/login`, sem inserir sessão diretamente no Redis e sem interceptar a identidade. Criação e conclusão de entrega, análise administrativa, oferta, PIN, rota e atualização realtime atravessam o BFF e o backend reais. Sessões são encerradas ao terminar; registros de teste permanecem no banco local, pois a API não oferece exclusão desses cadastros. Execute em uma base local destinada a desenvolvimento/testes.

Validação local atual: TypeScript, ESLint, build de produção, 61 testes Vitest, 35 testes de integração do backend em 7 suítes e 4 cenários Playwright autenticados pelo login real. A cobertura visual usa o navegador local em desktop e viewport móvel; integrações reais Google Maps, Meta WhatsApp, pagamentos e credenciais externas continuam condicionadas à configuração dessas contas.

Documentação complementar: [mapa de rotas](docs/routes.md), [componentes](docs/components.md), [contratos administrativos](docs/admin-contracts.md), [integrações](docs/integrations.md) e [sistema visual](docs/visual-system.md). Documentos jurídicos são placeholders identificados; pagamentos reais, mapas customizados e push continuam condicionados à configuração externa.
