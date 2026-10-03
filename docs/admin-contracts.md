# Área administrativa

Implementada para `ADMIN`, protegida pelo layout de servidor e pelo controle central da sessão. O backend permanece responsável por autorização, transições, cálculos e auditoria. Nenhum arquivo do backend foi alterado.

## Fontes de contrato

`docs/openapi.json` foi usado para paths e DTOs. Como as respostas do OpenAPI têm cobertura incompleta, os formatos de retorno foram conferidos nos controllers/services `admin`, `analytics`, `businesses`, `deliveries`, `routes`, `finance`, `service-zones` e no schema Prisma do backend. Os tipos dessas projeções ficam em `src/features/admin/types.ts`, e todas as chamadas em `src/services/api/admin.api.ts`.

## Rotas e integração

| URL                          | APIs consumidas                                                                                                                                                             | Comportamento                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/admin` e `/admin/metricas` | `GET /analytics/platform/overview`                                                                                                                                          | GMV, receita, repasses, margem, operação, SLA, aceitação e tabela diária. Sem gráficos.                              |
| `/admin/empresas`            | `GET /admin/businesses`                                                                                                                                                     | Lista paginada por cursor.                                                                                           |
| `/admin/empresas/[id]`       | `GET /businesses/:id`, `GET /businesses/:id/branches`                                                                                                                       | Cadastro, status, unidades e atalho às entregas da empresa.                                                          |
| `/admin/entregadores`        | `GET /admin/drivers`                                                                                                                                                        | Perfil operacional, onboarding, capacidade e rota atual.                                                             |
| `/admin/entregadores/[id]`   | `GET /admin/drivers`, `POST /admin/drivers/:id/review`                                                                                                                      | Detalhes encontrados na lista e decisão de onboarding confirmada em dialog.                                          |
| `/admin/entregas`            | `GET /deliveries`                                                                                                                                                           | Filtros reais por status, IDs, modalidade e período; paginação `nextCursor`.                                         |
| `/admin/entregas/[id]`       | `GET /deliveries/:id`, `GET /deliveries/:id/incidents`, `POST /admin/deliveries/:id/confirm`, `POST /admin/deliveries/:id/reassign`, `POST /deliveries/:id/return/complete` | Dados autorizados, incidentes e ações com confirmação. PIN não é exibido.                                            |
| `/admin/rotas`               | `GET /admin/routes`                                                                                                                                                         | Lista de rotas e estimativas retornadas.                                                                             |
| `/admin/rotas/[id]`          | `GET /routes/:id`                                                                                                                                                           | Sequência, paradas, estimativas, entrega e links externos de navegação. Sem executar ações exclusivas do entregador. |
| `/admin/incidentes`          | `GET /admin/incidents`; `GET /deliveries/:id` sob demanda                                                                                                                   | Consulta; responsáveis correspondem ao vínculo atual da entrega. Anexos são exibidos como referências de texto.      |
| `/admin/financeiro`          | `GET /analytics/platform/overview`, `GET /admin/financial-transactions`, `POST /admin/finance/adjustments`                                                                  | Totais, lançamentos de cada transação e ajustes com motivo, confirmação e chave idempotente.                         |
| `/admin/zonas`               | `GET /admin/service-zones`, `POST /admin/service-zones`                                                                                                                     | Listagem e criação de Polygon GeoJSON. Backend valida a geometria definitiva.                                        |
| `/admin/whatsapp`            | `POST /admin/whatsapp-identities`                                                                                                                                           | Registro verificado de telefone e opt-in, com referência da evidência e confirmação explícita.                       |
| `/admin/configuracao`        | `GET /admin/matching-config`, `GET /admin/pricing-rules`, `POST /admin/matching/run`                                                                                        | Consulta de parâmetros; execução manual de matching após confirmação.                                                |
| `/admin/auditoria`           | `GET /admin/audit`                                                                                                                                                          | Registros de auditoria paginados.                                                                                    |
| `/admin/alertas`             | `GET /admin/fraud-flags`                                                                                                                                                    | Sinais para revisão, sem afirmar ocorrência de fraude.                                                               |
| `/admin/privacidade`         | `GET /admin/privacy-requests`                                                                                                                                               | Consulta de solicitações; processamento indisponível.                                                                |

## Paginação e estado

As listas genéricas de administração retornam até 50 itens, ordenados por ID, sem total ou `nextCursor`. O frontend usa o último ID para avançar e mantém a pilha de cursores para voltar. Uma página cheia pode ser seguida de uma página vazia. As entregas usam a paginação própria da API. As zonas retornam no máximo 100 itens e não oferecem cursor.

As mutations só anunciam sucesso após a resposta, bloqueiam o botão enquanto executam e invalidam as consultas relacionadas. Falhas fecham o dialog para tornar a mensagem acessível. Ajustes financeiros reutilizam a chave idempotente em novas tentativas na mesma página; ela muda após sucesso. Após falha de rede, mantenha os mesmos dados ao repetir a operação. Recarregar a página perde a chave em memória: confira o ledger antes de repetir um ajuste de resultado incerto.

Os agregados financeiros e operacionais são calculados no backend. O frontend somente formata centavos, metros, segundos, percentuais e datas. Datas de filtros usam o fuso do navegador antes da conversão para UTC; a série diária da plataforma é explicitamente identificada como UTC.

## Ausências a consolidar em FRONTEND_BACKEND_GAPS.md

- **Entregador administrativo:** não há endpoint de detalhe por ID nem relações com usuário, veículos ou documentos na listagem. A página usa o cursor de origem; sem esse cursor, procura em até 1.000 registros e informa a limitação. Nome, veículo e arquivos não são inventados. Não há revisão individual de documentos.
- **Comprovação detalhada:** `GET /deliveries/:id` não inclui o registro de prova; não há consulta de imagem/assinatura. Datas e status retornados continuam visíveis, sem PIN.
- **Incidentes:** não há endpoint de resolução/edição ou consulta do responsável histórico no momento do registro. O responsável atual é consultado sob demanda.
- **Financeiro:** não há listagem administrativa de carteiras, saldo consolidado por carteira, filtros do ledger, edição/exclusão de lançamentos, pagamentos reais ou saques. Para ajuste, é necessário um ID de carteira verificado. O limite é de 10.000.000 centavos positivos ou negativos conforme o DTO.
- **Zonas:** não há edição, desativação ou paginação acima de 100 registros. Não foi criado mapa visual.
- **WhatsApp:** não há GET de identidades, consulta de status do provedor ou revogação de identidade/consentimento. POST registra verificação e opt-in e pode atualizar um vínculo anterior do telefone; isso não prova que o provedor está ativo.
- **Configuração:** parâmetros são somente leitura; não existem endpoints de atualização da precificação ou matching.
- **Privacidade:** não há endpoints administrativos de execução de exportação/exclusão ou conclusão da solicitação.
- **Filtros gerais:** negócios, entregadores, rotas, incidentes, auditoria e ledger só aceitam cursor. Filtros não suportados não foram simulados no cliente.

As lacunas ficam sinalizadas nas respectivas telas. Nenhum endpoint substituto ou retorno fictício foi criado.

## Validação local

`src/features/admin/schemas.test.ts` valida centavos inteiros, limites de ajuste, carteira/chave, limites geográficos, evidência de WhatsApp e intervalo de datas. A validação final de autorização e regras financeiras/geográficas é sempre do backend.
