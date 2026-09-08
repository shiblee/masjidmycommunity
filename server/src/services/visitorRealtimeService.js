// In-process Server-Sent-Events broadcaster for the public visitor counter.
// Deliberately not WebSockets: the browser only ever needs one-way "the
// total changed" pushes, and native EventSource's built-in auto-reconnect
// gives the "graceful fallback if the connection drops" requirement for
// free, with no client-side library and no extra nginx Upgrade config.
//
// This assumes a single Node process (pm2 "fork" mode, not "cluster") —
// an in-process broadcaster can't reach clients connected to a sibling
// process. Fine at this app's scale; if that ever changes, this is the one
// file that would need a Redis pub/sub layer swapped in underneath it.
const PUBLIC_CLIENTS = new Set();
const MAX_PUBLIC_CLIENTS = 2000;

const KEEPALIVE_MS = 25000;
const DEBOUNCE_MS = 2000;

let debounceTimer = null;
let lastBroadcastTotal = null;

function writeEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** Returns false if the connection was refused (too many already open) —
 * caller responds accordingly; true once the stream is set up. */
export function addPublicClient(req, res, initialTotal) {
  if (PUBLIC_CLIENTS.size >= MAX_PUBLIC_CLIENTS) return false;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // nginx buffers proxied responses by default, which would hold every
    // event until the buffer fills — this header tells it not to for this
    // response (honored natively, no nginx config change needed).
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 5000\n\n");
  writeEvent(res, { total: initialTotal });

  const keepalive = setInterval(() => res.write(": keepalive\n\n"), KEEPALIVE_MS);
  PUBLIC_CLIENTS.add(res);

  req.on("close", () => {
    clearInterval(keepalive);
    PUBLIC_CLIENTS.delete(res);
  });
  return true;
}

/** Called after a genuinely new Visitor row is inserted. Coalesces bursts
 * of new visitors (e.g. several tabs opening at once) into one broadcast
 * every DEBOUNCE_MS, and never re-sends a total that hasn't changed. */
export function schedulePublicBroadcast(getCurrentTotal) {
  if (debounceTimer) return;
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    const total = await getCurrentTotal();
    if (total === lastBroadcastTotal) return;
    lastBroadcastTotal = total;
    for (const res of PUBLIC_CLIENTS) writeEvent(res, { total });
  }, DEBOUNCE_MS);
}

export function publicClientCount() {
  return PUBLIC_CLIENTS.size;
}

// ===== Admin "Online Now" stream =====
// One shared tick computes the online-visitors snapshot ONCE and fans it
// out to every connected admin — a dashboard left open by several admins
// at once still costs exactly one query per tick, not one per viewer.
const ADMIN_CLIENTS = new Set();
const ADMIN_TICK_MS = 5000;
let adminTickTimer = null;
let lastAdminPayload = null;

async function adminTick(getSnapshot) {
  if (ADMIN_CLIENTS.size === 0) {
    clearInterval(adminTickTimer);
    adminTickTimer = null;
    return;
  }
  const snapshot = await getSnapshot();
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastAdminPayload) return;
  lastAdminPayload = serialized;
  for (const res of ADMIN_CLIENTS) writeEvent(res, snapshot);
}

export function addAdminClient(req, res, getSnapshot) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 5000\n\n");

  getSnapshot().then((snapshot) => writeEvent(res, snapshot));

  const keepalive = setInterval(() => res.write(": keepalive\n\n"), KEEPALIVE_MS);
  ADMIN_CLIENTS.add(res);
  if (!adminTickTimer) adminTickTimer = setInterval(() => adminTick(getSnapshot), ADMIN_TICK_MS);

  req.on("close", () => {
    clearInterval(keepalive);
    ADMIN_CLIENTS.delete(res);
  });
}
