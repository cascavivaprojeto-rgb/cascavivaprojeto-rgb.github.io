/**
 * CascaViva · receptor do relatório do site (versão 2)
 * Fica dentro da planilha: Extensões > Apps Script.
 * - Grava cada visita, card aberto e simulação na aba "Eventos".
 * - Grava contatos e pedidos na aba "Contatos e pedidos".
 * - Avisa a equipe por e-mail a cada contato ou pedido (responder ao e-mail responde ao cliente).
 * - Manda um resumo diário das visitas.
 */
const EMAIL_EQUIPE = 'cascaviva.projeto@gmail.com';
const TZ = 'America/Bahia';

const AREAS = {
  'produtor': 'Produção rural', 'embalador': 'Packing house', 'logistica': 'Logística, transporte ou distribuição',
  'mercado': 'Supermercado ou varejo', 'oleos': 'Indústria de óleos', 'cosmeticos': 'Indústria de cosméticos',
  'transformadora': 'Fabricação de embalagens plásticas', 'resinas': 'Resinas ou revestimentos', 'so-aditivo': 'Quer comprar o aditivo',
  'esg': 'Sustentabilidade e metas ESG', 'pesquisa': 'Pesquisa ou universidade', 'investimento': 'Investimento ou fomento',
  'outro': 'Outra área', 'nao-informado': 'Prefere não informar', '': 'Não informada'
};
const PRODUTOS = {
  'hortifruti': 'Embalagem anti-UV para hortifrúti', 'oleos': 'Embalagem anti-UV para óleos', 'cosmeticos': 'Embalagem anti-UV para cosméticos',
  'resina': 'Resina de PEBDL com grafeno vegetal', 'revestimentos': 'Revestimentos com grafeno vegetal', 'aditivo': 'Aditivo de grafeno vegetal puro',
  'licenca': 'Licença e transferência de tecnologia'
};
const PAGINAS = {
  'inicio': 'Início', 'produtos': 'Produtos e preços', 'sobre': 'Sobre nós', 'diario': 'Diário de testes', 'privacidade': 'Como usamos seus dados',
  'produtor': 'Card: produtor', 'embalador': 'Card: packing house', 'logistica': 'Card: logística', 'mercado': 'Card: supermercado',
  'oleos': 'Card: óleos', 'cosmeticos': 'Card: cosméticos', 'transformadora': 'Card: embalagens', 'resinas': 'Card: resinas e revestimentos',
  'so-aditivo': 'Card: só o aditivo', 'esg': 'Card: metas ESG'
};

const corta = (v, n) => String(v == null ? '' : v).slice(0, n || 500);
const area_ = a => { a = corta(a, 80); return a.indexOf('outra: ') === 0 ? 'Outra: ' + a.slice(7) : (AREAS[a] || a); };
const pagina_ = p => { p = corta(p, 60).replace('#', ''); return PAGINAS[p] || p || 'Início'; };
const esc_ = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const doc_ = d => { d = corta(d, 20).replace(/\D/g, ''); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d; };
const tel_ = t => { let d = corta(t, 30).replace(/\D/g, ''); if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : corta(t, 30); };
const cep_ = c => { c = corta(c, 10).replace(/\D/g, ''); return c.length === 8 ? c.slice(0, 5) + '-' + c.slice(5) : c; };

function doGet() {
  return ContentService.createTextOutput('Receptor do relatório da CascaViva funcionando. Os dados chegam pelo site.');
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const quando = new Date();
    const ev = corta(d.evento, 40);
    if (ev === 'contato' || ev === 'compra') registrarFormulario_(ss, ev, d, quando);
    const ab = abaEventos_(ss);
    const oque = {visita: 'Entrou no site', abriu: 'Abriu página', simulacao: 'Usou o simulador', abriu_formulario: 'Abriu formulário', contato: 'Enviou contato', compra: 'Enviou pedido'}[ev] || ev;
    const det = (ev === 'contato' || ev === 'compra') ? 'ver aba Contatos e pedidos' : corta(JSON.stringify(d.dados || {}), 1500);
    linha_(ab, [quando, corta(d.sessao, 40), corta(d.nome, 80), area_(d.area), oque, det, pagina_(d.pagina), corta(d.origem, 200), corta(d.tela, 20)]);
  } catch (err) {
    console.error(err);
  }
  return ContentService.createTextOutput('ok');
}

