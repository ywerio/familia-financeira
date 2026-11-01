(function(){
function amount(v){let s=String(v??'').trim().replace(/[R$\s]/g,'');if(!s)return NaN;const neg=/^\(.*\)$/.test(s);s=s.replace(/[()]/g,'').replace(/[^\d,.\-+]/g,'');if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?(neg?-Math.abs(n):n):NaN}
function date(v){const s=String(v??'').trim();let m=s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');const d=new Date(s);return Number.isNaN(d.getTime())?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function ofx(t){t=String(t||'').replace(/^\uFEFF/,'').replace(/\0/g,'').replace(/\r/g,'');const upper=t.toUpperCase(),rows=[];let cursor=0;while(true){const start=upper.indexOf('<STMTTRN',cursor);if(start<0)break;const openEnd=upper.indexOf('>',start);if(openEnd<0)break;let next=upper.indexOf('<STMTTRN',openEnd+1),bankEnd=upper.indexOf('</BANKTRANLIST>',openEnd+1);if(next<0||(bankEnd>=0&&bankEnd<next))next=bankEnd;if(next<0)next=t.length;const field=k=>{const p=upper.indexOf('<'+k,openEnd+1);if(p<0||p>=next)return'';const gt=upper.indexOf('>',p);if(gt<0||gt>=next)return'';const end=upper.indexOf('<',gt+1);return t.slice(gt+1,end<0||end>next?next:end).trim().replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')};const v=amount(field('TRNAMT').replace(/,/g,'.')),d=date(field('DTPOSTED'));if(d&&Number.isFinite(v)&&v!==0)rows.push({date:d,name:field('NAME')||field('MEMO')||field('PAYEE')||'Movimentação importada',amount:v,fitid:field('FITID'),sourceFormat:'OFX'});cursor=Math.max(next,openEnd+1);if(bankEnd>=0&&cursor>=bankEnd)break}if(!rows.length)throw Error('O arquivo foi lido, mas não encontrei lançamentos OFX válidos. Confira se o extrato contém movimentações.');return rows}
function rowsOf(t,del){const out=[];let row=[],cell='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'&&q&&t[i+1]==='"'){cell+='"';i++}else if(c==='"')q=!q;else if(c===del&&!q){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))out.push(row);row=[];cell=''}else cell+=c}row.push(cell.trim());if(row.some(x=>x!==''))out.push(row);return out}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function csv(t){t=t.replace(/^\uFEFF/,'').replace(/\0/g,'');const lines=t.split(/\r?\n/).filter(x=>x.trim());if(!lines.length)throw Error('O arquivo CSV está vazio.');const ds=[';',',','\t'];const del=ds.map(d=>({d,n:lines.slice(0,12).reduce((n,l)=>n+l.split(d).length-1,0)})).sort((a,b)=>b.n-a.n)[0].d;const data=rowsOf(t,del);let hi=-1,hs=[];for(let i=0;i<Math.min(20,data.length);i++){const h=data[i].map(norm);if(h.some(x=>/\bdata\b|\bdate\b/.test(x))&&h.some(x=>/valor|amount|value|credito|debito|credit|debit/.test(x))){hi=i;hs=h;break}}if(hi<0)throw Error('Não localizei o cabeçalho do extrato. O CSV precisa ter colunas de data e valor (ou crédito/débito).');const find=ps=>hs.findIndex(h=>ps.some(p=>p.test(h)));const di=find([/\bdata\b/,/\bdate\b/]),ni=find([/descricao/,/historico/,/lancamento/,/description/,/\bmemo\b/,/detalhe/,/\bnome/]),ai=find([/^valor$/, /valor.*(r|reais)/,/\bamount\b/,/\bvalue\b/,/^montante$/]),ci=find([/^credito$/,/\bcredit\b/,/valor credito/]),de=find([/^debito$/,/\bdebit\b/,/valor debito/]);if(di<0)throw Error('Não identifiquei a coluna de data no CSV.');if(ai<0&&ci<0&&de<0)throw Error('Não identifiquei a coluna de valor, crédito ou débito no CSV.');const out=[];for(const r of data.slice(hi+1)){const d=date(r[di]);if(!d)continue;let a=ai>=0?amount(r[ai]):(Number.isFinite(amount(r[ci]))?Math.abs(amount(r[ci])):0)-(Number.isFinite(amount(r[de]))?Math.abs(amount(r[de])):0);if(Number.isFinite(a)&&a!==0)out.push({date:d,name:(ni>=0?r[ni]:'')||'Movimentação importada',amount:a,sourceFormat:'CSV'})}if(!out.length)throw Error('Encontrei o cabeçalho, mas não encontrei movimentações válidas com data e valor.');return out}
async function read(f){if(typeof FileReader==='undefined'){if(typeof f.text==='function')return await f.text();throw Error('Este navegador não permite ler arquivos.')}return await new Promise((resolve,reject)=>{const reader=new FileReader(),timer=setTimeout(()=>{try{reader.abort()}catch(e){}reject(Error('O Android não concluiu a leitura em 15 segundos. Feche o seletor de arquivos, baixe o extrato novamente e tente outra vez.'))},15000);reader.onload=()=>{clearTimeout(timer);resolve(String(reader.result||''))};reader.onerror=()=>{clearTimeout(timer);reject(Error('O Android apresentou uma falha ao abrir o arquivo.'))};reader.onabort=()=>{clearTimeout(timer);reject(Error('A leitura do arquivo foi interrompida.'))};try{reader.readAsText(f)}catch(e){clearTimeout(timer);reject(e)}})}

