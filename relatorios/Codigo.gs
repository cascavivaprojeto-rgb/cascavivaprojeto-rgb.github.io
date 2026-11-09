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
    const ab = aba_(ss, 'Eventos', ['Data e hora', 'Visita', 'Nome', 'Área', 'O que fez', 'Detalhes', 'Página', 'Veio de', 'Tela']);
    const oque = {visita: 'Entrou no site', abriu: 'Abriu página', simulacao: 'Usou o simulador', abriu_formulario: 'Abriu formulário', contato: 'Enviou contato', compra: 'Enviou pedido'}[ev] || ev;
    const det = (ev === 'contato' || ev === 'compra') ? 'ver aba Contatos e pedidos' : corta(JSON.stringify(d.dados || {}), 1500);
    ab.appendRow([quando, corta(d.sessao, 40), corta(d.nome, 80), area_(d.area), oque, det, pagina_(d.pagina), corta(d.origem, 200), corta(d.tela, 20)]);
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
  const aba = aba_(ss, 'Contatos e pedidos', ['Data e hora', 'Tipo', 'Nome', 'E-mail', 'Telefone', 'Empresa', 'CPF ou CNPJ', 'CEP', 'Produto', 'Quantidade', 'Área', 'Mensagem', 'Página de origem', 'Autorizou uso dos dados', 'Visita']);
  aba.appendRow([quando, compra ? 'Pedido de orçamento' : 'Contato', corta(x.nome, 120), corta(x.email, 120), corta(x.telefone, 30), corta(x.empresa, 120),
    doc_(x.documento), cep_(x.cep), produto, corta(x.quantidade, 60), areaTxt, corta(x.mensagem, 2000), pagina_(x.card), x.autorizou ? 'Sim' : 'Não', corta(d.sessao, 40)]);

  const linhas = [
    ['Nome', corta(x.nome, 120)], ['E-mail', corta(x.email, 120)], ['Telefone', corta(x.telefone, 30)], ['Empresa', corta(x.empresa, 120)],
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

function aba_(ss, nome, cab) {
  let a = ss.getSheetByName(nome);
  if (!a) { a = ss.insertSheet(nome, 0); a.appendRow(cab); a.setFrozenRows(1); a.getRange(1, 1, 1, cab.length).setFontWeight('bold').setBackground('#E3ECDD'); }
  return a;
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