function registrarFormulario_(ss, ev, d, quando) {
  const x = d.dados || {};
  const compra = ev === 'compra';
  const produto = PRODUTOS[x.produto] || corta(x.produto, 60);
  const areaTxt = area_(x.area !== undefined ? x.area : d.area);
  const aba = abaContatos_(ss);
  linha_(aba, [quando, compra ? 'Pedido de orçamento' : 'Contato', 'Novo', corta(x.nome, 120), corta(x.email, 120), tel_(x.telefone), corta(x.empresa, 120),
    doc_(x.documento), cep_(x.cep), produto, corta(x.quantidade, 60), areaTxt, corta(x.mensagem, 2000), pagina_(x.card), x.autorizou ? 'Sim' : 'Não', '', corta(d.sessao, 40)]);

  const linhas = [
    ['Nome', corta(x.nome, 120)], ['E-mail', corta(x.email, 120)], ['Telefone', tel_(x.telefone)], ['Empresa', corta(x.empresa, 120)],
    ['Área', areaTxt], ['Produto', compra ? produto : ''], ['Quantidade', corta(x.quantidade, 60)], ['CPF ou CNPJ', doc_(x.documento)], ['CEP', cep_(x.cep)],
    ['Mensagem', corta(x.mensagem, 2000)], ['Veio de', pagina_(x.card)]
  ].filter(l => l[1]);
  const titulo = compra ? 'Novo pedido de orçamento' : 'Nova mensagem pelo site';
  const tabela = linhas.map(l => '<tr><td style="padding:8px 14px;color:#56665B;font-weight:600;white-space:nowrap;vertical-align:top;border-bottom:1px solid #E3ECDD">' + l[0] +
    '</td><td style="padding:8px 14px;color:#18291F;border-bottom:1px solid #E3ECDD">' + esc_(l[1]).replace(/\n/g, '<br>') + '</td></tr>').join('');
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px">' +
    '<div style="background:#1E4A33;color:#F2F5EF;padding:18px 22px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E5A928;font-weight:700">CascaViva · site</div>' +
    '<div style="font-size:22px;font-weight:700;margin-top:4px">' + titulo + '</div></div>' +
    '<table style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid #E3ECDD;border-top:0">' + tabela + '</table>' +
    '<p style="color:#56665B;font-size:13px;margin-top:14px">Para responder ao cliente, é só responder este e-mail. Recebido em ' + Utilities.formatDate(quando, TZ, "dd/MM/yyyy 'às' HH:mm") +
    '. Tudo fica registrado na aba "Contatos e pedidos" da planilha <a href="' + ss.getUrl() + '">' + esc_(ss.getName()) + '</a>.</p></div>';
  const texto = titulo + '\n\n' + linhas.map(l => l[0] + ': ' + l[1]).join('\n');
  const assunto = (compra ? 'Pedido de orçamento: ' + produto : 'Mensagem pelo site') + ' · ' + corta(x.nome, 80);
  const opc = {htmlBody: html, name: 'CascaViva · site'};
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(corta(x.email, 120))) opc.replyTo = corta(x.email, 120);
  MailApp.sendEmail(EMAIL_EQUIPE, assunto, texto, opc);
}

// ---------- Aparência da planilha ----------
const COR = {verde: '#1E4A33', verdeClaro: '#E3ECDD', amarelo: '#FBEBC7', laranja: '#F6D2A8', vermelho: '#F4CCC4', azul: '#D6E6F5', cinza: '#EEF1EC', roxo: '#E4DCF2'};
const CAB_CONTATOS = ['Data e hora', 'Tipo', 'Situação', 'Nome', 'E-mail', 'Telefone', 'Empresa', 'CPF ou CNPJ', 'CEP', 'Produto', 'Quantidade', 'Área', 'Mensagem', 'Página de origem', 'Autorizou uso dos dados', 'Observações da equipe', 'Visita'];
const CAB_EVENTOS = ['Data e hora', 'Visita', 'Nome', 'Área', 'O que fez', 'Detalhes', 'Página', 'Veio de', 'Tela'];

