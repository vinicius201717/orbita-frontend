# Proposta mínima para liberar o login

O [patch proposto](proposed-auth-me.patch) foi preparado contra o backend `8dca25a`. Ele **não foi aplicado**. A restrição do pedido original é “NÃO alterar o backend”; a decisão sobre essa alteração permanece pendente.

A mudança adiciona somente `GET /api/v1/auth/me`, protegido pelo guard de autenticação existente. Retorna `id`, `name`, `email`, `role`, `businessId`, `driverId` e `phone` opcional/nulo. Os dados vêm da conta autenticada no banco. Não recebe ID pelo cliente, não retorna hash de senha nem tokens e não altera regras logísticas.

O guard já valida token, conta ativa e exclusão. O serviço seleciona explicitamente os campos públicos da própria identidade. `phone` é o telefone do entregador quando existe; não inventa um telefone pessoal para usuário empresarial.

Após autorização, a integração deve ser concluída com testes de autenticação ausente/inválida, quatro roles, ausência de vínculos, vínculo criado durante onboarding e conta desativada. O OpenAPI deve receber schema explícito da resposta e um snapshot atualizado. Só então configurar `BACKEND_IDENTITY_PATH=/auth/me` e repetir login, cadastro, refresh e logout reais nos três perfis. O patch é uma proposta revisável, não uma alteração homologada do backend.

As fixtures em `tests/e2e/local-fixture.ts` não substituem esse endpoint. Elas são restritas aos testes locais e nunca são importadas pelo produto.
