# Substituir Cooud por pagamentos integrados

## Objetivo
Trocar integralmente o pagamento Cooud pelo checkout integrado da Stripe, mantendo o comprador na página e usando os três produtos digitais já criados.

## Implementação
- Instalar as bibliotecas oficiais de pagamento nas versões compatíveis.
- Mapear cada pack ao seu identificador de preço e nome exato:
  - 1 pack — AI Essentials: Your First Steps with Artificial Intelligence — £16,99
  - 3 pack — AI Productivity Mastery — £24,99
  - 6 pack — AI Business Accelerator — £42,99
- Criar a sessão de pagamento somente no servidor, usando a conexão segura já ativada.
- Exibir o checkout incorporado na página atual, com aviso automático de ambiente de teste.
- Usar cálculo e cobrança automática de impostos; registro, declaração e repasse continuam sob responsabilidade do vendedor.
- Validar os dados obrigatórios de contato e entrega antes de abrir o pagamento.
- Após o retorno aprovado, registrar o pedido e disparar o acompanhamento existente sem confiar apenas no navegador.
- Remover o componente, proxy, webhook e função antigos da Cooud.

## Validação
- Confirmar compilação sem erros.
- Testar a página em desktop e celular.
- Verificar seleção dos três packs, formulário, carregamento do pagamento e retorno de sucesso.
- Confirmar que nenhuma referência ativa à Cooud permanece.

## Limite atual
A integração ficará pronta no ambiente de teste. Para cobrar dinheiro real, será necessário concluir a verificação na área de Pagamentos e publicar novamente.