function linha_(aba, valores) {
  const n = aba.getLastRow() + 1;
  aba.getRange(n, 1, 1, valores.length).setValues([valores]);
}

function prepara_(ss, nome, cab, larguras, indice) {
  let a = ss.getSheetByName(nome);
  if (a) {
    const atual = a.getRange(1, 1, 1, cab.length).getValues()[0].join('|');
    if (atual === cab.join('|')) return {aba: a, nova: false};
    a.setName(nome + ' (versão antiga ' + Utilities.formatDate(new Date(), TZ, 'dd-MM HH.mm') + ')');
  }
  a = ss.insertSheet(nome, indice);
  a.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(COR.verde).setVerticalAlignment('middle').setWrap(true);
  a.setRowHeight(1, 40); a.setFrozenRows(1);
  larguras.forEach((w, k) => a.setColumnWidth(k + 1, w));
  const max = a.getMaxRows();
  a.getRange(2, 1, max - 1, cab.length).setVerticalAlignment('top').setFontFamily('Arial').setFontSize(10);
  a.getRange(2, 1, max - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  if (a.getMaxColumns() > cab.length) a.deleteColumns(cab.length + 1, a.getMaxColumns() - cab.length);
  return {aba: a, nova: true};
}

function regraTexto_(faixa, texto, cor, negrito) {
  const r = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texto).setBackground(cor).setRanges([faixa]);
  if (negrito) r.setBold(true);
  return r.build();
}

