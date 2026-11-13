// Fetch AMFI's public monthly TER workbook and return the selected scheme's plan TER.
// XLSX is parsed in-memory using Node's built-in zlib; no user upload or extra dependency.
const zlib=require("node:zlib");
const BASE="https://www.amfiindia.com/api/populate-te-rdata-revised";
function norm(v){
 return String(v||"").toLowerCase().replace(/&/g,"and").replace(/\s+/g," ")
  .replace(/\b(direct|regular|growth|dividend|idcw|bonus|payout|reinvestment|retail|institutional|plan|option|monthly|quarterly|half yearly|annual)\b/gi," ")
  .replace(/\b(and|of|the|by|in|for|with)\b/gi," ")
  .replace(/[^a-z0-9]/g,"").trim();
}
function xmlDecode(s){
 return String(s||"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}
function unzipEntries(buf){
 const sig=0x06054b50;
 let eocd=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-65558);i--){
  if(buf.readUInt32LE(i)===sig){eocd=i;break}
 }
 if(eocd<0)throw new Error("AMFI TER response is not a valid XLSX ZIP workbook");
 const count=buf.readUInt16LE(eocd+10),cdOffset=buf.readUInt32LE(eocd+16),files={};
 let p=cdOffset;
 for(let i=0;i<count;i++){
  if(buf.readUInt32LE(p)!==0x02014b50)throw new Error("Invalid XLSX central directory");
  const method=buf.readUInt16LE(p+10),compressed=buf.readUInt32LE(p+20);
  const nameLen=buf.readUInt16LE(p+28),extraLen=buf.readUInt16LE(p+30),commentLen=buf.readUInt16LE(p+32),localOffset=buf.readUInt32LE(p+42);
  const name=buf.toString("utf8",p+46,p+46+nameLen);
  const localNameLen=buf.readUInt16LE(localOffset+26),localExtraLen=buf.readUInt16LE(localOffset+28);
  const dataStart=localOffset+30+localNameLen+localExtraLen;
  const compressedData=buf.subarray(dataStart,dataStart+compressed);
  let data;
  if(method===0)data=compressedData;
  else if(method===8)data=zlib.inflateRawSync(compressedData);
  else throw new Error("Unsupported XLSX compression method "+method);
  files[name]=data.toString("utf8");
  p+=46+nameLen+extraLen+commentLen;
 }
 return files;
}
function colNumber(ref){
 const letters=String(ref||"").match(/^[A-Z]+/i)?.[0]?.toUpperCase()||"";
 let n=0;for(const ch of letters)n=n*26+(ch.charCodeAt(0)-64);
 return n-1;
}
function parseXlsx(buf){
 const files=unzipEntries(buf);
 const sharedXml=files["xl/sharedStrings.xml"]||"";
 const shared=[...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>{
  return [...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("");
 });
 const sheet=files["xl/worksheets/sheet1.xml"]||Object.entries(files).find(([k])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))?.[1];
 if(!sheet)throw new Error("AMFI TER workbook has no worksheet XML");
 const rows=[...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(m=>{
  const cells=[];
  for(const cell of m[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)){
   const attrs=cell[1],inner=cell[2]||"";
   const ref=attrs.match(/\br="([^"]+)"/)?.[1];
   const index=colNumber(ref);
   const type=attrs.match(/\bt="([^"]+)"/)?.[1]||"";
   let value="";
   if(type==="inlineStr"){
    value=[...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("");
   }else{
    const raw=inner.match(/<v>([\s\S]*?)<\/v>/)?.[1]??"";
    value=type==="s"?(shared[Number(raw)]??""):xmlDecode(raw);
   }
   if(index>=0)cells[index]=value;
  }
  return cells;
 });
 return rows;
}
function parseDate(v){
 if(v instanceof Date)return v.toISOString().slice(0,10);
 const s=String(v||"").trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const dmy=s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,}|[0-9]{1,2})[-/ ]([0-9]{4})$/);
 if(dmy){
  const months={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  const m=Number(dmy[2])?String(Number(dmy[2])).padStart(2,"0"):months[dmy[2].slice(0,3).toLowerCase()];
  if(m)return dmy[3]+"-"+m+"-"+dmy[1].padStart(2,"0");
 }
 if(/^\d+(\.\d+)?$/.test(s)){
  const d=new Date(Date.UTC(1899,11,30)+Number(s)*86400000);
  if(!Number.isNaN(d.getTime()))return d.toISOString().slice(0,10);
 }
 return null;
}
function monthParam(d){return String(d.getMonth()+1).padStart(2,"0")+"-"+d.getFullYear()}
async function downloadMonth(month){
 const url=BASE+"?MF_ID=All&Month="+encodeURIComponent(month)+"&strCat=-1&strType=-1&excel=true";
 const response=await fetch(url,{headers:{
  "User-Agent":"Mozilla/5.0 (compatible; FundLensResearch/1.0)",
  "Accept":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*",
  "Referer":"https://www.amfiindia.com/polling/amfi/total-expense-ratio"
 },signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error("AMFI TER download returned HTTP "+response.status);
 const buf=Buffer.from(await response.arrayBuffer());
 if(buf.length<10000||buf.readUInt32LE(0)!==0x04034b50)throw new Error("AMFI TER response was not an XLSX workbook");
 return buf;
}
function findRecord(rows,schemeName){
 if(!rows.length)throw new Error("AMFI TER workbook is empty");
 const headers=rows[0].map(x=>String(x||"").trim().toLowerCase());
 const find=(...keys)=>headers.findIndex(h=>keys.includes(h));
 const nameCol=find("scheme name"),dateCol=find("ter date");
 const directCol=find("direct plan - total ter (%)"),regularCol=find("regular plan - total ter (%)");
 const codeCol=find("nsdl scheme code");
 if(nameCol<0||dateCol<0||directCol<0||regularCol<0)throw new Error("AMFI TER workbook columns changed; expected Scheme Name, TER Date, Direct Plan - Total TER (%) and Regular Plan - Total TER (%)");
 const key=norm(schemeName);
 const records=[];
 for(const row of rows.slice(1)){
  const name=String(row[nameCol]||"").trim();
  if(!name)continue;
  const directRaw=String(row[directCol]??"").trim(),regularRaw=String(row[regularCol]??"").trim();
  const direct=directRaw===""?NaN:Number(directRaw.replace(/,/g,""));
  const regular=regularRaw===""?NaN:Number(regularRaw.replace(/,/g,""));
  const date=parseDate(row[dateCol]);
  if(!date)continue;
  records.push({name,date,nsdlSchemeCode:codeCol>=0?String(row[codeCol]||""):null,directTer:Number.isFinite(direct)?direct:null,regularTer:Number.isFinite(regular)?regular:null});
 }
 const matches=records.filter(x=>norm(x.name)===key);
 const list=matches.length?matches:records.filter(x=>norm(x.name).includes(key)||key.includes(norm(x.name)));
 if(!list.length)return null;
 return list.sort((a,b)=>b.date.localeCompare(a.date))[0];
}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","public, s-maxage=21600, stale-while-revalidate=86400");
 res.setHeader("Access-Control-Allow-Origin","*");
 if(req.method==="OPTIONS")return res.status(204).end();
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 const schemeName=String(req.query.name||"").trim();
 const plan=String(req.query.plan||"direct").toLowerCase()==="regular"?"regular":"direct";
 if(schemeName.length<4)return res.status(400).json({error:"Scheme name is required."});
 const now=new Date(),current=new Date(now.getFullYear(),now.getMonth(),1),previous=new Date(now.getFullYear(),now.getMonth()-1,1);
 const errors=[];
 for(const month of [current,previous]){
  try{
   const buf=await downloadMonth(monthParam(month));
   const rows=parseXlsx(buf);
   const match=findRecord(rows,schemeName);
   if(!match)continue;
   const ter=plan==="direct"?match.directTer:match.regularTer;
   if(!Number.isFinite(ter))return res.status(404).json({error:"AMFI TER record found but the selected plan has no reported TER.",schemeName:match.name,terDate:match.date});
   return res.status(200).json({
    source:"AMFI Total Expense Ratio workbook",
    sourceUrl:"https://www.amfiindia.com/ter",
    retrievedAt:new Date().toISOString(),
    schemeName:match.name,
    nsdlSchemeCode:match.nsdlSchemeCode,
    plan,
    terPct:ter,
    terDate:match.date
   });
  }catch(error){errors.push(monthParam(month)+": "+error.message)}
 }
 return res.status(502).json({error:"Automatic AMFI TER lookup failed: "+errors.join("; "),sourceUrl:"https://www.amfiindia.com/ter"});
};
