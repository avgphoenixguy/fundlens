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
  const plain = decode(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," "));
  const marker = plain.search(/Government Securities Market/i);
  if (marker < 0) throw new Error("RBI Government Securities table not found");
  const block = plain.slice(marker, marker + 1800);
  const rows = [...block.matchAll(/(\d+(?:\.\d+)?%\s*GS\s*(20\d{2}))\s*[:|]?\s*(\d+\.\d{2,4})\s*%?/gi)];
  if (!rows.length) throw new Error("No G-Sec yield rows found on RBI page");
  const currentYear = new Date().getUTCFullYear();
  const chosen = rows.map(m => ({security:m[1].replace(/\s+/g," ").trim(), maturity:Number(m[2]), rate:Number(m[3])}))
    .sort((a,b) => Math.abs(a.maturity-(currentYear+10))-Math.abs(b.maturity-(currentYear+10)))[0];
  if (!Number.isFinite(chosen.rate) || chosen.rate < 3 || chosen.rate > 15) throw new Error("Parsed RBI G-Sec yield failed sanity checks");
  const dateMatch = block.match(/as on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const asOf = dateMatch ? new Date(dateMatch[1]).toISOString().slice(0,10) : null;
  if (!asOf) throw new Error("RBI G-Sec observation date not found");
  return {...chosen,asOf,source:"Reserve Bank of India Current Rates",sourceUrl:"https://www.rbi.org.in/",isFallback:false};
}
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","s-maxage=3600, stale-while-revalidate=21600");
  res.setHeader("Access-Control-Allow-Origin","*");
  if (req.method !== "GET") return res.status(405).json({error:"Method not allowed"});
  try {
    const response = await fetch("https://www.rbi.org.in/", {headers:{"User-Agent":"Mozilla/5.0 FundLens research prototype","Accept":"text/html"},signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error("RBI returned HTTP " + response.status);
    const parsed = parseRbi(await response.text());
    return res.status(200).json({...parsed,rateType:"Long-dated Government of India security yield proxy",assumptionNote:"Used as a domestic sovereign risk-free proxy for the selected daily NAV sample. A 10-year yield is not a maturity-matched overnight risk-free rate."});
  } catch(error) {
    return res.status(200).json({...FALLBACK,rateType:"Long-dated Government of India security yield proxy",assumptionNote:"RBI fetch failed; using the latest captured RBI Current Rates observation in this prototype. Refresh the source before interpreting this estimate.",warning:error.message});
  }
};