function textoChave(nome) {
  return String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim().toLowerCase();
}
function chaveDuplicidade(item) {
  return [item.date, textoChave(item.name || item.description), Math.abs(Number(item.amount) || 0).toFixed(2)].join('|');
}
function naturezaDe(item) { return Number(item.amount) < 0 ? 'despesa' : 'renda'; }
function novoLancamento(contador, dateValue, amountValue, nome) {
  const name = String(nome || '').replace(/\s+/g, ' ').trim();
  const valor = Math.round(Number(amountValue) * 100) / 100;
  const base = chaveDuplicidade({ date: dateValue, name, amount: valor });
  const k = base + '|' + (valor < 0 ? 'despesa' : 'renda');
  contador[k] = (contador[k] || 0) + 1;
  return { date: dateValue, amount: valor, name, fitid: k + '|' + contador[k] };
}
function filtrarNovos(importados, db) {
  const base = {
    renda: Array.isArray(db && db.incomes) ? db.incomes : [],
    despesa: Array.isArray(db && db.expenses) ? db.expenses : []
  };
  const indice = {};
  for (const nat of ['renda', 'despesa']) {
    indice[nat] = { fitids: new Set(), contagem: {}, vistos: {} };
    for (const e of base[nat]) {
      if (e && e.fitid) indice[nat].fitids.add(String(e.fitid));
      const k = chaveDuplicidade(e || {});
      indice[nat].contagem[k] = (indice[nat].contagem[k] || 0) + 1;
    }
  }
  const novos = [], duplicados = [];
  for (const it of (Array.isArray(importados) ? importados : [])) {
    const ix = indice[naturezaDe(it)];
    const k = chaveDuplicidade(it);
    ix.vistos[k] = (ix.vistos[k] || 0) + 1;
    const fitid = it.fitid == null ? '' : String(it.fitid);
    const jaExiste = (fitid && ix.fitids.has(fitid)) || (ix.contagem[k] || 0) >= ix.vistos[k];
    if (jaExiste) {
      duplicados.push(it);
    } else {
      novos.push(it);
      if (fitid) ix.fitids.add(fitid);
      ix.contagem[k] = (ix.contagem[k] || 0) + 1;
    }
  }
  return { novos, duplicados };
}

