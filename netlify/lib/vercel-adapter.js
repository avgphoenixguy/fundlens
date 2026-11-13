'use strict';

// Adapts the existing Vercel-style (req, res) API handlers to Netlify's
// Lambda-compatible function response format. The original API logic stays
// unchanged, so Vercel can continue to deploy the same handlers independently.
function adaptVercelHandler(vercelHandler) {
  if (typeof vercelHandler !== "function") {
    throw new TypeError("Expected a Vercel-style API handler function.");
  }

  return async function netlifyHandler(event) {
    const headers = {};
    let statusCode = 200;

    const req = {
      method: event.httpMethod || "GET",
      query: event.queryStringParameters || {},
      headers: event.headers || {},
      body: event.body || undefined
    };

    const res = {
      setHeader(name, value) {
        headers[String(name).toLowerCase()] = String(value);
        return this;
      },

      status(code) {
        const parsed = Number(code);
        if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
          statusCode = parsed;
        }
        return this;
      },

      json(payload) {
        const responseHeaders = {
          ...headers,
          "content-type": "application/json; charset=utf-8"
        };
        return {
          statusCode,
          headers: responseHeaders,
          body: JSON.stringify(payload)
        };
      },

      end(body) {
        return {
          statusCode,
          headers,
          body: body == null ? "" : String(body)
        };
      }
    };

    const result = await vercelHandler(req, res);

    if (
      result &&
      Number.isInteger(result.statusCode) &&
      typeof result.body === "string"
    ) {
      return result;
    }

    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: "The API handler did not return a valid response."
      })
    };
  };
}

module.exports = { adaptVercelHandler };
