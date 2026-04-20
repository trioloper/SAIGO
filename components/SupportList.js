import { useEffect, useRef, useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import OrderSlideSwitch from './OrderSlideSwitch';
import menuData from '../data/menu.json';

// Build a lookup: item id/name -> { category, image }
function buildMenuLookup(menu) {
  const byId = {};
  const byName = {};
  for (const cat of menu) {
    for (const item of cat.items) {
      const entry = {
        category: cat.category,
        image: item.image || '/menu/default.jpg',
      };
      if (item.id) byId[String(item.id)] = entry;
      if (item.name) byName[item.name.toLowerCase()] = entry;
    }
  }
  return { byId, byName };
}

function lookupItem(lookup, item) {
  // Prefer stored category/image from order data
  if (item.category) {
    return {
      category: item.category,
      image: item.image || '/menu/default.jpg',
    };
  }
  if (item.id && lookup.byId[String(item.id)])
    return lookup.byId[String(item.id)];
  if (item.name && lookup.byName[item.name.toLowerCase()])
    return lookup.byName[item.name.toLowerCase()];
  return { category: 'Other', image: '/menu/default.jpg' };
}

// Group order items by category
function groupByCategory(items, lookup) {
  const groups = {};
  for (const it of items) {
    const info = lookupItem(lookup, it);
    if (!groups[info.category]) groups[info.category] = [];
    groups[info.category].push({ ...it, image: it.image || info.image });
  }
  return groups;
}

export default function SupportList() {
  const [orders, setOrders] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [deletingId, setDeletingId] = useState(null);

  const isFetchingRef = useRef(false);
  const countdownIntervalRef = useRef(null);
  const RELOAD_INTERVAL = 10; // seconds

  const menuLookup = useMemo(() => buildMenuLookup(menuData), []);

  // ---- helpers: placed time detection + formatting ----
  const getPlacedDate = (o) => {
    try {
      // Prefer explicit history “placed” record if available
      if (Array.isArray(o?.history)) {
        const placedEvents = o.history
          .filter((e) => (e?.status || e?.type) === 'placed' && e?.at)
          .sort((a, b) => new Date(a.at) - new Date(b.at));
        if (placedEvents.length) {
          const d = new Date(placedEvents[placedEvents.length - 1].at);
          if (!isNaN(d)) return d;
        }
      }

      // Common timestamp fields
      const candidates = [
        o?.placedAt,
        o?.createdAt,
        o?.created_at,
        o?.created,
        o?.timestamp,
        o?.date,
      ];
      for (const c of candidates) {
        if (!c) continue;
        const d = new Date(c);
        if (!isNaN(d)) return d;
      }
    } catch {}
    return null;
  };

  const formatAbsolute = (d) =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);

  const formatRelative = (d) => {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const diffMs = d.getTime() - Date.now();
    const seconds = Math.round(diffMs / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    return rtf.format(days, 'day');
  };

  // -----------------------------------------------------

  const fetchOrders = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingList(true);
    try {
      const res = await fetch('/api/orderHandler?list=true', {
        cache: 'no-store',
      });
      const data = await res.json();
      const all = Array.isArray(data?.orders) ? data.orders : [];
      // Only show non-completed orders (completed ones go to history)
      setOrders(all.filter((o) => o.status !== 'completed'));
      setLastUpdated(new Date());
      setSecondsLeft(RELOAD_INTERVAL); // reset countdown
    } finally {
      isFetchingRef.current = false;
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchOrders(); // initial load

    // countdown + auto reload
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          fetchOrders(); // trigger reload at 0
          return RELOAD_INTERVAL;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const updateLocalStatus = (id, nextStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, status: nextStatus } : o)),
    );
    // Auto-hide completed orders after 5 seconds
    if (nextStatus === 'completed') {
      setTimeout(() => {
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }, 5000);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!orderId) return;
    const yes = confirm('Delete this order permanently?');
    if (!yes) return;

    setDeletingId(orderId);
    try {
      const res = await fetch('/api/orderHandler?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to delete order');
      }
      // Optimistically remove from local list
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with reload button and countdown */}
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">Support Orders</h2>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-white/60">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <span className="text-xs text-white/60">
            Reloading in{' '}
            <span className="font-semibold text-white">{secondsLeft}s</span>
          </span>

          <button
            onClick={fetchOrders}
            disabled={loadingList}
            title="Reload now"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <RotateCcw
              className={`w-4 h-4 ${loadingList ? 'animate-spin text-blue-300' : 'text-white'}`}
            />
            <span className="hidden sm:inline">
              {loadingList ? 'Reloading...' : 'Reload'}
            </span>
          </button>
        </div>
      </div>

      {/* Skeleton */}
      {loadingList && orders.length === 0 && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/10 border border-white/15 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Orders */}
      <div className="space-y-4">
        {orders.map((o) => {
          const adult = o?.adult ?? 0;
          const barn1 = o?.Barn1 ?? 0;
          const barn2 = o?.Barn2 ?? 0;
          const status = o.status || 'placed';
          const isComplete = status === 'completed';

          const placedAtDate = getPlacedDate(o);
          const placedAbs = placedAtDate ? formatAbsolute(placedAtDate) : null;
          const placedRel = placedAtDate ? formatRelative(placedAtDate) : null;

          return (
            <article
              key={o._id}
              className="rounded-2xl bg-white/8 border border-white/20 text-white p-4 md:p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold">
                      Table #{o.tableNo}
                    </h3>

                    <button
                      onClick={() => deleteOrder(o._id)}
                      disabled={deletingId === o._id}
                      className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-all
                        ${
                          deletingId === o._id
                            ? 'bg-red-800 border-red-700 text-red-200 cursor-wait'
                            : 'bg-red-700 border-red-600 text-white hover:bg-red-800'
                        }`}
                      title="Delete order"
                      aria-label={`Delete order for table ${o.tableNo}`}
                    >
                      {deletingId === o._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>

                  <div className="text-white/70 text-xs mt-1">
                    Placed:{' '}
                    {placedAtDate ? (
                      <time
                        dateTime={placedAtDate.toISOString()}
                        title={placedAbs}
                      >
                        {placedAbs}{' '}
                        <span className="opacity-70">({placedRel})</span>
                      </time>
                    ) : (
                      <span className="opacity-70">—</span>
                    )}
                  </div>
                </div>

                <OrderSlideSwitch
                  orderId={o._id}
                  tableNo={o.tableNo}
                  status={status}
                  onStatusChange={(nextStatus) =>
                    updateLocalStatus(o._id, nextStatus)
                  }
                />
              </div>

              {/* People chips */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
                  <span className="opacity-80 mr-1">Adult:</span>
                  <span className="font-semibold">{adult}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
                  <span className="opacity-80 mr-1">Barn 7–12 ÅR:</span>
                  <span className="font-semibold">{barn1}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
                  <span className="opacity-80 mr-1">Barn 3–6 ÅR:</span>
                  <span className="font-semibold">{barn2}</span>
                </span>
              </div>

              {Array.isArray(o.items) && o.items.length > 0 ? (
                <div className="mb-3">
                  {/* Horizontal scrollable categories */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(groupByCategory(o.items, menuLookup)).map(
                      ([category, items]) => (
                        <div
                          key={category}
                          className="rounded-xl bg-black/25 border border-white/10 p-2.5 min-w-[140px]"
                        >
                          {/* Category header */}
                          <div className="mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                              {category}
                            </span>
                            <span className="text-[10px] text-white/40 ml-1.5">
                              {items.length}
                            </span>
                          </div>
                          {/* Items stacked inside this category card */}
                          <div className="space-y-1.5">
                            {items.map((it, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 bg-white/8 rounded-lg px-2 py-1"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={it.image}
                                  alt={it.name}
                                  className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.src = '/menu/default.jpg';
                                  }}
                                />
                                <span className="text-white text-xs font-medium truncate">
                                  {it.name}
                                </span>
                                <span className="text-amber-300/90 text-[10px] font-bold ml-auto flex-shrink-0">
                                  ×{it.qty}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  {/* Total */}
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <span className="text-white/50 text-xs">
                      Total: {o.items.reduce((s, it) => s + (it.qty || 1), 0)}{' '}
                      items
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-white/70 mb-3 text-sm">No items.</div>
              )}

              <div className="text-white/70 text-sm">
                Status:{' '}
                {isComplete ? (
                  <span className="text-green-300 font-semibold">
                    Completed
                  </span>
                ) : (
                  <span className="text-red-300 font-semibold">
                    Not completed
                  </span>
                )}
              </div>
            </article>
          );
        })}

        {orders.length === 0 && !loadingList && (
          <div className="rounded-xl bg-white/5 border border-white/15 p-4 text-white/80">
            No orders yet.
          </div>
        )}
      </div>
    </div>
  );
}
