/**
 * CascaViva · receptor do relatório do site (versão 4)
 * Fica dentro da planilha: Extensões > Apps Script.
 * - Grava cada visita, card aberto e simulação na aba "Eventos" (com o canal de origem).
 * - Grava contatos e pedidos na aba "Contatos e pedidos" e na aba "Para o sistema (CRM)".
 * - Avisa a equipe por e-mail (com botão de WhatsApp) e responde automaticamente ao cliente.
 * - Manda um resumo diário e apaga, todo mês, os registros de navegação com mais de 12 meses.
 * Depois de colar: rode arrumarPlanilha e ligarRotinas uma vez cada.
 */
const EMAIL_EQUIPE = 'cascaviva.projeto@gmail.com';
// Quem mais recebe os avisos de contato e pedido. Ex.: ['karolayne@exemplo.com', 'silvano@exemplo.com']
const OUTROS_AVISOS = ['silvanoprofissionaldedireito@gmail.com', 'karolayne.engquimica@gmail.com'];
const SITE = 'https://cascavivaprojeto-rgb.github.io/';
const MESES_GUARDAR_NAVEGACAO = 12;
const TZ = 'America/Bahia';

const AREAS = {
  'produtor': 'Produção rural', 'embalador': 'Packing house', 'logistica': 'Logística, transporte ou distribuição',
  'mercado': 'Supermercado ou varejo', 'oleos': 'Indústria de óleos', 'cosmeticos': 'Indústria de cosméticos',
  'transformadora': 'Fabricação de embalagens plásticas', 'resinas': 'Resinas ou revestimentos', 'so-aditivo': 'Quer comprar o aditivo',
  'esg': 'Sustentabilidade e metas ESG', 'pesquisa': 'Pesquisa ou universidade', 'investimento': 'Investimento ou fomento',
  'outro': 'Outra área', 'nao-informado': 'Prefere não informar', '': 'Não informada'
};
// Área do site -> Segmento e Público do CRM do sistema CascaViva
const SEGMENTO_CRM = {
  'produtor': 'produtor rural', 'embalador': 'packing house', 'logistica': 'distribuidor / logística', 'mercado': 'supermercado / atacarejo',
  'oleos': 'óleo vegetal', 'cosmeticos': 'cosméticos', 'transformadora': 'indústria de embalagens', 'pesquisa': 'academia / laboratório', 'investimento': 'investidor'
};
const PUBLICO_CRM = {'pesquisa': 'academia', 'investimento': 'investidor'};
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
const CANAIS = {'qrcode': 'QR Code', 'eagro': 'e-Agro', 'pitch': 'Pitch', 'cartao': 'Cartão de visita', 'whatsapp': 'WhatsApp', 'linkedin': 'LinkedIn',
  'instagram': 'Instagram', 'email': 'E-mail', 'oficina': 'Oficina', 'mentoria': 'Mentorias e programas'};

const corta = (v, n) => String(v == null ? '' : v).slice(0, n || 500);
const area_ = a => { a = corta(a, 80); return a.indexOf('outra: ') === 0 ? 'Outra: ' + a.slice(7) : (AREAS[a] || a); };
const pagina_ = p => { p = corta(p, 60).replace('#', ''); return PAGINAS[p] || p || 'Início'; };
const canal_ = c => { c = corta(c, 60); return CANAIS[c] || c || 'site direto'; };
const esc_ = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const doc_ = d => { d = corta(d, 20).replace(/\D/g, ''); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d; };
const digTel_ = t => { let d = corta(t, 30).replace(/\D/g, ''); if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2); return d; };
const tel_ = t => { const d = digTel_(t); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : corta(t, 30); };
const cep_ = c => { c = corta(c, 10).replace(/\D/g, ''); return c.length === 8 ? c.slice(0, 5) + '-' + c.slice(5) : c; };
const emailOk_ = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

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
    const x = d.dados || {};
    const det = (ev === 'contato' || ev === 'compra') ? 'ver aba Contatos e pedidos' : ev === 'simulacao' && x.resumo ? corta(x.resumo, 1500) : corta(JSON.stringify(x), 1500);
    linha_(ab, [quando, corta(d.sessao, 40), corta(d.nome, 80), area_(d.area), oque, det, pagina_(d.pagina), canal_(d.canal), corta(d.origem, 200), corta(d.tela, 20)]);
  } catch (err) {
    console.error(err);
  }
  return ContentService.createTextOutput('ok');
}

