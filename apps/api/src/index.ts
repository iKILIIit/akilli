import { createServer } from "node:http";
import { readServerEnv } from "@yield-copilot/shared";
import { handleExecutionPlan } from "./routes/execution-plan";
import { handlePositions } from "./routes/positions";
import { handleRecommend } from "./routes/recommend";
import { handleVenues } from "./routes/venues";

const env = readServerEnv(process.env);

function sendJson(response: import("node:http").ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function readBody(request: import("node:http").IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk.toString();
    });

    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true, service: "yield-copilot-api" });
    }

    if (request.method === "GET" && url.pathname === "/venues") {
      return sendJson(response, 200, handleVenues(query));
    }

    if (request.method === "POST" && url.pathname === "/recommend") {
      return sendJson(response, 200, handleRecommend(await readBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/execution-plan") {
      return sendJson(response, 200, handleExecutionPlan(await readBody(request)));
    }

    if (request.method === "GET" && url.pathname.startsWith("/positions/")) {
      const address = url.pathname.split("/").at(-1) ?? "";
      return sendJson(response, 200, handlePositions(address, query));
    }

    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}).listen(env.PORT, () => {
  console.log(`Yield Copilot API listening on http://localhost:${env.PORT}`);
});
