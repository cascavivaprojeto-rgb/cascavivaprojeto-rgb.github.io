# Relatório do site da CascaViva: como ativar (uns 10 minutos, uma vez só)

O site já registra quem respondeu às perguntas de boas-vindas, os cards que cada pessoa abriu, as simulações e os formulários de contato e de compra. Falta só o "receptor": uma planilha do Google que guarda tudo e manda os e-mails.

Faça os passos com a conta **cascaviva.projeto@gmail.com**.

1. Abra o Google Planilhas e crie uma planilha em branco chamada **CascaViva · Relatório do site**.
2. No menu da planilha: **Extensões → Apps Script**.
3. Apague o que estiver no editor, cole todo o conteúdo do arquivo `Codigo.gs` e clique em **Salvar** (ícone de disquete).
4. Clique em **Implantar → Nova implantação**. Na engrenagem, escolha **App da Web**.
   - Descrição: `Relatório do site`
   - Executar como: **Eu** (cascaviva.projeto@gmail.com)
   - Quem pode acessar: **Qualquer pessoa**
5. Clique em **Implantar** e autorize o acesso quando o Google pedir. Se aparecer "O Google não verificou este app", clique em **Avançado → Acessar** (o app é de vocês mesmos).
6. Copie o endereço que termina em `/exec` e mande para o Claude. Ele coloca o endereço no site e publica.
7. Para receber o resumo diário: no editor do Apps Script, escolha a função **ligarResumoDiario** no menu de cima e clique em **Executar**, uma vez.

## O que vocês recebem

- **A cada contato ou pedido de compra:** um e-mail na hora, com nome, e-mail, telefone, empresa e, no pedido, CPF ou CNPJ, CEP, produto e quantidade.
- **Todo dia às 8 h:** um resumo das visitas das últimas 24 horas: quantas pessoas, de que áreas, quais cards abriram, quem simulou e quem enviou formulário.
- **Na planilha:** a aba **Eventos** com cada passo de cada visita e a aba **Contatos e pedidos** com todos os formulários.

## Cuidados

- O endereço `/exec` fica visível no código do site, como em qualquer formulário na internet. Alguém mal-intencionado poderia mandar dados falsos. Se isso acontecer, faça uma nova implantação e mande o endereço novo.
- A planilha tem dados pessoais (nome, telefone, CPF ou CNPJ). Compartilhe só com a equipe e não a deixe pública.
- Pela LGPD, se alguém pedir para ver, corrigir ou apagar os próprios dados, apague as linhas dessa pessoa nas duas abas.
