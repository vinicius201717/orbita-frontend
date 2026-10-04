# Estado da integração frontend/backend

Este arquivo registra somente limites que ainda dependem de contrato ou configuração externa. O frontend não inventa respostas: cada estado de sucesso abaixo vem de uma resposta real da API.

## Contratos integrados

| Área                | Contrato usado                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Identidade e conta  | `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password`, login/refresh/logout       |
| Documentos privados | `GET /documents/policy`, `GET /documents`, `POST /documents` multipart, conteúdo e revisão |
| Unidades            | criação, listagem e `PATCH /businesses/:id/branches/:branchId` para o proprietário         |
| WhatsApp            | `GET /whatsapp/me`, consentimento do proprietário/entregador e revisão administrativa      |
| Rotas               | `GET /routes` paginado e detalhe autorizado                                                |
| Administração       | detalhe de entregador, carteiras, resolução de incidente e recursos de WhatsApp            |

## Limites ainda reais

### Mapas e endereço

O formulário recebe endereço e coordenadas. O provider Google só é usado quando `MAPS_PROVIDER=google` e as credenciais correspondentes estão configuradas; sem isso, a API não promete geocoding nem trânsito. Não há chamada direta do navegador ao provider.

### Prova e timeline

As telas mostram os timestamps e a prova que as projeções atuais retornam. Imagens, assinatura e histórico completo de transições exigem uma projeção de auditoria específica; PIN e hashes continuam privados.

### Analytics

Os agregados existentes são exibidos com o período que a API fornece. Recortes por dia/semana/mês e comparações históricas exigem filtros temporais explícitos no backend; o frontend não estima esses números.

### Paginação e filtros administrativos

As listas administrativas usam cursores quando o endpoint oferece esse contrato. Filtros avançados, totais globais, edição de zonas e gestão de funcionários ainda exigem endpoints próprios.

### Privacidade, jurídico e suporte

Solicitações de privacidade possuem consulta e criação, mas processamento/exportação/exclusão dependem de política de retenção e fluxo autorizado. Termos e privacidade permanecem conteúdo para revisão profissional. Não há canal de suporte externo configurado.

### Serviços externos

WhatsApp Cloud, Google Maps, e-mails, pagamentos reais, push e rastreamento em segundo plano precisam de credenciais, aprovação, domínio e operação externa. O código valida o estado de configuração e deixa explícito quando o provedor não está habilitado.

O OpenAPI sincronizado está em `docs/openapi.json`; depois de qualquer alteração de contrato, execute `npm run api:types`, `npm run typecheck`, `npm run lint`, `npm run test` e a validação de integração do backend.
