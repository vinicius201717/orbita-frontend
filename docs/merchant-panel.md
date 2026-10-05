# Painel do estabelecimento

Rotas privadas para `BUSINESS_OWNER` e `BUSINESS_STAFF`:

| Rota | Uso |
| --- | --- |
| `/app` | Resumo ao vivo, últimos pedidos, primeiros passos e acesso ao catálogo |
| `/app/produtos` | Cadastro/edição, categorias, preços em reais e pausa de produtos |
| `/app/pedidos` | Pedidos recentes, busca por cliente/telefone e filtros por etapa no servidor |
| `/app/pedidos/novo` | Produtos e quantidades, cliente, endereço confirmado, preparo e revisão |
| `/app/pedidos/:id` | Itens históricos, preparo, cancelamento/devolução, linha do tempo e entrega |
| `/app/entregas/nova` | Entrega avulsa para pedidos montados em outro sistema |

O catálogo usa `/business/products`; os pedidos usam `/business/orders`. Não há dados simulados nas telas. O servidor recalcula preços e cria pedido/entrega atomicamente. O cliente mantém a chave de envio durante tentativas na mesma tela; clicar novamente não cria uma segunda entrega. Filtros/paginação usam a API e atualizam a cada 30 segundos, além dos eventos de entrega.

Produtos são agrupados por categoria livre e podem ser pausados; não há controle de estoque por quantidade. A entrada de preço aceita reais com vírgula, convertidos em centavos inteiros. Pedidos salvos mantêm os preços e nomes da criação. O subtotal de produtos não é um registro de pagamento, e o frete aparece separado no detalhe.

Endereço e unidades usam `DeliveryAddressField`: busca Google habilitada no backend, seleção explícita e alternativa de ponto confirmado no Google Maps. Links curtos e posição da câmera não são aceitos como coordenada de destino. Sem chave Google configurada, a busca informa indisponibilidade e a confirmação manual continua funcionando.

Estilo: CSS Modules por funcionalidade (`catalog`, `orders`, `orders-address`, `business/merchant-dashboard.module.css`), tokens globais ORBITA, fontes locais Sora/Inter, superfícies claras e navegação escura. Não há biblioteca adicional de componentes ou SDK de mapas no navegador. Formulários têm rótulos, diálogos nativos, feedback de erro e layouts responsivos.

Após mudanças de API, copiar o OpenAPI do backend e executar `npm run api:types`. Validar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`. O backend deve receber a migração `202610040001_merchant_catalog` antes de publicar este frontend.