function abaContatos_(ss) {
  const p = prepara_(ss, 'Contatos e pedidos', CAB_CONTATOS, [130, 150, 130, 190, 210, 130, 160, 140, 90, 230, 150, 200, 320, 150, 110, 260, 110], 0);
  const a = p.aba;
  if (p.nova) {
    const max = a.getMaxRows();
    [6, 8, 9].forEach(c => a.getRange(2, c, max - 1, 1).setNumberFormat('@'));
    a.getRange(2, 13, max - 1, 1).setWrap(true);
    a.getRange(2, 16, max - 1, 1).setWrap(true).setBackground('#FFFDF5');
    a.getRange(2, 3, max - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Novo', 'Em contato', 'Proposta enviada', 'Fechado', 'Sem interesse'], true).build());
    const tipo = a.getRange(2, 2, max - 1, 1), sit = a.getRange(2, 3, max - 1, 1);
    a.setConditionalFormatRules([
      regraTexto_(tipo, 'Pedido de orçamento', COR.laranja, true), regraTexto_(tipo, 'Contato', COR.azul, true),
      regraTexto_(sit, 'Novo', COR.vermelho, true), regraTexto_(sit, 'Em contato', COR.amarelo), regraTexto_(sit, 'Proposta enviada', COR.roxo),
      regraTexto_(sit, 'Fechado', '#BFE3C9', true), regraTexto_(sit, 'Sem interesse', COR.cinza)
    ]);
    a.getRange(1, 1, max, CAB_CONTATOS.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false).setHeaderRowColor(COR.verde).setFirstRowColor('#FFFFFF').setSecondRowColor('#F6F8F4');
  }
  return a;
}

function abaEventos_(ss) {
  const p = prepara_(ss, 'Eventos', CAB_EVENTOS, [130, 110, 170, 220, 150, 360, 190, 220, 90], ss.getSheetByName('Contatos e pedidos') ? 1 : 0);
  const a = p.aba;
  if (p.nova) {
    const max = a.getMaxRows();
    a.getRange(2, 6, max - 1, 1).setFontColor('#56665B').setFontSize(9);
    const oque = a.getRange(2, 5, max - 1, 1);
    a.setConditionalFormatRules([
      regraTexto_(oque, 'Entrou no site', COR.verdeClaro, true), regraTexto_(oque, 'Abriu página', COR.azul), regraTexto_(oque, 'Usou o simulador', COR.amarelo),
      regraTexto_(oque, 'Abriu formulário', COR.laranja), regraTexto_(oque, 'Enviou pedido', COR.vermelho, true), regraTexto_(oque, 'Enviou contato', COR.vermelho, true)
    ]);
  }
  return a;
}

function abaResumo_(ss) {
  let a = ss.getSheetByName('Resumo');
  if (a) ss.deleteSheet(a);
  a = ss.insertSheet('Resumo', 0);
  a.setColumnWidth(1, 260); a.setColumnWidth(2, 120); a.setColumnWidth(3, 40); a.setColumnWidth(4, 260); a.setColumnWidth(5, 120);
  a.getRange('A1').setValue('CascaViva · resumo do site').setFontSize(18).setFontWeight('bold').setFontColor(COR.verde);
  a.getRange('A2').setValue('Atualiza sozinho a cada novo registro.').setFontColor('#56665B');
  const kpi = [['Visitas (total)', '=IFERROR(COUNTUNIQUE(Eventos!B2:B),0)'], ['Visitas nos últimos 7 dias', '=IFERROR(COUNTUNIQUE(FILTER(Eventos!B2:B,Eventos!A2:A>=NOW()-7)),0)'],
    ['Pedidos de orçamento', '=COUNTIF(\'Contatos e pedidos\'!B2:B,"Pedido de orçamento")'], ['Mensagens', '=COUNTIF(\'Contatos e pedidos\'!B2:B,"Contato")'],
    ['Aguardando resposta (Novo)', '=COUNTIF(\'Contatos e pedidos\'!C2:C,"Novo")']];
  a.getRange(4, 1, kpi.length, 2).setValues(kpi);
  a.getRange(4, 1, kpi.length, 1).setFontWeight('bold');
  a.getRange(4, 2, kpi.length, 1).setFontSize(16).setFontWeight('bold').setFontColor(COR.verde).setHorizontalAlignment('center').setBackground(COR.verdeClaro);
  a.getRange(8, 2).setBackground(COR.vermelho).setFontColor('#7A1F1C');
  const titulo = (cel, txt) => a.getRange(cel).setValue(txt).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(COR.verde);
  titulo('A11', 'Visitas por área'); titulo('D11', 'Páginas mais abertas'); titulo('A24', 'Pedidos por produto'); titulo('D24', 'O que as pessoas fizeram');
  a.getRange('A12').setFormula('=IFERROR(QUERY(UNIQUE({Eventos!B2:B,Eventos!D2:D}),"select Col2, count(Col1) where Col1 is not null group by Col2 order by count(Col1) desc label Col2 \'Área\', count(Col1) \'Visitas\'",0),"Sem dados ainda")');
  a.getRange('D12').setFormula('=IFERROR(QUERY(Eventos!E2:G,"select G, count(E) where E = \'Abriu página\' group by G order by count(E) desc label G \'Página\', count(E) \'Aberturas\'",0),"Sem dados ainda")');
  a.getRange('A25').setFormula('=IFERROR(QUERY(\'Contatos e pedidos\'!B2:J,"select J, count(B) where B = \'Pedido de orçamento\' group by J order by count(B) desc label J \'Produto\', count(B) \'Pedidos\'",0),"Sem pedidos ainda")');
  a.getRange('D25').setFormula('=IFERROR(QUERY(Eventos!E2:E,"select E, count(E) where E is not null group by E order by count(E) desc label E \'Ação\', count(E) \'Vezes\'",0),"Sem dados ainda")');
  a.setHiddenGridlines(true);
  return a;
}

/** Rode uma vez para deixar a planilha organizada (abas coloridas, colunas de texto e a aba Resumo).
 *  Abas antigas com outro formato são renomeadas como "versão antiga", sem apagar nada. */
function arrumarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  abaContatos_(ss); abaEventos_(ss); abaResumo_(ss);
  const vazia = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (vazia && vazia.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(vazia);
  ss.setActiveSheet(ss.getSheetByName('Resumo'));
}

/** Resumo das últimas 24 horas, enviado por e-mail. */
function resumoDiario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const a = ss.getSheetByName('Eventos');
  if (!a || a.getLastRow() < 2) return;
  const limite = new Date(Date.now() - 24 * 3600 * 1000);
  const linhas = a.getRange(2, 1, a.getLastRow() - 1, 9).getValues().filter(l => l[0] instanceof Date && l[0] >= limite);
  if (!linhas.length) return;
  const vis = {}, pags = {}, areas = {};
  linhas.forEach(l => {
    const s = vis[l[1]] = vis[l[1]] || {nome: '', area: '', paginas: [], sim: 0, form: [], inicio: l[0]};
    if (l[2]) s.nome = l[2]; if (l[3] && l[3] !== 'Não informada') s.area = l[3];
    if (l[4] === 'Abriu página' && l[6] && s.paginas.indexOf(l[6]) < 0) { s.paginas.push(l[6]); pags[l[6]] = (pags[l[6]] || 0) + 1; }
    if (l[4] === 'Usou o simulador') s.sim++;
    if (l[4] === 'Enviou contato' || l[4] === 'Enviou pedido') s.form.push(l[4].replace('Enviou ', ''));
  });
  Object.values(vis).forEach(s => { const k = s.area || 'Não informada'; areas[k] = (areas[k] || 0) + 1; });
  const lista = o => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => '<li>' + esc_(k) + ': <b>' + v + '</b></li>').join('');
  const cada = Object.values(vis).map(s => '<tr><td style="padding:6px 10px;border-bottom:1px solid #E3ECDD;white-space:nowrap">' + Utilities.formatDate(s.inicio, TZ, 'dd/MM HH:mm') + '</td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #E3ECDD">' + esc_(s.nome || 'Sem nome') + '<br><span style="color:#56665B">' + esc_(s.area || 'Área não informada') + '</span></td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #E3ECDD">' + esc_(s.paginas.join(', ') || '—') + (s.sim ? '<br>Simulou ' + s.sim + ' vez(es)' : '') + (s.form.length ? '<br><b style="color:#B8432D">Enviou ' + s.form.join(' e ') + '</b>' : '') + '</td></tr>').join('');
  const n = Object.keys(vis).length;
  const html = '<div style="font-family:Arial,sans-serif;max-width:640px"><div style="background:#1E4A33;color:#F2F5EF;padding:18px 22px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E5A928;font-weight:700">CascaViva · resumo do site</div><div style="font-size:22px;font-weight:700;margin-top:4px">' + n + ' visita(s) nas últimas 24 horas</div></div>' +
    '<div style="border:1px solid #E3ECDD;border-top:0;padding:16px 22px"><p style="font-weight:700;margin:0">Por área</p><ul>' + lista(areas) + '</ul><p style="font-weight:700;margin:0">Páginas mais abertas</p><ul>' + (lista(pags) || '<li>nenhuma</li>') + '</ul>' +
    '<p style="font-weight:700;margin:0 0 8px">Cada visita</p><table style="width:100%;border-collapse:collapse;font-size:14px">' + cada + '</table></div>' +
    '<p style="color:#56665B;font-size:13px">Detalhes na aba "Eventos" da planilha <a href="' + ss.getUrl() + '">' + esc_(ss.getName()) + '</a>.</p></div>';
  MailApp.sendEmail(EMAIL_EQUIPE, 'CascaViva · resumo do site: ' + n + ' visita(s) em 24 h', 'Abra este e-mail num leitor que mostre HTML.', {htmlBody: html, name: 'CascaViva · site'});
}

/** Rode uma vez para ligar o resumo diário (todo dia por volta das 8 h). */
function ligarResumoDiario() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'resumoDiario').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resumoDiario').timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();
}
