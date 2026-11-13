// Fetch a published weekly, TRI-derived NSE index series from Tipsheet's public data API.
// The series is a rebased growth-of-100 chart series, not NSE's raw index levels.
// Tipsheet documents the source as NSE Indices TRI (dividends reinvested), with
// anomalous TRI prints repaired against the price index. Credit Tipsheet and NSE.
// Do not substitute Tipsheet's separate model indices or any price-return series.
const DATA_BASE = "https://tipsheet.markets";
const MANIFEST_URL = DATA_BASE + "/data/v1/manifest.json";
const BENCHMARKS = {
  "NIFTY 50": { slug: "nifty-50", label: "Nifty 50" },
  "NIFTY 100": { slug: "nifty-100", label: "Nifty 100" },
  "NIFTY 500": { slug: "nifty-500", label: "Nifty 500" },
  "NIFTY NEXT 50": { slug: "nifty-next-50", label: "Nifty Next 50" },
  "NIFTY MIDCAP 150": { slug: "nifty-midcap-150", label: "Nifty Midcap 150" },
  "NIFTY SMALLCAP 250": { slug: "nifty-smallcap-250", label: "Nifty Smallcap 250" }
};
const USER_AGENT = "Mozilla/5.0 (compatible; FundLensResearch/1.0; +https://fundlens-studio.netlify.app/)";
let manifestCache = null;
let manifestCacheUntil = 0;
let manifestPending = null;

function isoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value || "").trim();
  const m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + "-" + String(m[2]).padStart(2, "0") + "-" + String(m[3]).padStart(2, "0");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function normaliseKey(value) {
  let key = String(value || "").toLowerCase().replaceAll("\\", "/");
  while (key.startsWith("/")) key = key.slice(1);
  while (key.endsWith("/")) key = key.slice(0, -1);
  return key.endsWith(".json") ? key.slice(0, -5) : key;
}
function isJsonPath(value) {
  if (typeof value !== "string") return false;
  const clean = value.split("?")[0].toLowerCase();
  return clean.endsWith(".json");
}
function resourceFrom(value) {
  if (isJsonPath(value)) return value;
  if (!value || typeof value !== "object") return null;
  const fields = ["url", "href", "file", "path", "src", "json", "uri", "download", "data_url", "file_url", "filename", "address", "current_file", "download_url", "file_path", "data_file"];
  for (const field of fields) {
    const candidate = value[field];
    if (isJsonPath(candidate)) return candidate;
  }
  return null;
}
function findManifestResource(manifest, datasetKey) {
  const target = normaliseKey(datasetKey);
  const found = [];
  const seen = new Set();
  function walk(node, keyPath, depth) {
    if (depth > 12 || node == null) return;
    if (typeof node === "string") {
      const joined = normaliseKey(keyPath.join("/"));
      if ((joined === target || joined.endsWith("/" + target) || joined.includes(target)) && isJsonPath(node)) {
        found.push(node);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, keyPath.concat(String(index)), depth + 1));
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    const identityFields = ["name", "key", "dataset", "id", "slug", "logical_name", "dataset_name"];
    const identities = identityFields.map(k => normaliseKey(node[k])).filter(Boolean);
    const identityMatch = identities.some(x => x === target || x.endsWith("/" + target) || x.includes(target));
    if (identityMatch) {
      const resource = resourceFrom(node);
      if (resource) found.push(resource);
    }

    for (const [key, value] of Object.entries(node)) {
      const childPath = keyPath.concat(key);
      const keyNorm = normaliseKey(key);
      if ((keyNorm === target || keyNorm.endsWith("/" + target) || keyNorm.includes(target)) && isJsonPath(value)) {
        found.push(value);
      }
      if ((keyNorm === target || keyNorm.endsWith("/" + target) || keyNorm.includes(target)) && value && typeof value === "object") {
        const resource = resourceFrom(value);
        if (resource) found.push(resource);
      }
      walk(value, childPath, depth + 1);
    }
  }
  walk(manifest, [], 0);
  return [...new Set(found)][0] || null;
}
function safeTipsheetUrl(path) {
  const raw = String(path || "").trim();
  let url;
  if (/^https?:\\/\\//i.test(raw)) {
    url = new URL(raw);
  } else {
    // Tipsheet manifest file addresses are relative to /data/v1/, whether
    // the manifest spells them as "indices/..." or "/indices/...".
    const relativePath = raw.replace(/^\\/+/, "");
    const dataPath = relativePath.startsWith("data/v1/")
      ? "/" + relativePath
      : "/data/v1/" + relativePath;
    url = new URL(dataPath, DATA_BASE);
  }
  if (url.protocol !== "https:" || !["tipsheet.markets", "www.tipsheet.markets"].includes(url.hostname.toLowerCase())) {
    throw new Error("The Tipsheet manifest returned a URL outside the approved Tipsheet domain.");
  }
  return url.href;
}
async function getJson(url, timeoutMs) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": USER_AGENT
    },
    signal: AbortSignal.timeout(timeoutMs || 5000),
    redirect: "follow"
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) throw new Error("HTTP " + response.status + " fetching " + url);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); }
  catch (_) { throw new Error("Expected JSON from " + url + " but received " + (contentType || "an unknown content type")); }
  return body;
}

