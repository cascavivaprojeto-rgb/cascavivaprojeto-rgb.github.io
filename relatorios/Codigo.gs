/**
 * CascaViva · receptor do relatório do site
 * Cole este código em: Planilha Google > Extensões > Apps Script.
 * Ele grava cada visita, card aberto e simulação na aba "Eventos",
 * grava contatos e pedidos na aba "Contatos e pedidos",
 * avisa a equipe por e-mail a cada contato ou pedido
 * e manda um resumo diário das visitas.
 */
const EMAIL_EQUIPE = 'cascaviva.projeto@gmail.com';
const TZ = 'America/Bahia';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const corta = (v, n) => String(v == null ? '' : v).slice(0, n || 500);
    const quando = new Date();
    const ev = corta(d.evento, 40);
    if (ev === 'contato' || ev === 'compra') {
      const x = d.dados || {};
      const aba = aba_(ss, 'Contatos e pedidos', ['Data e hora', 'Tipo', 'Nome', 'E-mail', 'Telefone', 'Empresa', 'CPF ou CNPJ', 'CEP', 'Produto', 'Quantidade', 'Mensagem', 'Área', 'Card de origem', 'Autorizou uso dos dados', 'Sessão']);
      aba.appendRow([quando, ev === 'compra' ? 'Pedido de compra ou orçamento' : 'Contato', corta(x.nome, 120), corta(x.email, 120), corta(x.telefone, 30), corta(x.empresa, 120), corta(x.documento, 20), corta(x.cep, 10), corta(x.produto, 40), corta(x.quantidade, 60), corta(x.mensagem, 2000), corta(x.area, 80), corta(x.card, 40), x.autorizou ? 'Sim' : 'Não', corta(d.sessao, 40)]);
      MailApp.sendEmail(EMAIL_EQUIPE,
        (ev === 'compra' ? 'Novo pedido de orçamento' : 'Novo contato') + ' pelo site: ' + corta(x.nome, 80),
        ['Nome: ' + corta(x.nome, 120), 'E-mail: ' + corta(x.email, 120), 'Telefone: ' + corta(x.telefone, 30), 'Empresa: ' + corta(x.empresa, 120),
         x.documento ? 'CPF ou CNPJ: ' + corta(x.documento, 20) : '', x.cep ? 'CEP: ' + corta(x.cep, 10) : '', x.produto ? 'Produto: ' + corta(x.produto, 40) : '',
         x.quantidade ? 'Quantidade: ' + corta(x.quantidade, 60) : '', x.area ? 'Área: ' + corta(x.area, 80) : '', 'Mensagem: ' + corta(x.mensagem, 2000), 'Veio do card: ' + (corta(x.card, 40) || 'início'),
         '', 'Tudo fica registrado na aba "Contatos e pedidos" da planilha.'].filter(String).join('\n'));
    }
    const ab = aba_(ss, 'Eventos', ['Data e hora', 'Sessão', 'Nome', 'Área', 'Evento', 'Detalhes', 'Página', 'Veio de', 'Tela']);
    const det = (ev === 'contato' || ev === 'compra') ? 'ver aba Contatos e pedidos' : corta(JSON.stringify(d.dados || {}), 1500);
    ab.appendRow([quando, corta(d.sessao, 40), corta(d.nome, 80), corta(d.area, 80), ev, det, corta(d.pagina, 60), corta(d.origem, 200), corta(d.tela, 20)]);
  } catch (err) {
    // ignora envios malformados
  }
  return ContentService.createTextOutput('ok');
}

function aba_(ss, nome, cab) {
  let a = ss.getSheetByName(nome);
  if (!a) { a = ss.insertSheet(nome); a.appendRow(cab); a.setFrozenRows(1); a.getRange(1, 1, 1, cab.length).setFontWeight('bold'); }
  return a;
}

/** Resumo das últimas 24 horas, enviado por e-mail. */
function resumoDiario() {
  const a = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Eventos');
  if (!a || a.getLastRow() < 2) return;
  const limite = new Date(Date.now() - 24 * 3600 * 1000);
  const linhas = a.getRange(2, 1, a.getLastRow() - 1, 9).getValues().filter(l => l[0] instanceof Date && l[0] >= limite);
  if (!linhas.length) return;
  const sessoes = {}, cards = {}, areas = {};
  linhas.forEach(l => {
    const s = sessoes[l[1]] = sessoes[l[1]] || {nome: '', area: '', paginas: [], sim: 0, form: [], inicio: l[0]};
    if (l[2]) s.nome = l[2]; if (l[3]) s.area = l[3];
    if (l[4] === 'abriu' && l[6] && s.paginas.indexOf(l[6]) < 0) { s.paginas.push(l[6]); cards[l[6]] = (cards[l[6]] || 0) + 1; }
    if (l[4] === 'simulacao') s.sim++;
    if (l[4] === 'contato' || l[4] === 'compra') s.form.push(l[4]);
  });
  Object.values(sessoes).forEach(s => { const k = s.area || 'não informada'; areas[k] = (areas[k] || 0) + 1; });
  const ord = o => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => '  ' + k.replace('#', '') + ': ' + v).join('\n');
  const lista = Object.values(sessoes).map(s => '- ' + Utilities.formatDate(s.inicio, TZ, 'dd/MM HH:mm') + ' · ' + (s.nome || 'sem nome') + ' · ' + (s.area || 'área não informada') +
    (s.paginas.length ? ' · viu: ' + s.paginas.map(p => p.replace('#', '')).join(', ') : '') + (s.sim ? ' · simulou ' + s.sim + 'x' : '') + (s.form.length ? ' · ENVIOU ' + s.form.join(' e ') : '')).join('\n');
  MailApp.sendEmail(EMAIL_EQUIPE, 'CascaViva · resumo do site (' + Object.keys(sessoes).length + ' visitas nas últimas 24 h)',
    'Visitas por área:\n' + ord(areas) + '\n\nCards e páginas mais abertos:\n' + (ord(cards) || '  nenhum') + '\n\nCada visita:\n' + lista + '\n\nDetalhes completos na aba "Eventos" da planilha.');
}

/** Rode uma vez para ligar o resumo diário (todo dia por volta das 8 h). */
function ligarResumoDiario() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'resumoDiario').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resumoDiario').timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();
}
