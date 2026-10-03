# Validação técnica — 03/10/2026

| Verificação                                            | Resultado                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| TypeScript estrito e tipos de rotas                    | Passou: `npm run typecheck`                                                  |
| ESLint sem warnings                                    | Passou: `npm run lint`                                                       |
| Build Next.js de produção                              | Passou: `npm run build`                                                      |
| Schemas, componentes, sessão, concorrência e segurança | 61 testes em 11 arquivos passaram: `npm test`                                |
| Navegador Edge via Playwright                          | 3 testes passaram, execução final em 49,6 segundos                           |
| Dependências de produção                               | `npm audit --omit=dev`: zero vulnerabilidades reportadas                     |
| Proposta de identidade                                 | `git apply --check` aceitou o patch contra o backend `8dca25a`; não aplicado |
| Backend                                                | Nenhum arquivo alterado pela implementação do frontend                       |

## Fluxos percorridos

O navegador abriu home, login, cadastros, termos e privacidade. Os formulários rejeitaram dados inválidos; acessos sem sessão às três áreas redirecionaram para login. O login com contrato de identidade ausente retornou erro explícito 503 e não criou cookie de sessão.

No cenário operacional, a interface empresarial criou uma entrega expressa e marcou a preparação concluída. A interface administrativa aprovou o entregador. A interface do entregador aceitou a oferta, iniciou a rota, registrou chegada/coleta/chegada ao destino, confirmou o código informado pelo cliente e finalizou a rota. Consultas independentes à API confirmaram as transições e a liberação da rota do entregador. A tela empresarial aberta recebeu o estado entregue via invalidação realtime, sem recarregar a página.

A navegação percorreu nove páginas empresariais, oito páginas do entregador e catorze páginas administrativas, além dos detalhes usados pelo fluxo. Não foram detectadas exceções JavaScript nem respostas HTTP de erro nas operações do BFF desse cenário. Um entregador autenticado foi redirecionado ao tentar abrir a administração.

As regressões de cadastro cobrem unidade criada seguida de falha no refresh, resposta de criação de unidade perdida, reconciliação do veículo existente e preservação da identidade original. As regressões de sessão cobrem refresh concorrente, reutilização do token rotacionado, troca de escopo e respostas atrasadas após login/logout/expiração.

## Limites da evidência

A auditoria completa, incluindo ferramentas de desenvolvimento, aponta cinco pacotes na cadeia `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`, decorrentes do mesmo alerta de severidade alta. `braces@3.0.3` pode esgotar a pilha ao processar padrões profundamente aninhados; não havia versão corrigida publicada em 03/10/2026, conforme o [advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). A cadeia está marcada como dependência de desenvolvimento e é usada pelo lint, não pelo servidor de produção. A sugestão automática do npm rebaixaria a configuração para uma versão principal incompatível com o Next utilizado. O alerta permanece registrado; a configuração não aceita padrões de usuários finais. Atualizar essa cadeia quando houver correção compatível e executar novamente lint/build/auditoria.

O backend real não expõe identidade completa da sessão. A fixture `tests/e2e/local-fixture.ts` usa tokens reais emitidos pela API, metadados de contas criadas no teste e confirmação administrativa por endpoint protegido. Ela insere uma sessão criptografada de teste no Redis e intercepta somente a consulta de identidade do navegador. Não intercepta entregas, ofertas, rotas, financeiro, análise administrativa ou eventos Socket.IO.

Portanto, o cenário comprova operações após uma sessão preparada, mas **não comprova login/cadastro integrado completo**. Esses fluxos exigem o endpoint proposto, a decisão pendente sobre alterar o backend e nova execução autenticada sem fixture. Cookies Secure em HTTPS, múltiplas instâncias, provedores externos e implantação pública não foram homologados nesta execução local.

Upload de documentos, consentimentos sem contrato, recuperação de senha e demais lacunas estão em `FRONTEND_BACKEND_GAPS.md`. Não há simulação de sucesso desses recursos. A publicação em branches Git é entrega do código; não representa uma implantação pública pronta para operar.