async function getTipsheetManifest() {
  if (manifestCache && Date.now() < manifestCacheUntil) return manifestCache;
  if (manifestPending) return manifestPending;
  manifestPending = getJson(MANIFEST_URL, 4000).then(body => {
    manifestCache = body;
    // Tipsheet refreshes its manifest during trading evenings. Keep the warm
    // function cache short so a newly published hashed dataset is picked up.
    manifestCacheUntil = Date.now() + 60_000;
    return body;
  }).finally(() => {
    manifestPending = null;
  });
  return manifestPending;
}

function collectSeries(node, path, inheritedMeta, out, depth) {
  if (depth > 8 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectSeries(item, path.concat(String(i)), inheritedMeta, out, depth + 1));
    return;
  }
  const meta = node.meta && typeof node.meta === "object" ? { ...inheritedMeta, ...node.meta } : inheritedMeta;
  if (Array.isArray(node.dates) && node.series && typeof node.series === "object" && !Array.isArray(node.series)) {
    for (const [seriesName, values] of Object.entries(node.series)) {
      if (Array.isArray(values) && values.length === node.dates.length) {
        const label = String(seriesName || "");
        const isPrice = /price|capital gain|price return/i.test(label);
        const isTotalReturn = /total[ _-]*return|\btri\b/i.test(label);
        if (isTotalReturn && !isPrice) {
          out.push({
            path: path.join("/"),
            label,
            dates: node.dates,
            values,
            meta,
            resolution: node.resolution || node.frequency || meta.resolution || meta.frequency || null
          });
        }
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "meta") continue;
    collectSeries(value, path.concat(key), meta, out, depth + 1);
  }
}
function median(values) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function verifyWeekly(dates) {
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    const a = new Date(dates[i - 1] + "T00:00:00Z");
    const b = new Date(dates[i] + "T00:00:00Z");
    gaps.push((b - a) / 86400000);
  }
  const typicalGap = median(gaps);
  if (!Number.isFinite(typicalGap) || typicalGap < 4 || typicalGap > 11) {
    throw new Error("The published TRI-derived series did not validate as weekly (median observation gap: " +
      (Number.isFinite(typicalGap) ? typicalGap.toFixed(1) + " days" : "unknown") + ").");
  }
  return typicalGap;
}
function pickTotalReturnSeries(dataset) {
  const candidates = [];
  collectSeries(dataset, [], dataset.meta || {}, candidates, 0);
  if (!candidates.length) {
    const seriesNames = [];
    function listNames(node, depth) {
      if (depth > 8 || node == null || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(x => listNames(x, depth + 1)); return; }
      if (node.series && typeof node.series === "object" && !Array.isArray(node.series)) {
        seriesNames.push(...Object.keys(node.series));
      }
      for (const [k, v] of Object.entries(node)) if (k !== "meta") listNames(v, depth + 1);
    }
    listNames(dataset, 0);
    throw new Error("No total-return series was identified in the Tipsheet dataset. Published series found: " +
      (seriesNames.slice(0, 12).join(", ") || "none"));
  }
  candidates.sort((a, b) => {
    const exact = x => /^total[ _-]*return$/i.test(x.label.trim()) ? 2 : /total[ _-]*return|\btri\b/i.test(x.label) ? 1 : 0;
    return exact(b.label) - exact(a.label);
  });
  return candidates[0];
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const index = String(req.query.index || "").trim().toUpperCase();
  const start = String(req.query.start || "").trim();
  const end = String(req.query.end || "").trim();
  const benchmark = BENCHMARKS[index];
  if (!benchmark) {
    return res.status(400).json({
      error: "No weekly TRI-derived data mapping is configured for this benchmark. No proxy or price index will be substituted.",
      supported: Object.keys(BENCHMARKS)
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    return res.status(400).json({ error: "Dates must use YYYY-MM-DD and start must not exceed end." });
  }
  const startDate = isoDate(start), endDate = isoDate(end);
  if (!startDate || !endDate || startDate > endDate) {
    return res.status(400).json({ error: "Invalid start or end date." });
  }

  try {
    const datasetKey = "indices/p/" + benchmark.slug;
    const manifest = await getTipsheetManifest();
    const resource = findManifestResource(manifest, datasetKey);
    if (!resource) {
      const topKeys = manifest && typeof manifest === "object" ? Object.keys(manifest).slice(0, 24) : [];
      throw new Error("Tipsheet manifest did not contain " + datasetKey + ". Manifest fields: " + topKeys.join(", "));
    }
    const datasetUrl = safeTipsheetUrl(resource);
    const dataset = await getJson(datasetUrl, 5000);
    const selected = pickTotalReturnSeries(dataset);
    const declaredResolution = String(selected.resolution || dataset.resolution || "").toLowerCase();
    if (declaredResolution && declaredResolution !== "weekly") {
      throw new Error("Tipsheet declared this series as " + declaredResolution + ", not weekly. Benchmark calculations were withheld.");
    }

    const data = [];
    for (let i = 0; i < selected.dates.length; i++) {
      const date = isoDate(selected.dates[i]);
      const value = Number(selected.values[i]);
      if (!date || date < startDate || date > endDate || !Number.isFinite(value) || value <= 0) continue;
      data.push({ date, value });
    }
    data.sort((a, b) => a.date.localeCompare(b.date));
    if (data.length < 30) {
      return res.status(404).json({
        error: "Fewer than 30 weekly TRI-derived observations were available in the requested NAV date range.",
        count: data.length,
        requestedStart: startDate,
        requestedEnd: endDate,
        datasetUrl
      });
    }
    const typicalGapDays = verifyWeekly(data.map(x => x.date));
    const sourceMeta = selected.meta || {};
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=21600");
    return res.status(200).json({
      source: "Tipsheet published weekly TRI-derived series",
      sourceUrl: DATA_BASE + "/indices/" + benchmark.slug + "/",
      dataUrl: datasetUrl,
      originalSource: "NSE Indices Total Return Index (dividends reinvested)",
      originalSourceUrl: "https://www.niftyindices.com/reports/historical-data",
      index: benchmark.label + " TRI-derived weekly series",
      resolution: "weekly",
      periodsPerYear: 52,
      seriesName: selected.label,
      method: sourceMeta.method || sourceMeta.description || "Weekly growth-of-100 series derived from NSE Indices total-return observations; anomalous TRI prints are repaired against the corresponding price index as documented by Tipsheet.",
      attribution: "Credit: Tipsheet, tipsheet.markets, and NSE Indices. Published growth-of-100 derived data is used; raw NSE index levels are not republished.",
      note: "Weekly observations only. Alpha, Beta, tracking error and FundLens Information Ratio are estimated from matched weekly fund NAV and TRI-derived returns, annualised with 52 periods per year. This is not a raw daily NSE TRI feed.",
      retrievedAt: new Date().toISOString(),
      count: data.length,
      typicalGapDays: Number(typicalGapDays.toFixed(2)),
      firstDate: data[0].date,
      lastDate: data[data.length - 1].date,
      data
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(502).json({
      error: "Automatic weekly TRI-derived retrieval failed: " + (error && error.message ? error.message : "upstream request failed"),
      sourceUrl: DATA_BASE + "/data/",
      note: "No price-return series, Tipsheet model index, fabricated data or synthetic benchmark was used."
    });
  }
};
