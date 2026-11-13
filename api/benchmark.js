// Vercel serverless proxy for NSE Indices historical Total Return Index data.
// The upstream endpoint is used by the official Nifty Indices historical-data page.
// It is not a documented public API, so this route validates requests and returns
// a clear upstream error. The frontend has no user upload control; unsupported indices are reported as unavailable.
const ALLOWED = new Set([
  "NIFTY 50",
  "NIFTY 100",
  "NIFTY 500",
  "NIFTY NEXT 50",
  "NIFTY MIDCAP 150",
  "NIFTY SMALLCAP 250"
]);

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return String(d.getUTCDate()).padStart(2,"0") + "-" + months[d.getUTCMonth()] + "-" + d.getUTCFullYear();
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const indexName = String(req.query.index || "").trim();
  const startDate = String(req.query.start || "").trim();
  const endDate = String(req.query.end || "").trim();

  if (!ALLOWED.has(indexName)) return res.status(400).json({ error: "Unsupported index. Choose one of the available Nifty benchmark series." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return res.status(400).json({ error: "Dates must use YYYY-MM-DD." });
  }
  if (startDate > endDate) return res.status(400).json({ error: "Start date must be before end date." });

  try {
    const cinfo = "{'name':'" + indexName + "','startDate':'" + fmtDate(startDate) + "','endDate':'" + fmtDate(endDate) + "','indexName':'" + indexName + "'}";
    const upstream = await fetch("https://www.niftyindices.com/Backpage.aspx/getTotalReturnIndexString", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.niftyindices.com/reports/historical-data",
        "User-Agent": "Mozilla/5.0 (compatible; FundLensResearch/1.0)"
      },
      body: JSON.stringify({ cinfo }),
      signal: AbortSignal.timeout(25000)
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: "NSE Indices returned HTTP " + upstream.status + ". Use the TRI CSV import as a fallback." });
    }

    const raw = await upstream.json();
    const rows = typeof raw.d === "string" ? JSON.parse(raw.d) : raw.d;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: "No TRI observations were returned for this index and period. Check benchmark availability or import a TRI CSV." });
    }

    const data = rows.map(row => {
      const rawDate = String(row.Date || row.date || row.HistoricalDate || "").trim();
      let isoDate = null;
      if (/^\\d{4}-\\d{2}-\\d{2}/.test(rawDate)) {
        isoDate = rawDate.slice(0,10);
      } else {
        const parts = rawDate.split(/\\s+/);
        if (parts.length === 3) {
          const monthMap = {Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12"};
          const month = monthMap[parts[1]];
          if (month) isoDate = parts[2] + "-" + month + "-" + parts[0].padStart(2,"0");
        }
      }
      const rawValue = row.TotalReturnsIndex ?? row["Total Returns Index"] ?? row.TRI ?? row.value;
      const value = Number(String(rawValue ?? "").replace(/,/g,""));
      if (!isoDate || !Number.isFinite(value) || value <= 0) return null;
      return {date:isoDate,value};
    }).filter(Boolean).sort((a,b) => a.date.localeCompare(b.date));
    const dedup = new Map(data.map(x => [x.date,x.value]));
    const clean = [...dedup.entries()].map(([date,value]) => ({date,value}));

    if (!clean.length) return res.status(502).json({ error: "The NSE Indices response could not be parsed. Automatic benchmark metrics are unavailable until the upstream source recovers." });

    return res.status(200).json({
      source: "NSE Indices historical Total Return Index",
      index: indexName,
      retrievedAt: new Date().toISOString(),
      count: clean.length,
      firstDate: clean[0].date,
      lastDate: clean[clean.length-1].date,
      data: clean
    });
  } catch (error) {
    return res.status(502).json({
      error: "Benchmark service unavailable: " + (error && error.name === "TimeoutError" ? "NSE Indices request timed out." : "upstream request failed."),
      detail: error && error.message ? error.message : "Unknown error",
      fallback: "Import an official TRI CSV in FundLens."
    });
  }
};
