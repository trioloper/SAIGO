// pages/api/orderHandler.js
export default async function handler(req, res) {
  const RAW_BASE = process.env.SERVER_BASE_URL || 'http://localhost:8000';
  const BASE = RAW_BASE.replace(/\/+$/, ''); // strip trailing slash

  // Fetch timeout helper — 30 s allows MongoDB to reconnect after idle
  const fetchWithTimeout = async (url, options = {}, ms = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };

  try {
    if (req.method === 'POST') {
      const action = String(
        req.query.action || req.body?.action || '',
      ).toLowerCase();
      const body = req.body ?? {};

      // validate inputs for actions targeting an existing order
      if (action === 'completed' || action === 'reopen') {
        const hasOrderId =
          typeof body.orderId === 'string' && body.orderId.trim().length > 0;
        const hasTableNo = body.tableNo != null && Number(body.tableNo) > 0;
        if (!hasOrderId && !hasTableNo) {
          return res.status(400).json({
            success: false,
            message:
              'Provide either orderId or a valid tableNo to perform this action',
          });
        }
      }

      // NEW: delete
      if (action === 'delete') {
        const { orderId } = body || {};
        if (!orderId || String(orderId).trim().length === 0) {
          return res
            .status(400)
            .json({ success: false, message: 'orderId is required to delete' });
        }
        const endpoint = `${BASE}/api/orders/${encodeURIComponent(orderId)}`;
        const upstream = await fetchWithTimeout(endpoint, { method: 'DELETE' });
        const data = await upstream.json().catch(() => ({}));
        return res.status(upstream.status).json(data);
      }

      // Route to correct upstream endpoint
      let endpoint = `${BASE}/api/orders`; // default upsert
      if (action === 'completed') endpoint = `${BASE}/api/orders/complete`;
      if (action === 'reopen') endpoint = `${BASE}/api/orders/reopen`;

      const upstream = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json(data);
    }

    if (req.method === 'GET') {
      const { tableNo, orderId } = req.query;

      // If tableNo provided, fetch by table
      if (tableNo) {
        const n = Number(tableNo);
        if (!Number.isFinite(n) || n <= 0) {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid tableNo' });
        }
        const r = await fetchWithTimeout(`${BASE}/api/orders/${n}`);
        const data = await r.json().catch(() => ({}));
        return res.status(r.status).json(data);
      }

      // Otherwise pull all, with optional single-order filter by orderId
      const r = await fetchWithTimeout(`${BASE}/api/orders`);
      const data = await r.json().catch(() => ({}));

      if (orderId && data?.orders) {
        const found = data.orders.find(
          (o) => String(o._id) === String(orderId),
        );
        return res.status(200).json({ success: true, order: found || null });
      }

      return res.status(r.status).json(data);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    if (err?.name === 'AbortError') {
      return res.status(504).json({ message: 'Upstream request timed out' });
    }
    console.error('Next handler error:', err);
    return res
      .status(500)
      .json({ message: 'Proxy error', error: err?.message || String(err) });
  }
}
