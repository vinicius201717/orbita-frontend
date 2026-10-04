# Integrações

O frontend usa o backend como autoridade de identidade, autorização, roteirização, prova e valores financeiros. A aplicação não contém mocks de operação. Contratos ausentes são apresentados como indisponíveis e detalhados em [FRONTEND_BACKEND_GAPS.md](../FRONTEND_BACKEND_GAPS.md).

## Auth e sessão

```text
Navegador → /api/session/* no Next.js → /auth/* no backend
             ↓
             Redis: sessão criptografada; navegador: ID opaco HttpOnly
```

Contratos existentes: `POST /auth/register`, `/auth/login`, `/auth/refresh` e `/auth/logout`. O cadastro público só permite `BUSINESS_OWNER` e `DRIVER`. O BFF valida a entrada antes de encaminhar e não expõe refresh token.

`GET /auth/me` retorna a identidade pública da conta autenticada. `PATCH /auth/me` atualiza nome e telefone; `POST /auth/change-password` troca a senha, incrementa a versão de autenticação e revoga os refresh tokens anteriores. O BFF usa esse contrato para hidratar e atualizar a sessão.

Uma sessão estabelecida usa ID aleatório de 32 bytes no cookie, armazenamento Redis com expiração de 30 dias e payload criptografado por AES-256-GCM. O access token usa a expiração fornecida pelo backend e começa a renovar 30 segundos antes. Um lock Redis coordena refresh concorrente; gravações evitam ressuscitar sessão encerrada. A identidade é reconsultada pelo endpoint de sessão.

Mutations exigem origem exata de `APP_URL`. Cookie de produção é `__Host-orbita_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, sem `Domain` e com `Path=/`. HTTPS é necessário em produção. O BFF não persiste tokens em `localStorage` ou `sessionStorage` e não lê segredos JWT do backend.

## REST API e proxy

O navegador chama `NEXT_PUBLIC_API_URL=/api/backend`. O Next.js encaminha para `BACKEND_API_URL`, localmente `http://localhost:3000/api/v1`, com o bearer da sessão. `src/lib/server/allowlist.ts` deriva paths e métodos de `docs/openapi.json`, valida parâmetros UUID e restringe recursos administrativos. Auth, webhooks, health e confirmação/tracking públicos por token não passam por esse proxy genérico.

O servidor impõe timeout, `no-store`, bloqueio de redirecionamento remoto e limite de corpo JSON de 256 KiB nas leituras de entrada aplicáveis. Não aceita URL remota arbitrária fornecida pelo cliente. Respostas de erro preservam `code`, `statusCode` e mensagem; o cliente converte códigos conhecidos para instruções em português.

Serviços em `src/services/api` centralizam acesso por domínio. O TanStack Query mantém loading, erro, cache, refetch, paginação e invalidação. IDs de empresa/driver vêm da sessão ou da projeção autorizada, e a API impõe isolamento. O frontend não combina entregas de empresas distintas para mostrar uma rota empresarial completa.

`docs/openapi.json` é sincronizado com o backend atual. `npm run api:types` gera `src/types/openapi.generated.ts`; tipos manuais de resposta complementam somente schemas que faltam no OpenAPI, com base nos serviços e Prisma auditados. Mudanças no backend exigem atualização do snapshot, revisão dos tipos manuais e testes.

### Paginação e valores

- Entregas e carteiras usam o cursor fornecido pelo contrato quando disponível.
- Listas administrativas genéricas retornam até 50 registros, sem total/`nextCursor`; o último ID é o cursor seguinte e o histórico de cursores permite voltar. Uma página cheia pode preceder uma página vazia.
- Unidades e zonas têm limites de listagem; não há paginação inventada.
- Valores monetários vêm em centavos, distâncias em metros e durações em segundos. Formatação não altera valores de negócio.
- Timestamps permanecem UTC no transporte; o display usa o fuso do contexto ou `America/Sao_Paulo`. A série diária administrativa é identificada como UTC. Filtros de data usam o fuso local do navegador antes da conversão para UTC.

