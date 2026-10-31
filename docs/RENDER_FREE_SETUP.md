# Render Free — manual first deployment

This checkpoint is prepared for a single Node Web Service, not a Static Site. No Render integration, database, paid instance or pinger is created by this project.

1. Send the empty GitHub repo URL in the Work chat. GitHub is connected as `sher-prog`; repository permission remains unverified until that repo is identified. Ensure the connection can access that repository. Do not paste a token or password. The builder will publish the complete tested checkpoint atomically to main; later pushes to main are tested checkpoints only.
2. In your own Render dashboard, choose **New → Web Service**, connect that GitHub repository and use these values:

| Setting | Value |
|---|---|
| Runtime | Node |
| Branch | `main` |
| Root Directory | Blank (project files will be at repository root) |
| Instance type | **Free** |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check | `/healthz` |
| Auto Deploy | On commit to `main` |
| Node | `.node-version`: `24.22.1`; engines `>=24.22.1 <25` |
| Environment | No secrets needed. Leave Render's `PORT` intact. Remove conflicting `NODE_VERSION`, or set it to `24.22.1`. |
| Instances | One; room state is in memory |

3. Keep the service and workspace within free allowances. Do not enable paid add-ons or automatic paid upgrades. Review Render's current billing/usage controls; the project does not configure them. If a payment method exists, confirm a zero-spend limit for usage overages rather than assuming the Free instance selection alone prevents all charges.
4. After Render says Live, send its exact HTTPS `onrender.com` URL in this chat. The builder will check `/healthz`, page load, WebSocket handshake and create/join against that URL, then send it as the verified public checkpoint. An internal Work preview does not satisfy this step.
5. On iPhone Safari over cellular (Wi-Fi OFF), open the public URL in a private window. Confirm the page loads, **River connected** appears, and Create/Join work with a second device. This checkpoint intentionally has no race Start yet.
6. You may configure your separately supplied FREE external pinger to GET `<public-url>/healthz` every 10 minutes. The builder does not create it. Report cold-start time separately if it isn't active.

Render Free can sleep after 15 minutes without inbound HTTP or WebSocket traffic, takes roughly a minute to wake, may restart, and has free usage quotas. Availability is not guaranteed. Restarting loses all rooms; clients with an old boot identifier return Home with `The server restarted. Start a new room.`

## Local verification already performed

`npm ci && npm run build` succeeded on Node v24.22.1 in this Work container. Automated tests exercise the actual `npm start` process, an ephemeral `PORT`, HTTP and WebSocket, and two independent boot identifiers. See `reports/deployment-smoke.json`. This is local evidence, not an actual Render Free measurement.

## Official references checked October 31, 2026

- https://render.com/docs/node-version — Node 24.22.1 default; override precedence and bounded engines.
- https://render.com/docs/web-services — Node Web Services and PORT binding.
- https://render.com/docs/websocket — WSS and connection interruptions/reconnect backoff.
- https://render.com/docs/free — sleep/wake, restart/ephemeral state and usage allowances/overages.
