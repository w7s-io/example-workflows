type Env = {
  STATE: KVNamespace;
  W7S_WORKFLOW: Fetcher;
  W7S_WORKFLOW_TOKEN: string;
  W7S_REPOSITORY: string;
  W7S_ENVIRONMENT: string;
};

const json = (value: unknown, init: ResponseInit = {}) =>
  Response.json(value, {
    ...init,
    headers: {
      "cache-control": "no-cache",
      ...init.headers
    }
  });

const readLast = async (env: Env) =>
  (await env.STATE.get("last-workflow", "json")) ?? null;

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        service: "example-workflows",
        status: "ok",
        repository: env.W7S_REPOSITORY,
        environment: env.W7S_ENVIRONMENT,
        startUrl: "/start?orderId=demo",
        lastUrl: "/last"
      });
    }

    if (url.pathname === "/start") {
      const orderId = url.searchParams.get("orderId") || crypto.randomUUID();
      const instanceSeed = `order-${orderId}`.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80);
      const response = await env.W7S_WORKFLOW.fetch(
        "https://w7s.internal/api/v1/workflows/w7s-io/example-workflows/process-order",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.W7S_WORKFLOW_TOKEN}`,
            "content-type": "application/json",
            "x-w7s-workflow-caller": env.W7S_REPOSITORY,
            "x-w7s-workflow-environment": env.W7S_ENVIRONMENT,
            "x-w7s-workflow-instance-id": instanceSeed
          },
          body: JSON.stringify({
            orderId,
            requestedAt: new Date().toISOString()
          })
        }
      );

      const body = await response.json();
      return json({
        service: "example-workflows",
        workflowResponseStatus: response.status,
        ...body
      }, {
        status: response.ok ? 200 : 502
      });
    }

    if (url.pathname === "/_w7s/workflows/process-order" && request.method === "POST") {
      const run = await request.json();
      const record = {
        receivedAt: new Date().toISOString(),
        headers: {
          workflow: request.headers.get("x-w7s-workflow"),
          name: request.headers.get("x-w7s-workflow-name"),
          instance: request.headers.get("x-w7s-workflow-instance")
        },
        run
      };
      await env.STATE.put("last-workflow", JSON.stringify(record));
      return json({
        ok: true,
        processedOrderId: run.payload?.orderId,
        instanceId: run.instanceId
      });
    }

    if (url.pathname === "/last") {
      return json({
        service: "example-workflows",
        last: await readLast(env)
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