async function filtrarNovosAsync(importados, db, onProgress) {
  const base = {
    renda: Array.isArray(db && db.incomes) ? db.incomes : [],
    despesa: Array.isArray(db && db.expenses) ? db.expenses : []
  };
  const indice = {
    renda: { fitids: new Set(), contagem: Object.create(null), vistos: Object.create(null) },
    despesa: { fitids: new Set(), contagem: Object.create(null), vistos: Object.create(null) }
  };
  const lote = 100;
  const existentes = base.renda.length + base.despesa.length;
  let lidos = 0;
  for (const nat of ['renda', 'despesa']) {
    const lista = base[nat];
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i] || {};
      if (e.fitid) indice[nat].fitids.add(String(e.fitid));
      const k = chaveDuplicidade(e);
      indice[nat].contagem[k] = (indice[nat].contagem[k] || 0) + 1;
      lidos++;
      if (lidos % lote === 0) {
        if (typeof onProgress === 'function') onProgress({ etapa: 'locais', done: lidos, total: existentes });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  if (typeof onProgress === 'function') onProgress({ etapa: 'locais', done: existentes, total: existentes });
  const novos = [], duplicados = [];
  const listaImportada = Array.isArray(importados) ? importados : [];
  for (let i = 0; i < listaImportada.length; i++) {
    const it = listaImportada[i];
    const nat = naturezaDe(it);
    const ix = indice[nat];
    const k = chaveDuplicidade(it);
    ix.vistos[k] = (ix.vistos[k] || 0) + 1;
    const fitid = it.fitid == null ? '' : String(it.fitid);
    const jaExiste = (fitid && ix.fitids.has(fitid)) || (ix.contagem[k] || 0) >= ix.vistos[k];
    if (jaExiste) duplicados.push(it);
    else {
      novos.push(it);
      if (fitid) ix.fitids.add(fitid);
      ix.contagem[k] = (ix.contagem[k] || 0) + 1;
    }
    if ((i + 1) % lote === 0) {
      if (typeof onProgress === 'function') onProgress({ etapa: 'arquivo', done: i + 1, total: listaImportada.length });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  if (typeof onProgress === 'function') onProgress({ etapa: 'arquivo', done: listaImportada.length, total: listaImportada.length });
  return { novos, duplicados };
}
function separarParaGravacao(novos) {
  const rendas = [], despesas = [];
  for (const it of (novos || [])) {
    const reg = { date: it.date, name: it.name || it.description || 'Movimentação importada', amount: Math.abs(Number(it.amount) || 0), fitid: it.fitid || '', sourceFormat: it.sourceFormat || '' };
    (Number(it.amount) < 0 ? despesas : rendas).push(reg);
  }
  return { rendas, despesas };
}
async function parseCompat(f, onStatus, opcoes) {
  if (!f) throw Error('Selecione um arquivo antes de analisar.');
  if (typeof onStatus === 'function') onStatus({ etapa: 'leitura', mensagem: 'Abrindo o arquivo...' });
  const t = await read(f);
  if (!t.trim()) throw Error('O arquivo foi aberto, mas está vazio ou não pôde ser decodificado.');
  if (typeof onStatus === 'function') onStatus({ etapa: 'analise', mensagem: 'Identificando lançamentos...' });
  const ext = (String(f.name || '').split('.').pop() || '').toLowerCase();
  let result;
  if (ext === 'ofx' || /OFXHEADER|<OFX>|<STMTTRN/i.test(t)) result = ofx(t);
  else if (ext === 'csv' || t.includes(';') || t.includes('\\t')) result = csv(t);
  else throw Error('Formato não reconhecido. Selecione um arquivo .ofx ou .csv.');
  const contador = {};
  result = result.map(x => {
    const item = { ...x, name: String(x.name || x.description || 'Movimentação importada').replace(/\s+/g, ' ').trim() };
    if (!item.fitid) item.fitid = novoLancamento(contador, item.date, item.amount, item.name).fitid;
    return item;
  });
  if (typeof onStatus === 'function') onStatus({ etapa: 'concluida', total: result.length, mensagem: result.length + ' lançamento(s) identificados.' });
  return result;
}
window.FFImport = {
  parse: parseCompat,
  analisar: parseCompat,
  resumir: function(itens) {
    const rows = Array.isArray(itens) ? itens : [];
    return { quantidade: rows.length, rendas: rows.filter(x => Number(x.amount) > 0).length, despesas: rows.filter(x => Number(x.amount) < 0).length,
      totalRendas: rows.reduce((s,x) => s + (Number(x.amount) > 0 ? Number(x.amount) : 0), 0),
      totalDespesas: rows.reduce((s,x) => s + (Number(x.amount) < 0 ? Math.abs(Number(x.amount)) : 0), 0) };
  },
  chaveDuplicidade: chaveDuplicidade,
  filtrarNovos: filtrarNovos,
  filtrarNovosAsync: filtrarNovosAsync,
  separarParaGravacao: separarParaGravacao
};
})();