# Mapa de componentes

Componentes renderizam HTML semântico e centralizam comportamento. As classes são pontos de extensão para uma etapa visual futura, sem regras CSS de apresentação nesta entrega. A composição por domínio fica em `src/features`, mantendo regras logísticas e financeiras no backend.

## Elementos reutilizáveis

Fonte: `src/components/ui/index.tsx`.

| Componente                    | Responsabilidade                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                      | Botão nativo, `type="button"` por padrão, disabled/loading e `aria-busy`. Formulários declaram `type="submit"` explicitamente. |
| `Input`, `Textarea`, `Select` | Campos nativos e propriedades HTML, preparados para React Hook Form.                                                           |
| `Checkbox`, `FileInput`       | Especializações nativas do campo; não implicam upload ou política de arquivo.                                                  |
| `FormField`                   | Associa `label`, ID, erro, hint, `aria-invalid` e `aria-describedby` ao controle.                                              |
| `Card`                        | Agrupamento semântico em seção, com título opcional.                                                                           |
| `PageHeader`, `SectionHeader` | Hierarquia de títulos, descrição e ações.                                                                                      |
| `StatusBadge`                 | Rótulo centralizado e `data-status`; sem cor como único indicador.                                                             |
| `Table`                       | Tabela nativa, caption e composição explícita de cabeçalhos/células.                                                           |
| `ConfirmDialog`               | `dialog` nativo, confirmação/cancelamento, captura de foco do modal e bloqueio durante a mutation.                             |

Modal, drawer, tabs ou radio-group genéricos não são criados apenas para completar um catálogo. Os fluxos atuais usam listas, fieldsets, selects, tabelas e diálogo nativos. Novas abstrações devem partir de necessidade real, preservar teclado e manter o estado fora da futura estilização.

## Feedback e navegação

Fonte: `src/components/feedback/index.tsx`.

| Componente           | Responsabilidade                                                    |
| -------------------- | ------------------------------------------------------------------- |
| `LoadingState`       | Texto de carregamento com `role="status"` e anúncio educado.        |
| `ErrorState`         | Mensagem de erro e repetição opcional da consulta.                  |
| `EmptyState`         | Ausência real de dados e ação contextual, distinta de erro/loading. |
| `UnavailableFeature` | Recurso sem contrato disponível, com explicação explícita.          |
| `SuccessMessage`     | Confirmação anunciada após sucesso.                                 |
| `InlineError`        | Erro do formulário associado ao fluxo.                              |

`DashboardShell`, em `src/components/layout`, seleciona o menu por role, destaca a página atual, oferece link para pular ao conteúdo e confirma logout. Layouts de servidor também validam sessão e role. A checagem cliente não substitui o backend nem o layout de servidor.

`ExternalNavigationLinks` cria links Google Maps/Waze somente para coordenadas válidas. Não carrega um SDK de mapas ou uma chave de provider. A navegação abre outro serviço; não confirma chegada ou coleta.

## Providers

| Provider / hook                      | Responsabilidade                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `AppProviders`                       | Compõe TanStack Query, autenticação, notificações e realtime.                                                       |
| `AuthProvider` / `useAuth`           | Identidade, loading, erro, login, logout, refresh e expiração de sessão; limpa cache ao trocar/encerrar identidade. |
| `RealtimeProvider`                   | Socket.IO centralizado, token curto em memória, reconexão e invalidação de queries.                                 |
| `NotificationProvider` / `useNotify` | Mensagens simples acessíveis, sem toast visual ou biblioteca adicional.                                             |

## Composição por domínio

| Diretório                    | Peças principais                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `features/auth`              | `LoginForm`, `BusinessRegistrationForm`, `DriverRegistrationForm` e schemas dos wizards.                     |
| `features/business`          | Forms de empresa/unidade, dashboard, onboarding, perfil, unidades, financeiro, WhatsApp, documentos e ajuda. |
| `features/deliveries`        | Cadastro com itens dinâmicos/revisão, lista com filtros, detalhe e schemas.                                  |
| `features/driver`            | Painel, documentos, perfil, disponibilidade, ofertas, rotas, detalhe de entrega e ganhos.                    |
| `features/driver/components` | Formulário de veículo, PIN e controle explícito de posição/consentimento GPS.                                |
| `features/admin`             | Listas paginadas, detalhes, formulários de revisão/ajuste/identidade/zona, métricas e parâmetros.            |

Formulários usam React Hook Form e Zod; a transformação para payload ocorre no domínio ou serviço. Queries e mutations usam os serviços centrais; não há chamada a provider de mapas, storage ou WhatsApp diretamente de componentes. Os arquivos `page.tsx` conectam rotas à funcionalidade, em vez de concentrar todo o formulário.

## Dados e convenções

- `src/services/api/client.ts`: `ApiError`, tratamento de erros, fetch sem cache e proxy no mesmo domínio.
- `src/services/api/*.api.ts`: contratos por domínio e métodos de consulta/mutation.
- `src/features/*/queries.ts`: chaves e consultas compartilhadas onde aplicável; listas restantes mantêm chaves por domínio e filtros.
- `src/constants/status.ts`: labels de estados recebidos; estados desconhecidos mantêm o código para diagnóstico.
- `src/lib/format.ts`: centavos → BRL, metros → m/km, segundos → duração e timestamps → data localizada.
- `src/lib/access.ts`: destino por role e autorização de navegação.

Mutation bloqueada/loading evita repetição visual; nos fluxos sensíveis, como aceite de oferta e PIN, trava imediata também previne duas chamadas no mesmo ciclo de render. As transições reais continuam atômicas no backend. Não se usa atualização otimista para fingir aceite, coleta, entrega ou saldo.

## Acessibilidade e evolução visual

Preservar labels, mensagens ligadas aos campos, `fieldset`/`legend` nos grupos, botões nativos, caption/cabeçalhos nas tabelas, `aria-current` na navegação e feedback de loading/erro. Não esconder elementos só porque ainda não há CSS. Ao estilizar `Button` ou outro componente no futuro, não remover suas regras de disabled, foco, submit e anúncio.

ClassNames existentes seguem domínio e função, como `form-field`, `page-header`, `dashboard`, `dashboard-sidebar`, `dashboard-main`, `data-table`, `status-badge`, `form-actions`, `dialog-actions`, `empty-state` e `unavailable-feature`. Não adicionar inline styles ou dependência de biblioteca visual sem uma nova etapa autorizada.
