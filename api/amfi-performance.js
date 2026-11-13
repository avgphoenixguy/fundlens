// Automatic scheme-level disclosures from AMFI's Fund Performance API.
// Returns AMFI-published benchmark, AUM, Riskometer and official IR snapshots.
// Cached at the edge. No investor file upload or private account data is required.
const BASE="https://www.amfiindia.com/gateway/pollingsebi/api/amfi";
const HEADERS={
  "Content-Type":"application/json",
  "User-Agent":"Mozilla/5.0 (compatible; FundLensResearch/1.0)",
  "Referer":"https://www.amfiindia.com/polling/amfi/fund-performance",
  "Origin":"https://www.amfiindia.com",
  "Accept":"application/json, text/plain, */*"
};
const CATEGORIES=[1,2,3,4,5];
const MATURITY_TYPE=1;
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function amfiDate(d){return String(d.getDate()).padStart(2,"0")+"-"+MONTHS[d.getMonth()]+"-"+d.getFullYear()}
function norm(s){
 return String(s||"").toLowerCase().replace(/&/g," and ").replace(/\([^)]*\)/g," ")
  .replace(/\s*-\s*(direct|regular|retail|growth|idcw|dividend|bonus|payout|reinvest(?:ment)?|daily|weekly|fortnightly|monthly|quarterly|annual|flexi|income\s+distribution)\b[\s\S]*$/i,"")
  .replace(/\b(direct|regular|retail)\s*plan\b/gi," ")
  .replace(/\b(growth|idcw|dividend|bonus|payout|reinvestment|fund)\b/gi," ")
  .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
function tokenScore(a,b){
 const A=new Set(norm(a).split(" ").filter(x=>x.length>2));
 const B=new Set(norm(b).split(" ").filter(x=>x.length>2));
 if(!A.size||!B.size)return 0;
 let n=0;for(const x of A)if(B.has(x))n++;
 return n/Math.max(A.size,B.size);
}
async function post(path,body){
 const r=await fetch(BASE+path,{method:"POST",headers:HEADERS,body:JSON.stringify(body),signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw new Error("AMFI returned HTTP "+r.status+" for "+path);
 const j=await r.json();
 return j&&Array.isArray(j.data)?j.data:[];
}
function classifyCategory(text){
 const s=String(text||"").toLowerCase();
 if(/equity|large cap|mid cap|small cap|flexi cap|multi cap|value|contra|focused|elss|sectoral|thematic/.test(s))return 1;
 if(/debt|liquid|money market|gilt|duration|credit risk|corporate bond|overnight|floater|short duration|medium duration|long duration/.test(s))return 2;
 if(/hybrid|balanced advantage|aggressive hybrid|conservative hybrid|multi asset|equity savings|arbitrage/.test(s))return 3;
 if(/solution|retirement|children/.test(s))return 4;
 if(/index|etf|fund of fund|fof|other/.test(s))return 5;
 return null;
}
function planSuffix(name,plan){
 const s=String(name||"").toLowerCase();
 if(plan==="direct"&&/regular/.test(s))return false;
 if(plan==="regular"&&/direct/.test(s))return false;
 return true;
}
async function categoryRecords(categoryId,categoryLabel,schemeName,plan){
 const subs=await post("/getsubcategory",{category:categoryId});
 if(!subs.length)return [];
 const candidates=subs.map(x=>({id:x.id??x.subCategoryId??x.subcategoryId,name:x.name??x.subCategory??x.subCategoryName??""}))
  .filter(x=>x.id!=null)
  .map(x=>({...x,score:tokenScore(categoryLabel,x.name)}))
  .sort((a,b)=>b.score-a.score);
 // Scheme category metadata should identify one AMFI subcategory; try only the three closest
 // labels if the category wording differs between MFAPI and AMFI.
 const targets=candidates.slice(0,3);
 for(let back=0;back<=7;back++){
  const d=new Date();d.setDate(d.getDate()-back);
  const reportDate=amfiDate(d);
  for(const sub of targets){
   const rows=await post("/fundperformance",{maturityType:MATURITY_TYPE,category:categoryId,subCategory:sub.id,mfid:0,reportDate});
   if(rows.length){
    const exact=rows.find(x=>norm(x.schemeName)===norm(schemeName)&&planSuffix(x.schemeName,plan));
    if(exact)return [{...exact,_amfiCategory:categoryId,_amfiReportDate:reportDate}];
    const ranked=rows.filter(x=>x.schemeName&&planSuffix(x.schemeName,plan))
      .map(x=>({record:x,score:tokenScore(schemeName,x.schemeName)}))
      .sort((x,y)=>y.score-x.score);
    if((ranked[0]?.score||0)>=0.8)return [{...ranked[0].record,_amfiCategory:categoryId,_amfiReportDate:reportDate}];
   }
  }
 }
 return [];
}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","public, s-maxage=21600, stale-while-revalidate=86400");
 res.setHeader("Access-Control-Allow-Origin","*");
 res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
 if(req.method==="OPTIONS")return res.status(204).end();
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 const schemeName=String(req.query.name||"").trim();
 const schemeCategory=String(req.query.schemeCategory||"").trim();
 const plan=String(req.query.plan||"direct").toLowerCase()==="regular"?"regular":"direct";
 if(schemeName.length<4)return res.status(400).json({error:"Scheme name is required."});
 const categoryId=Number(req.query.category)||classifyCategory(schemeCategory+" "+schemeName);
 try{
  const categories=categoryId?[categoryId]:CATEGORIES;
  const arrays=await Promise.all(categories.map(id=>categoryRecords(id,schemeCategory,schemeName,plan)));
  const records=arrays.flat();
  if(!records.length)return res.status(404).json({error:"AMFI Fund Performance API returned no records for the selected category."});
  const eligible=records.filter(r=>r.schemeName&&planSuffix(r.schemeName,plan));
  const exact=eligible.find(r=>norm(r.schemeName)===norm(schemeName));
  const ranked=eligible.map(r=>({record:r,score:tokenScore(schemeName,r.schemeName)})).sort((a,b)=>b.score-a.score);
  const match=exact||((ranked[0]?.score||0)>=0.8?ranked[0].record:null);
  if(!match)return res.status(404).json({error:"No sufficiently close AMFI scheme-name match was found. No scheme data was guessed.",searched:schemeName,recordsChecked:eligible.length});
  const num=v=>{const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:null};
  return res.status(200).json({
   source:"AMFI Fund Performance API",
   sourceUrl:"https://www.amfiindia.com/polling/amfi/fund-performance",
   retrievedAt:new Date().toISOString(),
   reportDate:match._amfiReportDate,
   schemeName:match.schemeName,
   plan,
   benchmark:match.benchmark||null,
   aumCr:num(match.dailyAUM),
   navDate:match.navDate||null,
   navDirect:num(match.navDirect),
   navRegular:num(match.navRegular),
   riskometer:match.riskometerScheme||null,
   riskometerBenchmark:match.riskometerBenchmark||null,
   informationRatio:{
    "1Y":num(plan==="direct"?match.ir1YrDirect:match.ir1YrRegular),
    "3Y":num(plan==="direct"?match.ir3YrDirect:match.ir3YrRegular),
    "5Y":num(plan==="direct"?match.ir5YrDirect:match.ir5YrRegular),
    "10Y":num(plan==="direct"?match.ir10YrDirect:match.ir10YrRegular)
   }
  });
 }catch(error){
  return res.status(502).json({error:"Automatic AMFI Fund Performance retrieval failed: "+(error.message||"upstream error"),sourceUrl:"https://www.amfiindia.com/polling/amfi/fund-performance"});
 }
};
