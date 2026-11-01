(function(){
  function decodeAmount(v){
    let s=String(v??'').trim().replace(/[R$\s]/g,'');
    if(!s)return 0;
    if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
    else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
    const n=Number(s.replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:0;
  }
  function dateValue(v){
    const s=String(v??'').trim();if(!s)return '';
    let m=s.match(/^(\d{4})(\d{2})(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];
    m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }
  function parseOFX(text){
    const rows=[];const blocks=text.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi)||[];
    for(const b of blocks){
      const get=tag=>{const m=b.match(new RegExp('<'+tag+'>([^<\\r\\n]*)','i'));return m?m[1].trim():''};
      const amount=decodeAmount(get('TRNAMT'));const date=dateValue(get('DTPOSTED'));const name=get('NAME')||get('MEMO')||'Movimentação importada';
      if(date&&amount)rows.push({date,name,amount,fitid:get('FITID'),sourceFormat:'OFX'});
    }
    if(!rows.length)throw new Error('Não encontrei movimentações válidas no arquivo OFX.');
    return rows;
  }
  function csvRows(text,delimiter){
    const out=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(c==='"'){quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))out.push(row);row=[];cell=''}else cell+=c}
    row.push(cell.trim());if(row.some(x=>x!==''))out.push(row);return out;
  }
  function parseCSV(text){
    const first=text.split(/\r?\n/)[0]||'';const delimiter=[ ';',',','\t' ].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
    const data=csvRows(text.replace(/^\uFEFF/,''),delimiter);if(data.length<2)throw new Error('O CSV não contém linhas de dados.');
    const headers=data[0].map(x=>x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
    const find=terms=>headers.findIndex(h=>terms.some(t=>h.includes(t)));
    const di=find(['data','date','dt']);const ai=find(['valor','amount','value','montante','credito','debito']);const ni=find(['descricao','historico','description','memo','lancamento','nome']);
    if(di<0||ai<0)throw new Error('Não identifiquei as colunas de data e valor. Use um CSV com cabeçalhos como Data, Descrição e Valor.');
    return data.slice(1).map(r=>({date:dateValue(r[di]),name:(ni>=0?r[ni]:'')||'Movimentação importada',amount:decodeAmount(r[ai]),sourceFormat:'CSV'})).filter(x=>x.date&&x.amount);
  }
  window.FFImport={async parse(file){const text=await file.text();const ext=(file.name.split('.').pop()||'').toLowerCase();if(ext==='ofx'||/OFXHEADER|<OFX>/i.test(text))return parseOFX(text);if(ext==='csv')return parseCSV(text);throw new Error('Formato não reconhecido. Selecione um arquivo OFX ou CSV.')}};
})();