import amfiPerformanceHandler from "../api/amfi-performance.js";
import amfiTerHandler from "../api/amfi-ter.js";
import benchmarkHandler from "../api/benchmark.js";
import holdingsHandler from "../api/holdings.js";
import riskFreeRateHandler from "../api/risk-free-rate.js";

const API_ROUTES = new Map([
  ["/api/amfi-performance", amfiPerformanceHandler],
  ["/api/amfi-ter", amfiTerHandler],
  ["/api/benchmark", benchmarkHandler],
  ["/api/holdings", holdingsHandler],
  ["/api/risk-free-rate", riskFreeRateHandler]
]);

function createResponseAdapter() {
  const headers = new Headers();
  let statusCode = 200;

  const response = {
    setHeader(name, value) {
      headers.set(String(name), String(value));
      return response;
    },

    status(code) {
      const parsed = Number(code);
      if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
        statusCode = parsed;
      }
      return response;
    },

    json(payload) {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json; charset=utf-8");
      }
      return new Response(JSON.stringify(payload), {
        status: statusCode,
        headers
      });
    },

    end(body) {
      const noBodyStatus = statusCode === 204 || statusCode === 304;
      return new Response(noBodyStatus || body == null ? null : String(body), {
        status: statusCode,
        headers
      });
    }
  };

  return response;
}

async function dispatchApi(request, url) {
  let pathname = url.pathname || "/";
  while (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  const handler = API_ROUTES.get(pathname);

  if (pathname === "/api/health") {
    return Response.json(
      {
        status: "ok",
        service: "FundLens",
        runtime: "Cloudflare Workers",
        routes: [...API_ROUTES.keys()],
        checkedAt: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  }

  if (!handler) {
    return Response.json(
      { error: "Unknown FundLens API route.", path: pathname },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const req = {
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: Object.fromEntries(request.headers.entries())
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    req.body = await request.clone().text();
  }

  const res = createResponseAdapter();

  try {
    const result = await handler(req, res);
    if (result instanceof Response) return result;

    return Response.json(
      { error: "The API handler did not return a valid response." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return Response.json(
      {
        error: "FundLens API request failed.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return dispatchApi(request, url);
    }

    if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response(
        "FundLens static asset binding is not configured. Deploy with wrangler.jsonc.",
        {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" }
        }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