## Socket.IO

`RealtimeProvider` é o único proprietário da conexão com `NEXT_PUBLIC_WS_URL`, namespace `/operations`. Obtém um access token curto por `GET /api/session/socket`, envia-o em `socket.auth.token` e mantém o token apenas em memória. Essa exposição limitada é necessária ao contrato Socket.IO existente; o refresh token continua exclusivamente no servidor.

Eventos observados:

```text
route.updated
delivery.updated
delivery.delivered
offer.created
offer.accepted
RouteOfferClosed
DriverStatusUpdated
```

Eventos invalidam queries; o estado é recarregado pela REST API. `connect` também invalida o cache, incluindo reconexões. A conexão é renovada antes da expiração do access token e removida ao desmontar/trocar a identidade. Salas de empresa/driver são atribuídas pelo backend; o frontend não permite escolher uma sala de outro usuário.

A lista de ofertas também realiza refetch periódico como apoio à atualização. O contador de expiração é informativo; o servidor confirma a validade no aceite. Uma mensagem WebSocket não constitui autorização nem comprova que uma entrega foi liquidada.

## Maps e localização

`ExternalNavigationLinks` abre Google Maps ou Waze a partir de latitude/longitude autorizadas. Não há mapa embutido, geocoding direto, chave Google no cliente ou reprodução do algoritmo de rota.

`GPSControls` solicita posição atual pela Geolocation API apenas após clique. Consentimento operacional é enviado para `POST /driver/consent`; posição para `POST /driver/location`. O backend verifica estado, coordenadas e frescor. A atualização persistida pode depender do worker. Não há `watchPosition`, geolocalização em background ou serviço PWA que prometa rastreamento contínuo.

Coleta contínua em segundo plano pertence ao futuro companion Android/iOS, fora deste projeto. Navegadores exigem contexto seguro e permissão de localização; localhost pode ser usado no desenvolvimento.

## Documentos

As páginas empresarial e de entregador usam `GET /documents/policy`, `GET /documents`, `POST /documents` multipart e conteúdo protegido pelo BFF. A política atual aceita PDF/JPEG/PNG de até 5 MB; o backend confere assinatura, hash e ownership. ADMIN revisa em `PATCH /documents/:id/review`; nenhum `storageKey` é enviado à interface.

Nenhum documento é tratado como requisito legal sem configuração do backend. Arquivos não são convertidos para base64 ou enviados para um provider escolhido pelo frontend. Referências de anexos já existentes não autorizam acesso a URLs arbitrárias ou upload novo.

## WhatsApp

Empresa consulta seu telefone cadastrado e encontra comandos informativos suportados pelo backend: `nova entrega`, `pronto <id>`, `cancelar <id>`, `pedidos`, `saldo` e `suporte`. Isso não afirma que o provider está conectado ou que o telefone foi verificado.

Admin pode usar `POST /admin/whatsapp-identities`, com evidência e confirmação do vínculo/opt-in. Empresas e entregadores consultam `GET /whatsapp/me` e podem conceder/revogar consentimento quando o papel permite. O estado `ready` continua refletindo configuração real do provider; credenciais Meta, assinatura de webhook, templates, inbox/outbox e envio de mensagens são responsabilidade do backend.

## Limites e homologação

Verificações automatizadas de UI usam mocks apenas nos testes unitários. A homologação real usa API/worker/Redis funcionando e contas autorizadas de cada papel. O cenário Playwright faz login pelo BFF, atravessa empresa, driver e admin, e valida refresh, logout, reconexão e tentativas de acesso entre perfis. Uma passagem em build/lint/typecheck não substitui homologação de provedores externos.

Google/Meta reais e documentos não devem ser anunciados como funcionando enquanto suas credenciais ou contratos não existirem. O frontend não implementa pagamentos reais, recuperação de senha inexistente, cálculo local de saldo ou funcionalidades administrativas sem API.
