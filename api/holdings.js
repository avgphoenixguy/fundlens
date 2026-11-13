// Automatic AMC holdings retrieval for FundLens.
// Fetches public month-end workbook disclosures. No investor uploads are accepted.
// Initial verified adapters: PPFAS and HDFC Mutual Fund. Unsupported AMCs fail closed.
const zlib = require("zlib");

const AMC_SOURCES = {
  ppfas: {
    label: "PPFAS Mutual Fund",
    page: "https://amc.ppfas.com/downloads/portfolio-disclosure/index.php",
    match: /parag\s*parikh|ppfas/i,
    allowedHosts: ["amc.ppfas.com"],
    alias(name) {
      const s = String(name || "").toLowerCase();
      if (/flexi\s*cap/.test(s)) return "PPFCF";
      if (/liquid/.test(s)) return "PPLF";
      if (/tax\s*saver|elss/.test(s)) return "PPTSF";
      if (/conservative\s*hybrid/.test(s)) return "PPCHF";
      if (/dynamic\s*asset\s*allocation/.test(s)) return "PPDAAF";
      if (/large\s*cap/.test(s)) return "PPLCF";
      return null;
    }
  },
  hdfc: {
    label: "HDFC Mutual Fund",
    page: "https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio",
    match: /hdfc/i,
    allowedHosts: ["www.hdfcfund.com", "files.hdfcfund.com"]
  },
};

const MONTHS = {
  jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4,
  may:5, jun:6, june:6, jul:7, july:7, aug:8, august:8, sep:9, sept:9,
  september:9, oct:10, october:10, nov:11, november:11, dec:12, december:12
};