function registrarFormulario_(ss, ev, d, quando) {
  const x = d.dados || {};
  const compra = ev === 'compra';
  const produto = PRODUTOS[x.produto] || corta(x.produto, 60);
  const areaCod = x.area !== undefined ? corta(x.area, 80) : corta(d.area, 80);
  const areaTxt = area_(areaCod);
  const canal = canal_(x.canal || d.canal);
  const nome = corta(x.nome, 120), email = corta(x.email, 120), primeiro = nome.split(' ')[0] || '';

  linha_(abaContatos_(ss), [quando, compra ? 'Pedido de orçamento' : 'Contato', 'Novo', nome, email, tel_(x.telefone), corta(x.empresa, 120),
    doc_(x.documento), cep_(x.cep), produto, corta(x.quantidade, 60), areaTxt, corta(x.mensagem, 2000), corta(x.simulacao, 1500), canal, pagina_(x.card),
    x.autorizou ? 'Sim' : 'Não', '', corta(d.sessao, 40)]);

  const seg = areaCod.indexOf('outra: ') === 0 ? 'outro' : (SEGMENTO_CRM[areaCod] || 'outro');
  const interesse = compra ? produto + (x.quantidade ? ' · ' + corta(x.quantidade, 60) : '') : 'Mensagem pelo site';
  const notas = [x.mensagem ? 'Mensagem: ' + corta(x.mensagem, 2000) : '', x.simulacao ? 'Simulou: ' + corta(x.simulacao, 1500) : '', 'Chegou pelo site (' + canal + ') em ' + Utilities.formatDate(quando, TZ, 'dd/MM/yyyy HH:mm')].filter(String).join(' | ');
  linha_(abaCrm_(ss), [nome, corta(x.empresa, 120), '', PUBLICO_CRM[areaCod] || 'indústria', seg, compra ? produto : '', cep_(x.cep), 'Atração', compra ? 'alta' : 'média',
    interesse, compra ? 'Responder o pedido de orçamento' : 'Responder a mensagem', Utilities.formatDate(new Date(quando.getTime() + 2 * 864e5), TZ, 'dd/MM/yyyy'), '', x.autorizou ? 'sim' : 'não', email, tel_(x.telefone), notas]);

  // ---- aviso para a equipe ----
  const linhas = [
    ['Nome', nome], ['E-mail', email], ['Telefone', tel_(x.telefone)], ['Empresa', corta(x.empresa, 120)], ['Área', areaTxt],
    ['Produto', compra ? produto : ''], ['Quantidade', corta(x.quantidade, 60)], ['CPF ou CNPJ', doc_(x.documento)], ['CEP', cep_(x.cep)],
    ['Mensagem', corta(x.mensagem, 2000)], ['O que simulou', corta(x.simulacao, 1500).split(' || ').join('\n')], ['Chegou por', canal], ['Veio de', pagina_(x.card)]
  ].filter(l => l[1]);
  const titulo = compra ? 'Novo pedido de orçamento' : 'Nova mensagem pelo site';
  const tabela = linhas.map(l => '<tr><td style="padding:8px 14px;color:#56665B;font-weight:600;white-space:nowrap;vertical-align:top;border-bottom:1px solid #E3ECDD">' + l[0] +
    '</td><td style="padding:8px 14px;color:#18291F;border-bottom:1px solid #E3ECDD">' + esc_(l[1]).replace(/\n/g, '<br>') + '</td></tr>').join('');
  const telD = digTel_(x.telefone);
  const msgWa = 'Olá, ' + primeiro + '! Aqui é da equipe CascaViva. Recebemos ' + (compra ? 'o seu pedido de orçamento de ' + produto : 'a sua mensagem pelo site') + ' e gostaríamos de conversar com você.';
  const botoes = (telD.length >= 10 ? '<a href="https://wa.me/55' + telD + '?text=' + encodeURIComponent(msgWa) + '" style="display:inline-block;background:#25D366;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;margin-right:8px">Responder no WhatsApp</a>' : '') +
    (emailOk_(email) ? '<a href="mailto:' + email + '?subject=' + encodeURIComponent('CascaViva · ' + (compra ? 'seu pedido de orçamento' : 'sua mensagem')) + '" style="display:inline-block;background:#E5A928;color:#1B1405;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Responder por e-mail</a>' : '');
  const html = '<div style="font-family:Arial,sans-serif;max-width:600px">' +
    '<div style="background:#1E4A33;color:#F2F5EF;padding:18px 22px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E5A928;font-weight:700">CascaViva · site</div>' +
    '<div style="font-size:22px;font-weight:700;margin-top:4px">' + titulo + '</div></div>' +
    '<table style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid #E3ECDD;border-top:0">' + tabela + '</table>' +
    '<div style="padding:16px 0">' + botoes + '</div>' +
    '<p style="color:#56665B;font-size:13px">O cliente já recebeu uma confirmação automática. Recebido em ' + Utilities.formatDate(quando, TZ, "dd/MM/yyyy 'às' HH:mm") +
    '. Registrado na planilha <a href="' + ss.getUrl() + '">' + esc_(ss.getName()) + '</a>, nas abas "Contatos e pedidos" (Situação: Novo) e "Para o sistema (CRM)".</p></div>';
  const texto = titulo + '\n\n' + linhas.map(l => l[0] + ': ' + l[1]).join('\n');
  const assunto = (compra ? 'Pedido de orçamento: ' + produto : 'Mensagem pelo site') + ' · ' + corta(nome, 80);
  const opc = {htmlBody: html, name: 'CascaViva · site'};
  if (emailOk_(email)) opc.replyTo = email;
  MailApp.sendEmail([EMAIL_EQUIPE].concat(OUTROS_AVISOS).join(','), assunto, texto, opc);

  // ---- confirmação automática para o cliente ----
  if (emailOk_(email)) {
    const resumo = [['Pedido', compra ? produto : 'Mensagem pelo site'], ['Quantidade', corta(x.quantidade, 60)], ['Sua mensagem', corta(x.mensagem, 2000)]].filter(l => l[1])
      .map(l => '<tr><td style="padding:8px 14px;color:#56665B;font-weight:600;white-space:nowrap;vertical-align:top;border-bottom:1px solid #E3ECDD">' + l[0] + '</td><td style="padding:8px 14px;border-bottom:1px solid #E3ECDD">' + esc_(l[1]).replace(/\n/g, '<br>') + '</td></tr>').join('');
    const htmlCli = '<div style="font-family:Arial,sans-serif;max-width:600px;color:#18291F">' +
      '<div style="background:#1E4A33;color:#F2F5EF;padding:22px 24px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E5A928;font-weight:700">CascaViva · embalagem anti-UV</div>' +
      '<div style="font-size:24px;font-weight:700;margin-top:6px">Recebemos ' + (compra ? 'o seu pedido' : 'a sua mensagem') + ', ' + esc_(primeiro) + '!</div></div>' +
      '<div style="border:1px solid #E3ECDD;border-top:0;padding:20px 24px">' +
      '<p style="margin:0 0 14px">Obrigado pelo interesse na CascaViva. A nossa equipe vai analisar ' + (compra ? 'o seu pedido' : 'a sua mensagem') + ' e entrar em contato pelo e-mail ou telefone que você informou.</p>' +
      (resumo ? '<table style="width:100%;border-collapse:collapse;margin:0 0 14px">' + resumo + '</table>' : '') +
      '<p style="margin:0 0 6px">Enquanto isso, você pode rever os produtos e simular a sua perda no nosso site:</p>' +
      '<p style="margin:0 0 18px"><a href="' + SITE + '?origem=email" style="display:inline-block;background:#E5A928;color:#1B1405;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Visitar o site da CascaViva</a></p>' +
      '<p style="margin:0;color:#56665B;font-size:13px">Equipe CascaViva · Karolayne Angel, Silvano Neto e Prof. Francislei Santos · tecnologia desenvolvida no IFBA, pedido de patente BR 10 2025 026328 9.</p>' +
      '<p style="margin:10px 0 0;color:#56665B;font-size:12px">Você recebeu este e-mail porque enviou um formulário no site da CascaViva. Para consultar, corrigir ou apagar os seus dados, responda a este e-mail.</p></div></div>';
    const txtCli = 'Olá, ' + primeiro + '! Recebemos ' + (compra ? 'o seu pedido de ' + produto : 'a sua mensagem') + '. A equipe CascaViva vai entrar em contato pelo e-mail ou telefone informado. Site: ' + SITE;
    MailApp.sendEmail(email, 'CascaViva · recebemos ' + (compra ? 'o seu pedido de orçamento' : 'a sua mensagem'), txtCli, {htmlBody: htmlCli, name: 'CascaViva', replyTo: EMAIL_EQUIPE});
  }
}

