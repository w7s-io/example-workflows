# example-workflows

Minimal W7S backend that declares a workflow and starts it through `W7S_WORKFLOW`.

Live URL after deploy:

```text
https://w7s-io.w7s.cloud/example-workflows/
```

Try it:

```sh
curl "https://w7s-io.w7s.cloud/example-workflows/start?orderId=demo"
curl "https://w7s-io.w7s.cloud/example-workflows/last"
```

The app declares `process-order` in `w7s.json`. W7S starts a Cloudflare Workflow instance in the core worker and dispatches a durable step to `/_w7s/workflows/process-order`.
