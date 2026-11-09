# Relatório do site da CascaViva

O site registra quem respondeu às perguntas de boas-vindas, os cards que cada pessoa abriu, as simulações, de qual canal ela veio e os formulários de contato e de compra. Tudo chega numa planilha Google da conta **cascaviva.projeto@gmail.com**.

Se o navegador tiver mais de uma conta Google aberta, faça tudo numa janela anônima (Ctrl + Shift + N) entrando só com a conta do projeto.

## Primeira instalação

1. Crie uma planilha em branco chamada **CascaViva · Relatório do site**.
2. **Extensões → Apps Script**. Apague o que estiver no editor, cole o `Codigo.gs` inteiro e clique em **Salvar**.
3. (Opcional) No início do código, em `OUTROS_AVISOS`, coloque entre aspas o e-mail de quem mais deve receber os avisos, por exemplo `['karolayne@gmail.com', 'silvano@gmail.com']`. Salve.
4. No menu de funções lá em cima, escolha **arrumarPlanilha** e clique em **Executar**. Autorize quando o Google pedir (se aparecer "app não verificado": Avançado → Acessar).
5. Escolha a função **ligarRotinas** e clique em **Executar**. Ela liga o resumo diário das 8 h e a limpeza mensal da navegação antiga.
6. **Implantar → Nova implantação →** engrenagem **App da Web**. Executar como **Eu**; Quem pode acessar **Qualquer pessoa**. **Implantar** e copie o endereço que termina em `/exec` para o Claude colocar no site.

## Atualizar o código sem mudar o endereço

1. **Extensões → Apps Script**, apague tudo, cole o `Codigo.gs` novo e **Salvar**.
2. Se a mensagem do Claude pedir, rode de novo **arrumarPlanilha** e **ligarRotinas**.
3. **Implantar → Gerenciar implantações →** lápis (**Editar**) **→ Versão: Nova versão → Implantar**.

Não use "Nova implantação" para atualizar: o endereço muda e o site deixa de enviar.

## O que vocês recebem

- **A cada pedido ou mensagem:** um e-mail organizado com os dados, o que a pessoa simulou e por qual canal chegou, com botões **Responder no WhatsApp** (mensagem pronta) e **Responder por e-mail**.
- **O cliente recebe na hora** uma confirmação da CascaViva, no visual da marca, com o resumo do pedido e o link do site.
- **Todo dia às 8 h:** resumo das visitas das últimas 24 horas, por área e por canal.
- **Na planilha:**
  - **Resumo:** números principais e tabelas por área, canal, página, produto e ação. Atualiza sozinho.
  - **Contatos e pedidos:** um por linha, com a coluna **Situação** (Novo, Em contato, Proposta enviada, Fechado, Sem interesse) e **Observações da equipe**.
  - **Eventos:** cada passo das visitas, colorido pelo tipo de ação.
  - **Para o sistema (CRM):** os mesmos contatos com os nomes de coluna do CRM do sistema CascaViva. Para importar: com essa aba aberta, **Arquivo → Fazer download → .csv**; no sistema, **CRM → Importar CSV**.

## Cuidados (LGPD)

- A planilha tem dados pessoais. Compartilhe só com a equipe.
- Os registros de navegação (aba Eventos) com mais de 12 meses são apagados sozinhos no dia 1º de cada mês. Contatos e pedidos ficam até vocês apagarem.
- Se alguém pedir para ver, corrigir ou apagar os próprios dados, apague as linhas dessa pessoa nas abas Contatos e pedidos, Para o sistema (CRM) e Eventos.
- O endereço `/exec` aparece no código do site, como em qualquer formulário na internet. Se chegarem dados falsos em quantidade, faça uma implantação nova e mande o endereço novo ao Claude.