// ---------- Aparência da planilha ----------
const COR = {verde: '#1E4A33', verdeClaro: '#E3ECDD', amarelo: '#FBEBC7', laranja: '#F6D2A8', vermelho: '#F4CCC4', azul: '#D6E6F5', cinza: '#EEF1EC', roxo: '#E4DCF2'};
const CAB_CONTATOS = ['Data e hora', 'Tipo', 'Situação', 'Nome', 'E-mail', 'Telefone', 'Empresa', 'CPF ou CNPJ', 'CEP', 'Produto', 'Quantidade', 'Área', 'Mensagem', 'O que simulou', 'Chegou por', 'Página de origem', 'Autorizou uso dos dados', 'Observações da equipe', 'Visita'];
const CAB_EVENTOS = ['Data e hora', 'Visita', 'Nome', 'Área', 'O que fez', 'Detalhes', 'Página', 'Chegou por', 'Veio de', 'Tela'];
// Mesmos nomes de coluna do CRM do sistema CascaViva: em Arquivo > Fazer download > CSV, a importação reconhece sozinha
const CAB_CRM = ['Nome', 'Empresa / instituição', 'Cargo', 'Público', 'Segmento', 'Produto / fruta / cultura', 'Cidade / UF', 'Etapa do funil', 'Prioridade', 'Interesse', 'Próximo passo', 'Data do follow-up', 'Responsável', 'Consentimento LGPD', 'E-mail', 'Telefone / WhatsApp', 'Notas'];

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
  a = ss.insertSheet(nome, Math.min(indice, ss.getSheets().length));
  a.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(COR.verde).setVerticalAlignment('middle').setWrap(true);
  a.setRowHeight(1, 40); a.setFrozenRows(1);
  larguras.forEach((w, k) => a.setColumnWidth(k + 1, w));
  const max = a.getMaxRows();
  a.getRange(2, 1, max - 1, cab.length).setVerticalAlignment('top').setFontFamily('Arial').setFontSize(10);
  if (a.getMaxColumns() > cab.length) a.deleteColumns(cab.length + 1, a.getMaxColumns() - cab.length);
  return {aba: a, nova: true};
}

