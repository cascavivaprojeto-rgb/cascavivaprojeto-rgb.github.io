# Página da CascaViva

Site da CascaViva: a história, o simulador de perda de hortifrúti, a solução e o diário de testes.

## Publicar no GitHub Pages (uma vez só)

1. Entre no GitHub com a conta do projeto e clique em **New repository**.
2. Dê um nome ao repositório. Se ele se chamar `<seu-usuario>.github.io`, o endereço fica `https://<seu-usuario>.github.io`. Com outro nome (por exemplo, `cascaviva`), fica `https://<seu-usuario>.github.io/cascaviva`.
3. Marque **Public**, porque o GitHub Pages gratuito publica repositórios públicos, e clique em **Create repository**.
4. Clique em **uploading an existing file** e arraste **todo o conteúdo desta pasta**: `index.html`, `atualizacoes.json`, a pasta `fotos` e este `README.md`. Depois clique em **Commit changes**.
5. Vá em **Settings → Pages**. Em **Branch**, escolha `main` e a pasta `/ (root)`, e clique em **Save**.
6. Em um ou dois minutos, o endereço aparece no topo da mesma tela. Esse é o link para mandar.

O que vai nesta pasta fica público. Não coloque aqui formulação, parâmetros de processo nem documentos da patente.

## Colocar uma atualização no diário

1. Suba as fotos, os vídeos ou os PDFs para a pasta `fotos`, em **Add file → Upload files**. Use nomes sem acento e sem espaço, por exemplo `banana-dia3-sol.jpg`.
2. Abra `atualizacoes.json`, clique no lápis (**Edit**) e acrescente um bloco como este dentro dos colchetes. Os blocos são separados por vírgula.

```json
{
  "tipo": "teste",
  "data": "2026-11-12",
  "titulo": "Teste das bananas · dia 3",
  "texto": "No sol: a banana na embalagem comum já tem manchas; na CascaViva, a casca continua amarela.",
  "anexos": [
    { "url": "fotos/banana-dia3-sol.jpg", "nome": "Banana no sol, dia 3", "contentType": "image/jpeg" }
  ]
}
```

- `tipo`: `teste`, `atualizacao` ou `documento`.
- `data`: no formato ano-mês-dia.
- `contentType`: `image/jpeg` ou `image/png` para fotos, `video/mp4` para vídeos e `application/pdf` para PDF.

3. Clique em **Commit changes**. A página se atualiza sozinha em um ou dois minutos, e o diário mostra as entradas da mais recente para a mais antiga.

Se preferir, mande as fotos e o texto para o Claude, que devolve o `atualizacoes.json` pronto e também a versão para anexar atualizada.

Arquivos grandes: o GitHub recusa arquivo acima de 25 MB pelo site. Para vídeo, prefira clipes curtos ou suba no YouTube e use o link (`"url": "https://youtu.be/..."`).
