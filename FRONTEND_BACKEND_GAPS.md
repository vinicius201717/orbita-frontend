# Pendências de integração frontend/backend

Auditoria do backend ORBITA, snapshot de contrato no commit `8dca25a`. Esta lista distingue estrutura de interface implementada de disponibilidade real da API. Nenhum endpoint ausente foi criado no backend, nem substituído por resposta fictícia na aplicação. Paths abaixo identificados como **necessários** são propostas de contrato, não endpoints existentes.

## G01 — Identidade autenticada bloqueia a sessão real

**Impacto:** `/login`, continuação dos cadastros e todas as áreas protegidas.

A [proposta mínima e o patch revisável](docs/auth-identity-proposal.md) estão preparados, sem alteração no backend. A autorização para aplicar essa exceção à restrição original permanece pendente.

`POST /auth/login` e `POST /auth/refresh` retornam tokens e expiração. `POST /auth/register` cria a conta. Não foi encontrado `GET /auth/me` nem outro endpoint autenticado que devolva simultaneamente usuário, role, vínculo empresarial e vínculo de entregador. `GET /driver/me` não cobre empresas ou administradores. O frontend não usa listas administrativas, e-mail ou conteúdo não verificado do JWT como substituto de identidade.

**Necessário:** endpoint autenticado de identidade com o contrato compatível abaixo, respeitando conta ativa e autorização:

```ts
{
  id: string; // UUID
  name: string;
  email: string;
  role: 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF' | 'DRIVER';
  businessId: string | null;
  driverId: string | null;
  phone?: string | null;
}
```

O BFF está preparado para `/auth/me`, mas `BACKEND_IDENTITY_PATH` permanece vazio por padrão. Login responde com `IDENTITY_ENDPOINT_MISSING`, sem simular sucesso. Preencher a variável não cria a API. Após implementação autorizada do contrato, atualizar OpenAPI, configurar a variável e homologar os três perfis, refresh, logout e mudança de vínculos.

**Cadastro parcial:** o wizard pode criar a conta real antes de tentar iniciar a sessão. Com a lacuna atual, empresa/unidade ou veículo/consentimento não são concluídos. As etapas não são uma transação única. Em falha de resultado incerto ou após recarregar a página, confira a conta existente antes de repetir o cadastro. Não há recuperação de senha disponível para uma conta criada parcialmente.

## G02 — Respostas OpenAPI incompletas

Paths e DTOs existem, mas diversas respostas não têm schema completo. `npm run api:types` gera somente o que o snapshot descreve. Tipos de resposta em `src/features/*/types.ts` foram conferidos diretamente nos serviços e Prisma do backend.

**Necessário:** publicar DTOs de resposta, erros, projeções por role e paginação no OpenAPI; depois revisar os tipos manuais e as regressões de integração. Compilar tipos gerados não prova compatibilidade de respostas ausentes no documento.

## G03 — Documentos empresariais e do entregador

**Páginas:** `/app/empresa/documentos`, `/app/entregador/documentos` e detalhe administrativo do entregador.

Existe estrutura Prisma de `DriverDocument`, mas não há API pública de upload, listagem de documentos, reenvio, política de arquivos, URL segura para leitura ou revisão individual. Não existe contrato equivalente de documentos empresariais.

**Necessário:** contratos de política (tipos, tamanhos, extensões e exigências configuradas), envio por multipart ou storage assinado, consulta autorizada, validade, observações, análise e reenvio. As telas ficam indisponíveis; nenhum arquivo é enviado ou persistido localmente. Não há obrigação legal presumida nem base64 improvisado. O validador genérico só valida contra uma política explícita fornecida.

## G04 — Conta, senha e funcionários

**Páginas:** perfis, login e onboarding.

Não há recuperação/troca de senha, alteração de dados do usuário, listagem/revogação de sessões ou gestão de funcionários/vínculos pela interface. O cadastro público permite apenas `BUSINESS_OWNER` e `DRIVER`.

**Necessário:** contratos específicos com autenticação e permissões adequadas. Os papéis existentes são respeitados, mas o frontend não cria administradores ou `BUSINESS_STAFF` pelo cadastro público.

## G05 — Endereço e unidades

**Páginas:** cadastro empresarial, `/app/unidades`, `/app/unidades/nova`, nova entrega.

O backend possui providers internos de mapas, mas não oferece geocoding público para esses formulários. A API de unidades permite listar e cadastrar; não há edição/desativação nem paginação acima das primeiras 100 unidades.

**Comportamento atual:** endereço e coordenadas são informados explicitamente; links de navegação usam coordenadas recebidas. Não há chamada direta do navegador ao provider de mapas. Endereço estruturado separado em rua/número/bairro/CEP não é persistido como campos independentes quando o DTO aceita apenas endereço completo.

**Necessário:** geocoding autorizado e contratos de manutenção/paginação das unidades, se esses fluxos forem exigidos.

## G06 — WhatsApp e consentimentos

**Páginas:** `/app/whatsapp`, perfil/onboarding do entregador e `/admin/whatsapp`.

O administrador pode registrar identidade verificada e opt-in via `POST /admin/whatsapp-identities`. Não há GET de identidades, consulta de saúde do provedor, consentimento self-service de WhatsApp ou revogação via API. Telefone cadastrado não comprova canal ativo. Consentimento GPS via `POST /driver/consent` é um contrato distinto.