function regraTexto_(faixa, texto, cor, negrito) {
  const r = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texto).setBackground(cor).setRanges([faixa]);
  if (negrito) r.setBold(true);
  return r.build();
}

function abaContatos_(ss) {
  const p = prepara_(ss, 'Contatos e pedidos', CAB_CONTATOS, [130, 150, 130, 190, 210, 130, 160, 140, 90, 230, 150, 200, 320, 320, 130, 150, 110, 260, 110], 1);
  const a = p.aba;
  if (p.nova) {
    const max = a.getMaxRows();
    a.getRange(2, 1, max - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    [6, 8, 9].forEach(c => a.getRange(2, c, max - 1, 1).setNumberFormat('@'));
    [13, 14].forEach(c => a.getRange(2, c, max - 1, 1).setWrap(true));
    a.getRange(2, 18, max - 1, 1).setWrap(true).setBackground('#FFFDF5');
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
  const p = prepara_(ss, 'Eventos', CAB_EVENTOS, [130, 110, 170, 220, 150, 380, 190, 140, 220, 90], 2);
  const a = p.aba;
  if (p.nova) {
    const max = a.getMaxRows();
    a.getRange(2, 1, max - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    a.getRange(2, 6, max - 1, 1).setFontColor('#56665B').setFontSize(9).setWrap(true);
    const oque = a.getRange(2, 5, max - 1, 1);
    a.setConditionalFormatRules([
      regraTexto_(oque, 'Entrou no site', COR.verdeClaro, true), regraTexto_(oque, 'Abriu página', COR.azul), regraTexto_(oque, 'Usou o simulador', COR.amarelo),
      regraTexto_(oque, 'Abriu formulário', COR.laranja), regraTexto_(oque, 'Enviou pedido', COR.vermelho, true), regraTexto_(oque, 'Enviou contato', COR.vermelho, true)
    ]);
  }
  return a;
}

function abaCrm_(ss) {
  const p = prepara_(ss, 'Para o sistema (CRM)', CAB_CRM, [190, 170, 100, 110, 170, 220, 100, 110, 90, 240, 220, 120, 120, 120, 210, 140, 420], 3);
  const a = p.aba;
  if (p.nova) {
    const max = a.getMaxRows();
    [7, 12, 16].forEach(c => a.getRange(2, c, max - 1, 1).setNumberFormat('@'));
    a.getRange(2, 17, max - 1, 1).setWrap(true).setFontSize(9);
    a.getRange(1, 1).setNote('Para levar ao sistema CascaViva: Arquivo > Fazer download > Valores separados por vírgula (.csv) com esta aba aberta. No sistema, CRM > Importar CSV: as colunas são reconhecidas pelo nome.');
  }
  return a;
}

/** Ajusta a fórmula ao idioma da planilha: em português, os argumentos são separados por ";" e as colunas de {…} por "\". */
function formula_(ss, f) {
  const loc = String(ss.getSpreadsheetLocale() || 'en_US');
  if (/^(en|ja|ko|zh|th|he|hi|ms|fil)/.test(loc)) return f;
  let out = '', aspas = false, chaves = 0;
  for (const ch of f) {
    if (ch === '"') aspas = !aspas;
    if (!aspas && ch === '{') chaves++;
    if (!aspas && ch === '}') chaves--;
    out += (!aspas && ch === ',') ? (chaves > 0 ? '\\' : ';') : ch;
  }
  return out;
}

function abaResumo_(ss) {
  let a = ss.getSheetByName('Resumo');
  if (a) ss.deleteSheet(a);
  a = ss.insertSheet('Resumo', 0);
  [260, 120, 40, 260, 120].forEach((w, k) => a.setColumnWidth(k + 1, w));
  a.getRange('A1').setValue('CascaViva · resumo do site').setFontSize(18).setFontWeight('bold').setFontColor(COR.verde);
  a.getRange('A2').setValue('Atualiza sozinho a cada novo registro.').setFontColor('#56665B');
  const kpi = [['Visitas (total)', '=IFERROR(COUNTUNIQUE(Eventos!B2:B),0)'], ['Visitas nos últimos 7 dias', '=IFERROR(COUNTUNIQUE(FILTER(Eventos!B2:B,Eventos!A2:A>=NOW()-7)),0)'],
    ['Pedidos de orçamento', '=COUNTIF(\'Contatos e pedidos\'!B2:B,"Pedido de orçamento")'], ['Mensagens', '=COUNTIF(\'Contatos e pedidos\'!B2:B,"Contato")'],
    ['Aguardando resposta (Novo)', '=COUNTIF(\'Contatos e pedidos\'!C2:C,"Novo")']];
  kpi.forEach((k, i) => { a.getRange(4 + i, 1).setValue(k[0]); a.getRange(4 + i, 2).setFormula(formula_(ss, k[1])); });
  a.getRange(4, 1, kpi.length, 1).setFontWeight('bold');
  a.getRange(4, 2, kpi.length, 1).setFontSize(16).setFontWeight('bold').setFontColor(COR.verde).setHorizontalAlignment('center').setBackground(COR.verdeClaro);
  a.getRange(8, 2).setBackground(COR.vermelho).setFontColor('#7A1F1C');
  const titulo = (cel, txt) => a.getRange(cel).setValue(txt).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(COR.verde);
  titulo('A11', 'Visitas por área'); titulo('D11', 'Visitas por canal de divulgação');
  titulo('A26', 'Páginas mais abertas'); titulo('D26', 'Pedidos por produto');
  titulo('A44', 'O que as pessoas fizeram'); titulo('D44', 'Pedidos e mensagens por canal');
  a.getRange('A12').setFormula(formula_(ss, '=IFERROR(QUERY(UNIQUE({Eventos!B2:B,Eventos!D2:D}),"select Col2, count(Col1) where Col1 is not null group by Col2 order by count(Col1) desc label Col2 \'Área\', count(Col1) \'Visitas\'",0),"Sem dados ainda")'));
  a.getRange('D12').setFormula(formula_(ss, '=IFERROR(QUERY(UNIQUE({Eventos!B2:B,Eventos!H2:H}),"select Col2, count(Col1) where Col1 is not null group by Col2 order by count(Col1) desc label Col2 \'Canal\', count(Col1) \'Visitas\'",0),"Sem dados ainda")'));
  a.getRange('A27').setFormula(formula_(ss, '=IFERROR(QUERY(Eventos!E2:G,"select G, count(E) where E = \'Abriu página\' group by G order by count(E) desc label G \'Página\', count(E) \'Aberturas\'",0),"Sem dados ainda")'));
  a.getRange('D27').setFormula(formula_(ss, '=IFERROR(QUERY(\'Contatos e pedidos\'!B2:J,"select J, count(B) where B = \'Pedido de orçamento\' group by J order by count(B) desc label J \'Produto\', count(B) \'Pedidos\'",0),"Sem pedidos ainda")'));
  a.getRange('A45').setFormula(formula_(ss, '=IFERROR(QUERY(Eventos!E2:E,"select E, count(E) where E is not null group by E order by count(E) desc label E \'Ação\', count(E) \'Vezes\'",0),"Sem dados ainda")'));
  a.getRange('D45').setFormula(formula_(ss, '=IFERROR(QUERY(\'Contatos e pedidos\'!B2:O,"select O, count(B) where B is not null group by O order by count(B) desc label O \'Canal\', count(B) \'Formulários\'",0),"Sem formulários ainda")'));
  a.setHiddenGridlines(true);
  return a;
}

/** Rode uma vez para deixar a planilha organizada.
 *  Abas antigas com outro formato são renomeadas como "versão antiga", sem apagar nada. */
function arrumarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  abaContatos_(ss); abaEventos_(ss); abaCrm_(ss); abaResumo_(ss);
  ['Página1', 'Sheet1', 'Página 1'].forEach(n => { const v = ss.getSheetByName(n); if (v && v.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(v); });
  ss.setActiveSheet(ss.getSheetByName('Resumo'));
}

/** Resumo das últimas 24 horas, enviado por e-mail. */
function resumoDiario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const a = ss.getSheetByName('Eventos');
  if (!a || a.getLastRow() < 2) return;
  const limite = new Date(Date.now() - 24 * 3600 * 1000);
  const linhas = a.getRange(2, 1, a.getLastRow() - 1, 10).getValues().filter(l => l[0] instanceof Date && l[0] >= limite);
  if (!linhas.length) return;
  const vis = {}, pags = {}, areas = {}, canais = {};
  linhas.forEach(l => {
    const s = vis[l[1]] = vis[l[1]] || {nome: '', area: '', canal: '', paginas: [], sim: 0, form: [], inicio: l[0]};
    if (l[2]) s.nome = l[2]; if (l[3] && l[3] !== 'Não informada') s.area = l[3]; if (l[7]) s.canal = l[7];
    if (l[4] === 'Abriu página' && l[6] && s.paginas.indexOf(l[6]) < 0) { s.paginas.push(l[6]); pags[l[6]] = (pags[l[6]] || 0) + 1; }
    if (l[4] === 'Usou o simulador') s.sim++;
    if (l[4] === 'Enviou contato' || l[4] === 'Enviou pedido') s.form.push(l[4].replace('Enviou ', ''));
  });
  Object.values(vis).forEach(s => { const k = s.area || 'Não informada'; areas[k] = (areas[k] || 0) + 1; const c = s.canal || 'site direto'; canais[c] = (canais[c] || 0) + 1; });
  const lista = o => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => '<li>' + esc_(k) + ': <b>' + v + '</b></li>').join('');
  const cada = Object.values(vis).map(s => '<tr><td style="padding:6px 10px;border-bottom:1px solid #E3ECDD;white-space:nowrap">' + Utilities.formatDate(s.inicio, TZ, 'dd/MM HH:mm') + '<br><span style="color:#56665B">' + esc_(s.canal || 'site direto') + '</span></td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #E3ECDD">' + esc_(s.nome || 'Sem nome') + '<br><span style="color:#56665B">' + esc_(s.area || 'Área não informada') + '</span></td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #E3ECDD">' + esc_(s.paginas.join(', ') || '—') + (s.sim ? '<br>Simulou ' + s.sim + ' vez(es)' : '') + (s.form.length ? '<br><b style="color:#B8432D">Enviou ' + s.form.join(' e ') + '</b>' : '') + '</td></tr>').join('');
  const n = Object.keys(vis).length;
  const html = '<div style="font-family:Arial,sans-serif;max-width:640px"><div style="background:#1E4A33;color:#F2F5EF;padding:18px 22px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E5A928;font-weight:700">CascaViva · resumo do site</div><div style="font-size:22px;font-weight:700;margin-top:4px">' + n + ' visita(s) nas últimas 24 horas</div></div>' +
    '<div style="border:1px solid #E3ECDD;border-top:0;padding:16px 22px"><p style="font-weight:700;margin:0">Por área</p><ul>' + lista(areas) + '</ul><p style="font-weight:700;margin:0">Por canal</p><ul>' + lista(canais) + '</ul><p style="font-weight:700;margin:0">Páginas mais abertas</p><ul>' + (lista(pags) || '<li>nenhuma</li>') + '</ul>' +
    '<p style="font-weight:700;margin:0 0 8px">Cada visita</p><table style="width:100%;border-collapse:collapse;font-size:14px">' + cada + '</table></div>' +
    '<p style="color:#56665B;font-size:13px">Detalhes na planilha <a href="' + ss.getUrl() + '">' + esc_(ss.getName()) + '</a>.</p></div>';
  MailApp.sendEmail([EMAIL_EQUIPE].concat(OUTROS_AVISOS).join(','), 'CascaViva · resumo do site: ' + n + ' visita(s) em 24 h', 'Abra este e-mail num leitor que mostre HTML.', {htmlBody: html, name: 'CascaViva · site'});
}

/** Apaga da aba Eventos os registros de navegação mais antigos que MESES_GUARDAR_NAVEGACAO (LGPD). Contatos e pedidos não são apagados. */
function limparNavegacaoAntiga() {
  const a = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Eventos');
  if (!a || a.getLastRow() < 2) return;
  const limite = new Date(); limite.setMonth(limite.getMonth() - MESES_GUARDAR_NAVEGACAO);
  const datas = a.getRange(2, 1, a.getLastRow() - 1, 1).getValues();
  let n = 0; while (n < datas.length && datas[n][0] instanceof Date && datas[n][0] < limite) n++;
  if (n > 0) a.deleteRows(2, n);
}

/** Rode uma vez: liga o resumo diário (por volta das 8 h) e a limpeza mensal da navegação antiga. */
function ligarRotinas() {
  ScriptApp.getProjectTriggers().filter(t => ['resumoDiario', 'limparNavegacaoAntiga'].indexOf(t.getHandlerFunction()) >= 0).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resumoDiario').timeBased().everyDays(1).atHour(8).inTimezone(TZ).create();
  ScriptApp.newTrigger('limparNavegacaoAntiga').timeBased().onMonthDay(1).atHour(3).inTimezone(TZ).create();
}
function ligarResumoDiario() { ligarRotinas(); }
