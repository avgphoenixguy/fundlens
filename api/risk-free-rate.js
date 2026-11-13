// Fetch a long-dated Indian Government Security yield proxy from the RBI Current Rates page.
const FALLBACK = {
  rate: 7.2178,
  security: "6.94% GS 2036",
  asOf: "2026-11-11",
  source: "Reserve Bank of India Current Rates",
  sourceUrl: "https://www.rbi.org.in/",
  isFallback: true
};
function decode(s) {
  return String(s || "").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&")
    .replace(/&#39;|&#x27;/gi,"'").replace(/&quot;/gi,'"').replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
}
function parseRbi(html) {
  const plain = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/\s+/g," ");
  const marker=plain.search(/Government Securities Market/i);
  if(marker<0)throw new Error("RBI Government Securities Market table not found");
  const block=plain.slice(marker,marker+1200);
  // RBI Current Rates reports this exact benchmark row; select its quoted yield.
  const row=block.match(/6\.94\s*%?\s*GS\s*2036\s*\|\s*:\s*([0-9]+\.[0-9]{2,4})\s*%?/i)
    || block.match(/6\.94\s*%?\s*GS\s*2036\s+[:|]\s*([0-9]+\.[0-9]{2,4})\s*%?/i);
  if(!row)throw new Error("RBI 6.94% GS 2036 row not found in Current Rates page");
  const rate=Number(row[1]);
  if(!Number.isFinite(rate)||rate<3||rate>15)throw new Error("RBI 10-year proxy failed rate validation");
  const dateMatch=block.match(/#\s*as on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  if(!dateMatch)throw new Error("RBI Government Securities as-of date not found");
  const parsedDate=new Date(dateMatch[1]);
  if(Number.isNaN(parsedDate.getTime()))throw new Error("RBI observation date is invalid");
  return {
    security:"6.94% GS 2036",
    maturity:2036,
    rate,
    asOf:parsedDate.toISOString().slice(0,10),
    source:"Reserve Bank of India Current Rates",
    sourceUrl:"https://www.rbi.org.in/?id=10395",
    isFallback:false
  };
}
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","public, s-maxage=3600, stale-while-revalidate=21600");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  res.setHeader("Access-Control-Allow-Origin","*");
  if (req.method !== "GET") return res.status(405).json({error:"Method not allowed"});
  try {
    const response = await fetch("https://www.rbi.org.in/?id=10395", {headers:{"User-Agent":"Mozilla/5.0 FundLens research prototype","Accept":"text/html"},signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error("RBI returned HTTP " + response.status);
    const parsed = parseRbi(await response.text());
    return res.status(200).json({...parsed,rateType:"Long-dated Government of India security yield proxy",assumptionNote:"Used as a domestic sovereign risk-free proxy for the selected daily NAV sample. A 10-year yield is not a maturity-matched overnight risk-free rate."});
  } catch(error) {
    return res.status(200).json({...FALLBACK,rateType:"Long-dated Government of India security yield proxy",assumptionNote:"RBI fetch failed; using the latest captured RBI Current Rates observation in this prototype. Refresh the source before interpreting this estimate.",warning:error.message});
  }
};
