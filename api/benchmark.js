// Cached server-side proxy for NSE Indices' public historical TRI endpoint.
// The endpoint is used by NSE Indices' Historical Data Reports page but is not a documented
// commercial API. NSE's web interface limits TRI requests to approximately 365 days, so
// long windows are retrieved in date chunks. Fail closed; never substitute a price index.
const ALLOWED = new Set([
  "NIFTY 50",
  "NIFTY 100",
  "NIFTY 500",
  "NIFTY NEXT 50",
  "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250"
]);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fromIso(iso) {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}
function toIso(d) { return d.toISOString().slice(0,10); }
function fmtDate(d) {
  return String(d.getUTCDate()).padStart(2,"0") + "-" + MONTHS[d.getUTCMonth()] + "-" + d.getUTCFullYear();
}
function addDays(d,n) { const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x; }
function parseRows(raw) {
  let rows = raw && raw.d;
  if (typeof rows === "string") rows = JSON.parse(rows || "[]");
  if (!Array.isArray(rows)) throw new Error("NSE returned an unexpected TRI response shape");
  return rows.map(row => {
    const rawDate=String(row.Date||row.date||row.HistoricalDate||"").trim();
    let date=null;
    if (/^\\d{4}-\\d{2}-\\d{2}/.test(rawDate)) date=rawDate.slice(0,10);
    else {
      const p=rawDate.split(/\\s+/);
      if(p.length===3) {
        const month=MONTHS.indexOf(p[1])+1;
        if(month>0)date=p[2]+"-"+String(month).padStart(2,"0")+"-"+p[0].padStart(2,"0");
      }
    }
    const rawValue=row.TotalReturnsIndex??row["Total Returns Index"]??row.TRI??row.value;
    const value=Number(String(rawValue??"").replace(/,/g,""));
    return date&&Number.isFinite(value)&&value>0?{date,value}:null;
  }).filter(Boolean);
}
async function fetchChunk(index,start,end) {
  const cinfo="{'name':'"+index+"','startDate':'"+fmtDate(start)+"','endDate':'"+fmtDate(end)+"','indexName':'"+index+"'}";
  const response=await fetch("https://www.niftyindices.com/Backpage.aspx/getTotalReturnIndexString",{
    method:"POST",
    headers:{
      "Content-Type":"application/json; charset=UTF-8",
      "Accept":"application/json, text/javascript, */*; q=0.01",
      "Accept-Language":"en-US,en;q=0.9",
      "Origin":"https://www.niftyindices.com",
      "X-Requested-With":"XMLHttpRequest",
      "Referer":"https://www.niftyindices.com/reports/historical-data",
      "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
    },
    body:JSON.stringify({cinfo}),
    signal:AbortSignal.timeout(18000)
  });
  const text=await response.text();
  if(!response.ok)throw new Error("NSE returned HTTP "+response.status);
  let raw;
  try{raw=JSON.parse(text)}catch(e){
    const hint=text.trim().slice(0,100).replace(/\\s+/g," ");
    throw new Error("NSE returned HTML or an unrecognised response for "+toIso(start)+" to "+toIso(end)+" ("+hint+")");
  }
  return parseRows(raw);
}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","public, s-maxage=21600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  const index=String(req.query.index||"").trim().toUpperCase();
  const start=String(req.query.start||"").trim();
  const end=String(req.query.end||"").trim();
  if(!ALLOWED.has(index))return res.status(400).json({error:"Unsupported benchmark. No proxy substitution is permitted."});
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(start)||!/^\\d{4}-\\d{2}-\\d{2}$/.test(end)||start>end)
    return res.status(400).json({error:"Dates must use YYYY-MM-DD and start must not exceed end."});
  const startDate=fromIso(start),endDate=fromIso(end);
  if((endDate-startDate)/86400000>12000)return res.status(400).json({error:"Requested date span exceeds 12,000 days."});
  try{
    const chunks=[];
    let cursor=startDate;
    while(cursor<=endDate){
      const chunkEnd=new Date(Math.min(endDate.getTime(),addDays(cursor,364).getTime()));
      chunks.push({start:new Date(cursor),end:chunkEnd});
      cursor=addDays(chunkEnd,1);
    }
    // Small concurrency protects the upstream endpoint while avoiding long serial waits.
    const collected=[];
    for(let i=0;i<chunks.length;i+=3){
      const batch=chunks.slice(i,i+3);
      const batchRows=await Promise.all(batch.map(c=>fetchChunk(index,c.start,c.end)));
      batchRows.forEach(rows=>collected.push(...rows));
    }
    const dedup=new Map(collected.map(x=>[x.date,x.value]));
    const data=[...dedup.entries()].map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date));
    if(data.length<30)return res.status(404).json({error:"Fewer than 30 usable TRI observations were returned for "+index+"."});
    return res.status(200).json({
      source:"NSE Indices historical Total Returns Index",
      sourceUrl:"https://www.niftyindices.com/reports/historical-data",
      index:index+" TRI",
      retrievedAt:new Date().toISOString(),
      count:data.length,
      firstDate:data[0].date,
      lastDate:data[data.length-1].date,
      chunks:chunks.length,
      data
    });
  }catch(error){
    return res.status(502).json({
      error:"Automatic TRI retrieval failed: "+(error&&error.message?error.message:"upstream request failed"),
      sourceUrl:"https://www.niftyindices.com/reports/historical-data",
      note:"No price-index or substitute benchmark was used."
    });
  }
};