function decodeXml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripHtml(s) {
  return decodeXml(String(s || "").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}
function normalize(s) {
  return String(s || "").toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(direct|regular|growth|idcw|dividend|reinvestment|reinvest|payout|retail|institutional|plan|option|monthly|portfolio|report|fund|scheme)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function tokenScore(a, b) {
  const A = new Set(normalize(a).split(" ").filter(x => x.length > 1));
  const B = new Set(normalize(b).split(" ").filter(x => x.length > 1));
  if (!A.size || !B.size) return 0;
  let hits = 0;
  for (const x of A) if (B.has(x)) hits++;
  return hits / Math.max(A.size, B.size);
}
function parseDisclosureDate(s) {
  let v = String(s || "");
  try { v = decodeURIComponent(v); } catch (_) {}
  let m = v.match(/(\d{1,2})[ _-]+([A-Za-z]{3,9})[ _-]+(20\d{2})/i);
  if (!m) m = v.match(/([A-Za-z]{3,9})[ _-]+(\d{1,2})[,_ -]+(20\d{2})/i);
  if (!m) return null;
  const day = /^\d/.test(m[1]) ? Number(m[1]) : Number(m[2]);
  const monthName = /^\d/.test(m[1]) ? m[2] : m[1];
  const year = Number(m[3]);
  const month = MONTHS[monthName.toLowerCase()];
  if (!month || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}
function safeUrl(href, pageUrl, allowedHosts) {
  try {
    const u = new URL(decodeXml(href).replace(/&amp;/g, "&"), pageUrl);
    if (u.protocol !== "https:" || !allowedHosts.includes(u.hostname.toLowerCase())) return null;
    if (!/\.(xlsx|xlsm|xls|csv)(?:$|\?)/i.test(u.href)) return null;
    return u.href;
  } catch (_) { return null; }
}
function collectDownloads(html, pageUrl, allowedHosts) {
  const out = [];
  const patterns = [
    /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    /["'](?:fileUrl|downloadUrl|url|path)["']\s*:\s*["']([^"']+\.(?:xlsx|xlsm|xls|csv)(?:\?[^"']*)?)["']/gi
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      let href, label;
      if (re === patterns[0]) {
        href = m[2];
        label = stripHtml(m[4] || "") + " " + (m[1] || "") + " " + (m[3] || "");
      } else {
        href = m[1];
        label = href;
      }
      const url = safeUrl(href, pageUrl, allowedHosts);
      if (url && !out.some(x => x.url === url)) {
        out.push({ url, label, asOf: parseDisclosureDate(label + " " + url) });
      }
    }
  }
  return out;
}
async function fetchText(url, referer) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FundLensResearch/1.0)", "Accept": "text/html,application/xhtml+xml,*/*", "Referer": referer || url },
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error("AMC disclosure page returned HTTP " + r.status);
  return await r.text();
}
async function fetchBinary(url, referer, allowedHosts) {
  let current = new URL(url);
  for (let hop = 0; hop <= 3; hop++) {
    if (current.protocol !== "https:" || !allowedHosts.includes(current.hostname.toLowerCase())) {
      throw new Error("Portfolio workbook redirected outside the approved AMC hosts");
    }
    const r = await fetch(current.href, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FundLensResearch/1.0)", "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*", "Referer": referer },
      signal: AbortSignal.timeout(20000)
    });
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const location = r.headers.get("location");
      if (!location || hop === 3) throw new Error("Portfolio workbook redirect chain is invalid or too long");
      current = new URL(location, current);
      continue;
    }
    if (!r.ok) throw new Error("Portfolio workbook returned HTTP " + r.status);
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length < 1000 || bytes.length > 12 * 1024 * 1024) throw new Error("Portfolio workbook size is outside the accepted range");
    return bytes;
  }
  throw new Error("Portfolio workbook redirect chain could not be resolved");
}
function findPpfasDownload(items, alias) {
  const candidates = items.filter(x => (x.url + " " + x.label).toUpperCase().includes(alias));
  candidates.sort((a, b) => (b.asOf || "").localeCompare(a.asOf || ""));
  return candidates[0] || null;
}
function findHdfcDownload(items, schemeName) {
  const scored = items.map(x => {
    let filename = "";
    try { filename = decodeURIComponent(new URL(x.url).pathname.split("/").pop() || ""); }
    catch (_) { filename = String(x.label || ""); }
    filename = filename
      .replace(/\b(?:monthly|fortnightly)\b/gi, " ")
      .replace(/\b\d{1,2}\s+[A-Za-z]+\s+20\d{2}\b/g, " ")
      .replace(/\.(?:xlsx|xlsm|xls|csv)\b/gi, " ");
    return { ...x, filename, score: tokenScore(schemeName, filename) };
  }).filter(x => x.score >= 0.85)
    .sort((a, b) => (b.asOf || "").localeCompare(a.asOf || "") || b.score - a.score);
  return scored[0] || null;
}

function unzipEntries(buf) {
  const signature = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === signature) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Downloaded disclosure is not a valid XLSX workbook");
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count > 500) throw new Error("XLSX workbook has an unexpected number of entries");
  const files = {};
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Invalid XLSX central directory");
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid XLSX file entry");
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressed;
    if (dataEnd > buf.length) throw new Error("XLSX entry exceeds workbook bounds");
    const compressedData = buf.subarray(dataStart, dataEnd);
    let data;
    if (method === 0) data = compressedData;
    else if (method === 8) data = zlib.inflateRawSync(compressedData);
    else throw new Error("Unsupported XLSX compression method " + method);
    files[name] = data.toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
function columnNumber(ref) {
  const letters = String(ref || "").match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "";
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}
function parseXlsxRows(buf) {
  const files = unzipEntries(buf);
  const sharedXml = files["xl/sharedStrings.xml"] || "";
  const shared = [...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m =>
    [...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => decodeXml(x[1])).join("")
  );
  const sheetPath = Object.keys(files).find(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  if (!sheetPath) throw new Error("XLSX workbook does not contain a worksheet");
  const sheet = files[sheetPath];
  const customFormats = {};
  const styleXml = files["xl/styles.xml"] || "";
  for (const m of styleXml.matchAll(/<numFmt\b[^>]*numFmtId=["'](\d+)["'][^>]*formatCode=["']([^"']*)["'][^>]*\/?\s*>/gi)) {
    customFormats[Number(m[1])] = m[2];
  }
  const xfs = styleXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i)?.[1] || "";
  const stylePercent = [...xfs.matchAll(/<xf\b([^>]*)\/?\s*>/gi)].map(m => {
    const id = Number(m[1].match(/numFmtId=["'](\d+)["']/i)?.[1] || 0);
    return id === 9 || id === 10 || /%/.test(customFormats[id] || "");
  });
  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const c of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1] || "";
      const inner = c[2] || "";
      const ref = attrs.match(/\br=["']([^"']+)["']/i)?.[1];
      const index = columnNumber(ref);
      if (index < 0) continue;
      const type = attrs.match(/\bt=["']([^"']+)["']/i)?.[1] || "";
      const style = Number(attrs.match(/\bs=["'](\d+)["']/i)?.[1] || 0);
      let value = "";
      if (type === "inlineStr") value = [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => decodeXml(x[1])).join("");
      else {
        const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = type === "s" ? (shared[Number(raw)] ?? "") : decodeXml(raw);
      }
      cells[index] = { value, percentStyle: !!stylePercent[style] };
    }
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}
function cellValue(row, index) {
  return index >= 0 && row[index] ? String(row[index].value ?? "").trim() : "";
}
function headerNorm(s) {
  return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9%]+/g, " ").replace(/\s+/g, " ").trim();
}
function findHeader(headers, test) {
  return headers.findIndex(h => test(headerNorm(h)));
}
function parseNumeric(raw) {
  if (raw == null || String(raw).trim() === "") return NaN;
  const cleaned = String(raw).replace(/,/g, "").replace(/%/g, "").replace(/[₹]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
function parseWeight(cell, fractionalSource = false) {
  if (!cell) return NaN;
  const raw = String(cell.value ?? "").trim();
  if (!raw) return NaN;
  const n = parseNumeric(raw);
  if (!Number.isFinite(n)) return NaN;
  const textHasPercent = /%/.test(raw);
  // PPFAS workbooks store percentage values as Excel fractions. HDFC stores
  // percentage points in the cell value. Honour the cell's actual percent
  // format first, then apply only the verified PPFAS source convention.
  const scale = textHasPercent ? 1 : cell.percentStyle ? 100 : (fractionalSource && Math.abs(n) < 1 ? 100 : 1);
  const value = n * scale;
  return value > 0 && value <= 100 ? value : NaN;
}
function isRatingOrDebtRow(name, typeOrSector) {
  const descriptor = String(typeOrSector || "").trim();
  const ratingLike = /^(?:CRISIL|ICRA|CARE|IND|ACUITE|BRICKWORK|SMERA|A\s*[-+]?\d|AAA|AA[+-]?|A[+-]?|BBB[+-]?|BB[+-]?|B[+-]?|SOV|SO\/VER|NOT RATED)\b/i.test(descriptor);
  return ratingLike || /\b(debenture|bond|treasury|t bill|tbill|certificate of deposit|commercial paper|cp|cd|g sec|government security|repo|reverse repo|pass through|securit|mutual fund units|etf units|gold|silver|cash|money market|warrant|preference share)\b/i.test(String(name || "") + " " + descriptor);
}
function parsePortfolio(buf, fractionalSource = false) {
  const rows = parseXlsxRows(buf);
  let headerAt = -1, headers = [];
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const values = rows[i].map(c => String(c?.value || "").replace(/\s+/g, " ").trim());
    const normalized = values.map(headerNorm);
    const hasIsin = normalized.some(v => v === "isin" || v.startsWith("isin "));
    const hasName = normalized.some(v => /instrument|security|company|issuer|stock|scrip|particulars|name of/.test(v));
    const hasWeight = normalized.some(v => /^(?:%?\s*to\s*(?:net assets|nav)|percentage\s*to\s*(?:net assets|nav)|(?:net assets|portfolio)\s*(?:%|weight)|weight)$/.test(v));
    if (hasIsin && hasName && hasWeight) { headerAt = i; headers = values; break; }
  }
  if (headerAt < 0) throw new Error("Workbook layout could not be validated: expected instrument name, ISIN and % to NAV columns");
  const nameCol = findHeader(headers, h => /^(name of the instrument|name of instrument|instrument name|security name|company name|issuer name|scrip name|stock name|particulars|name)$/.test(h) || /^(name of the instrument|instrument name|security description)/.test(h));
  const isinCol = findHeader(headers, h => h === "isin" || h === "isin no" || h === "isin number" || h.startsWith("isin "));
  const weightCol = findHeader(headers, h => /^(?:%?\s*to\s*(?:net assets|nav)|percentage\s*to\s*(?:net assets|nav)|(?:net assets|portfolio)\s*(?:%|weight)|weight)$/.test(h));
  const sectorCol = findHeader(headers, h => /^(industry|sector|industry name|sector name|industry rating)$/.test(h));
  const typeCol = findHeader(headers, h => /^(asset class|instrument type|security type|type)$/.test(h));
  if (nameCol < 0 || isinCol < 0 || weightCol < 0) throw new Error("Workbook columns are not sufficiently explicit to calculate holdings overlap");
  const holdings = [];
  let excluded = 0;
  for (const row of rows.slice(headerAt + 1)) {
    const name = cellValue(row, nameCol).replace(/\s+/g, " ").trim();
    const isinRaw = cellValue(row, isinCol).toUpperCase().replace(/\s+/g, "");
    const isin = /^[A-Z]{2}[A-Z0-9]{10}$/.test(isinRaw) ? isinRaw : null;
    const weight = parseWeight(row[weightCol], fractionalSource);
    const sector = sectorCol >= 0 ? cellValue(row, sectorCol).replace(/\s+/g, " ").trim() : "";
    const type = typeCol >= 0 ? cellValue(row, typeCol) : "";
    if (!name || !Number.isFinite(weight) || /^(total|grand total|net assets|net current assets|sub total)$/i.test(name)) continue;
    const equityHint = /\b(equity|shares|stock|listed equity)\b/i.test(type);
    const debtHint = isRatingOrDebtRow(name, type + " " + sector);
    const equityByIndustry = !!sector && !!isin && isin.startsWith("INE") && !debtHint;
    if (!(equityHint || equityByIndustry) || debtHint || !isin) { excluded++; continue; }
    holdings.push({
      name, isin, key: isin,
      weightPct: weight,
      sector: sector || "Sector not disclosed",
      instrumentType: type || "Equity (inferred from AMC industry field)"
    });
  }
  const deduped = new Map();
  for (const h of holdings) {
    const old = deduped.get(h.key);
    if (!old) deduped.set(h.key, { ...h });
    else {
      old.weightPct += h.weightPct;
      if (old.sector === "Sector not disclosed" && h.sector !== "Sector not disclosed") old.sector = h.sector;
    }
  }
  const out = [...deduped.values()].sort((a, b) => b.weightPct - a.weightPct);
  if (!out.length) throw Object.assign(new Error("No listed-equity holdings with validated ISINs and weights were found in this workbook. Debt-only schemes are not eligible for stock overlap."), { status: 422 });
  if (out.some(h => h.weightPct > 100)) throw new Error("A security's aggregated weight exceeded 100% of scheme NAV. Workbook was rejected.");
  const equityCoveragePct = out.reduce((s, h) => s + h.weightPct, 0);
  if (!Number.isFinite(equityCoveragePct) || equityCoveragePct > 105) throw new Error("Parsed listed-equity weights exceed 105% of scheme NAV. Workbook was rejected for review.");
  return { holdings: out, equityCoveragePct, excludedRows: excluded, totalEquityHoldings: out.length };
}
async function getSchemeMeta(code) {
  const r = await fetch("https://api.mfapi.in/mf/" + encodeURIComponent(code), {
    headers: { "Accept": "application/json", "User-Agent": "FundLensResearch/1.0" },
    signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) throw new Error("Scheme metadata provider returned HTTP " + r.status);
  const body = await r.json();
  const meta = body?.meta || {};
  const name = String(meta.scheme_name || meta.schemeName || "").trim();
  const fundHouse = String(meta.fund_house || meta.fundHouse || "").trim();
  if (!name || !fundHouse) throw new Error("Scheme metadata did not identify a scheme and AMC");
  return { name, fundHouse, category: String(meta.scheme_category || "") };
}
async function resolvePortfolio(scheme) {
  const source = Object.values(AMC_SOURCES).find(x => x.match.test(scheme.fundHouse));
  if (!source) throw Object.assign(new Error("Automatic public holdings retrieval is not yet supported for " + scheme.fundHouse + ". No substitute or estimated holdings were used."), { status: 422, fundHouse: scheme.fundHouse });
  if (/arbitrage|equity savings/i.test(scheme.name)) throw Object.assign(new Error("This scheme uses arbitrage or hedged equity strategies. Gross stock holdings do not equal net market exposure, so FundLens withholds the overlap calculation."), { status: 422, fundHouse: scheme.fundHouse });
  const html = await fetchText(source.page, source.page);
  const links = collectDownloads(html, source.page, source.allowedHosts);
  let chosen = null;
  if (source === AMC_SOURCES.ppfas) {
    const alias = source.alias(scheme.name);
    if (!alias) throw Object.assign(new Error("This PPFAS scheme does not have a verified holdings-file mapping."), { status: 422 });
    chosen = findPpfasDownload(links, alias);
  } else if (source === AMC_SOURCES.hdfc) {
    chosen = findHdfcDownload(links, scheme.name);
  }
  if (!chosen) throw Object.assign(new Error("No matching public monthly portfolio workbook was found for this scheme on the AMC disclosure page."), { status: 404, sourceUrl: source.page });
  const fileUrl = chosen.url;
  const fileHost = new URL(fileUrl).hostname.toLowerCase();
  if (!source.allowedHosts.includes(fileHost)) throw new Error("The discovered workbook host is not in the AMC allowlist");
  const buf = await fetchBinary(fileUrl, source.page, source.allowedHosts);
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("The AMC file is not an XLSX workbook; it was not parsed or approximated");
  const asOf = chosen.asOf || parseDisclosureDate(fileUrl);
  if (!asOf || !Number.isFinite(new Date(asOf + "T00:00:00Z").getTime())) {
    throw Object.assign(new Error("The AMC workbook has no verifiable portfolio reporting date. Overlap is withheld."), { status: 422, sourceUrl: fileUrl });
  }
  if (new Date(asOf + "T00:00:00Z").getTime() > Date.now() + 86400000) {
    throw Object.assign(new Error("The AMC workbook reporting date is in the future. Overlap is withheld."), { status: 422, sourceUrl: fileUrl });
  }
  const parsed = parsePortfolio(buf, source === AMC_SOURCES.ppfas);
  const ageDays = asOf ? Math.floor((Date.now() - new Date(asOf + "T00:00:00Z").getTime()) / 86400000) : null;
  return {
    schemeCode: Number(scheme.schemeCode),
    schemeName: scheme.name,
    fundHouse: scheme.fundHouse,
    source: source.label,
    sourcePage: source.page,
    sourceFile: fileUrl,
    asOf,
    ageDays: Number.isFinite(ageDays) ? ageDays : null,
    stale: !Number.isFinite(ageDays) || ageDays > 45,
    retrievedAt: new Date().toISOString(),
    holdings: parsed.holdings,
    equityCoveragePct: Number(parsed.equityCoveragePct.toFixed(4)),
    totalEquityHoldings: parsed.totalEquityHoldings,
    excludedRows: parsed.excludedRows,
    note: "Equity holdings only. Debt, cash, derivatives, units and unclassified rows are excluded from stock-overlap calculations."
  };
}
module.exports = async function handler(req, res) {
  const forceRefresh = req.query.refresh === "1";
  res.setHeader("Cache-Control", forceRefresh ? "no-store, max-age=0" : "public, s-maxage=21600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const code = Number(req.query.schemeCode || req.query.code);
  if (!Number.isSafeInteger(code) || code <= 0) return res.status(400).json({ error: "A valid MFAPI schemeCode is required." });
  try {
    const scheme = await getSchemeMeta(code);
    const result = await resolvePortfolio({ ...scheme, schemeCode: code });
    return res.status(200).json(result);
  } catch (error) {
    const status = Number(error.status) || 502;
    return res.status(status).json({
      error: error.message || "Automatic holdings retrieval failed.",
      schemeCode: code,
      fundHouse: error.fundHouse || null,
      sourceUrl: error.sourceUrl || null,
      retrievedAt: new Date().toISOString(),
      note: "FundLens does not accept holdings uploads and does not estimate missing holdings. Data is returned only when a dated public AMC workbook can be matched and validated."
    });
  }
};