**Comportamento atual:** exibe telefone e comandos conhecidos, ou formulário administrativo real com evidência. O estado de verificação permanece desconhecido quando não consultável. Aceite de termos/privacidade na interface não é anunciado como registro legal persistido sem contrato específico.

**Necessário:** consulta autorizada de vínculo/status, registro e revogação de consentimentos específicos e evidência de termos/privacidade quando definida pela operação. A configuração de Meta, templates e credenciais permanece no backend.

## G07 — Listagem e histórico de rotas do entregador

**Página:** `/app/entregador/rotas`.

Existe detalhe `GET /routes/:id`, mas não listagem de rotas do entregador. A interface usa a rota atual e IDs encontrados nas próprias entregas paginadas. Rotas sem entregas ainda vinculadas podem não aparecer; não existe lista completa garantida de próximas/concluídas.

**Necessário:** listagem autorizada e paginada de rotas, com filtros por estado e período. A sequência e as estimativas continuam responsabilidade do backend.

## G08 — Comprovante e timeline detalhados

**Páginas:** detalhes de entrega da empresa, entregador e admin.

O detalhe não inclui o registro completo de prova, imagem ou assinatura, nem histórico completo de todas as transições. A interface apresenta status e timestamps efetivamente retornados. PIN/hash não é exposto ao entregador; o código informado pelo cliente é enviado somente para verificação.

**Necessário:** projeção autorizada da prova e dos eventos históricos para completar essas seções. Não inferir ocorrência de um evento apenas porque seria esperado no fluxo.

## G09 — Analytics e operação empresarial

Os endpoints oferecem agregados específicos, mas não todas as janelas diárias/semanais/mensais solicitadas. Ganhos do entregador são apresentados como acumulados e lançamentos reais, sem rotular o acumulado como “hoje”. Não há endpoint empresarial de listagem de rotas/entregadores que forneça todo o resumo operacional desejado.

**Necessário:** filtros temporais e projeções agregadas explícitas para novos recortes. O frontend não estima saldo, margem, preço ou SLA para preencher números ausentes.

## G10 — Detalhe administrativo do entregador

**Página:** `/admin/entregadores/[id]`.

`GET /admin/drivers` fornece lista por cursor, sem joins de usuário, veículos e documentos, nem endpoint dedicado de detalhe. A interface usa a página de origem; em acesso direto, a busca é limitada a 1.000 registros e informa que não pode confirmar um ID não localizado nesse limite. Não apresenta campos inexistentes como se conhecidos.

**Necessário:** detalhe administrativo autorizado por ID com projeções apropriadas, documentos e motivo da rejeição de onboarding. `POST /admin/drivers/:id/review` já permite a decisão geral de análise, mas não revisão documental individual.

## G11 — Incidentes e responsáveis históricos

**Páginas:** detalhes de entrega e `/admin/incidentes`.

Há criação/consulta de incidentes, cancelamento e devolução, mas não resolução/edição de incidente. O vínculo atual da entrega pode ser consultado; não identifica necessariamente o responsável na data do incidente. Referências de anexos não constituem um fluxo de upload.

**Necessário:** tratamento de incidentes e projeção histórica de responsáveis, se exigidos pela operação.

## G12 — Financeiro administrativo e pagamentos

Existe ledger, analytics e ajuste contábil auditado. Não existe listagem administrativa de carteiras/saldo por carteira, filtros completos do ledger, saque, recarga ou pagamento real. O ajuste exige ID de carteira verificado e chave idempotente. Edição/exclusão de lançamentos não é implementada.

Chaves de ajuste ficam em memória na página e são reutilizadas nas tentativas; recarregar a página perde a chave. Após uma falha com resultado incerto, conferir o ledger antes de repetir um ajuste. Isso também exige melhorar a consulta de resultado por chave se a operação precisar de recuperação robusta entre recargas.

**Necessário:** consulta de carteiras e filtros/resultado por idempotência para operação administrativa mais completa. Pagamentos reais permanecem fora do escopo solicitado; saldo não é recalculado pelo frontend.

## G13 — Zonas, configuração e paginação administrativa

Zonas permitem listar/criar até 100 registros, sem editar/desativar/paginar. Matching e precificação têm consulta; existe acionamento manual de matching, sem edição de parâmetros pela API. Listas genéricas de empresas, drivers, rotas, incidentes, auditoria e ledger aceitam cursor, sem total ou filtros adicionais.

**Necessário:** somente contratos explícitos de edição, filtros e paginação para ampliar as funções. O frontend não filtra apenas a página corrente apresentando-a como resultado global nem altera regras em memória.

## G14 — Privacidade, jurídico e suporte

Há consulta administrativa de solicitações de privacidade, mas não processamento/conclusão da exportação ou exclusão. Termos e privacidade são placeholders pendentes de revisão profissional. Não há endpoint de atendimento nem contato de suporte configurado para o frontend.

**Necessário:** fluxo autorizado de tratamento de solicitações, conteúdo jurídico aprovado e canal de suporte real. Nenhum contato foi inventado.

## Limites deliberados do projeto

Identidade visual, animações, gráficos avançados, mapa customizado, pagamentos reais, PIX, IA, chat, push e app companion não fazem parte desta etapa. GPS do navegador só envia posição por ação explícita em foreground; não substitui rastreamento Android/iOS em segundo plano. Essas decisões de escopo não são defeitos a contornar com mocks.
