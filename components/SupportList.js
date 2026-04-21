import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { RotateCcw, Check, ChefHat, Clock } from 'lucide-react';
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

// ─── Double-tap / double-click hook ──────────────────────────────────────────
// Returns a handler that fires `onDoubleActivate` on:
//   • Desktop: double-click (native dblclick)
//   • Mobile : two taps within 350 ms on the same target
function useDoubleActivate(onDoubleActivate) {
  const lastTap = useRef(0);

  const handleClick = useCallback((e) => {
    // Desktop: native dblclick fires separately; single click does nothing
  }, []);

  const handleDoubleClick = useCallback(
    (e) => {
      e.preventDefault();
      onDoubleActivate(e);
    },
    [onDoubleActivate],
  );

  const handleTouchEnd = useCallback(
    (e) => {
      const now = Date.now();
      if (now - lastTap.current < 350) {
        e.preventDefault();
        onDoubleActivate(e);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [onDoubleActivate],
  );

  return {
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onTouchEnd: handleTouchEnd,
  };
}

// ─── Single item card ─────────────────────────────────────────────────────────
function ItemCard({ item, globalIndex, orderId, isUpdating, onToggle }) {
  const [ripple, setRipple] = useState(false);
  const isFinished = item.finished || false;

  const triggerToggle = useCallback(() => {
    if (isUpdating) return;
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
    onToggle(orderId, globalIndex);
  }, [isUpdating, onToggle, orderId, globalIndex]);

  const handlers = useDoubleActivate(triggerToggle);

  return (
    <div
      {...handlers}
      role="button"
      tabIndex={0}
      aria-label={`${item.name} — ${isFinished ? "done, double-click to undo" : "double-click to mark done"}`}
      onKeyDown={(e) => {
        // Space or Enter = toggle (keyboard accessibility)
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          triggerToggle();
        }
      }}
      className="relative w-full flex items-center gap-2.5 rounded-xl px-3 py-2 select-none cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        background: isFinished
          ? "rgba(34, 197, 94, 0.12)"
          : "rgba(255, 255, 255, 0.07)",
        border: isFinished
          ? "1.5px solid rgba(34, 197, 94, 0.35)"
          : "1.5px solid rgba(255,255,255,0.1)",
        opacity: isUpdating ? 0.6 : 1,
        transform: ripple ? "scale(0.97)" : "scale(1)",
        boxShadow: isFinished ? "0 0 12px rgba(34, 197, 94, 0.08)" : "none",
      }}
      title={
        isFinished ? "Double-click to undo" : "Double-click to mark as done"
      }
    >
      {/* Ripple overlay */}
      {ripple && (
        <span
          className="absolute inset-0 rounded-xl animate-ping"
          style={{
            background: isFinished
              ? "rgba(239,68,68,0.15)"
              : "rgba(34,197,94,0.2)",
            animationDuration: "0.35s",
            animationIterationCount: 1,
          }}
        />
      )}

      {/* Check circle */}
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: isFinished
            ? "rgba(34,197,94,0.25)"
            : "rgba(255,255,255,0.08)",
          border: isFinished
            ? "2px solid rgba(34,197,94,0.7)"
            : "2px solid rgba(255,255,255,0.2)",
        }}
      >
        {isUpdating ? (
          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : isFinished ? (
          <Check className="w-3.5 h-3.5 text-green-300" strokeWidth={3} />
        ) : null}
      </div>

      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image}
        alt={item.name}
        className="w-8 h-8 rounded-lg object-cover flex-shrink-0 transition-all duration-300"
        style={{
          opacity: isFinished ? 0.45 : 1,
          filter: isFinished ? "grayscale(60%)" : "none",
        }}
        onError={(e) => {
          e.currentTarget.src = "/menu/default.jpg";
        }}
      />

      {/* Name */}
      <span
        className="text-xs font-semibold truncate flex-1 text-left transition-all duration-200"
        style={{
          color: isFinished ? "rgba(255,255,255,0.38)" : "white",
          textDecoration: isFinished ? "line-through" : "none",
        }}
      >
        {item.name}
      </span>

      {/* Qty badge */}
      <span
        className="text-[11px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-md"
        style={{
          background: isFinished
            ? "rgba(255,255,255,0.05)"
            : "rgba(251,191,36,0.15)",
          color: isFinished
            ? "rgba(255,255,255,0.25)"
            : "rgba(251,191,36,0.95)",
          border: isFinished
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(251,191,36,0.25)",
        }}
      >
        ×{item.qty}
      </span>

      {/* Double-click hint — only shown on unfinished, non-touch hint */}
      {/* {!isFinished && (
        <span className="hidden sm:block text-[9px] text-white/20 flex-shrink-0 italic">
          dbl-click
        </span>
      )} */}
    </div>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  items,
  orderId,
  updatingItem,
  onToggle,
  onMarkAllDone,
}) {
  const total = items.length;
  const finished = items.filter((it) => it.finished).length;
  const allDone = finished === total;
  const pct = Math.round((finished / total) * 100);

  return (
    <div
      className="rounded-2xl border p-3 min-w-[160px] transition-all duration-300"
      style={{
        background: allDone ? "rgba(34,197,94,0.07)" : "rgba(0,0,0,0.25)",
        borderColor: allDone ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)",
      }}
    >
      {/* Category header */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ChefHat
            className="w-3 h-3 flex-shrink-0"
            style={{
              color: allDone ? "rgba(134,239,172,0.8)" : "rgba(251,191,36,0.7)",
            }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-wider truncate"
            style={{
              color: allDone ? "rgba(134,239,172,0.9)" : "rgba(251,191,36,0.9)",
            }}
          >
            {category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Progress fraction */}
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: allDone
                ? "rgba(34,197,94,0.2)"
                : "rgba(251,191,36,0.15)",
              color: allDone
                ? "rgba(134,239,172,0.95)"
                : "rgba(252,211,77,0.9)",
            }}
          >
            {finished}/{total}
          </span>

          {/* Mark all done button */}
          {!allDone && (
            <button
              onClick={() => onMarkAllDone(items)}
              className="text-[9px] px-1.5 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(251,191,36,0.1)",
                borderColor: "rgba(251,191,36,0.25)",
                color: "rgba(252,211,77,0.8)",
              }}
              title={`Mark all ${category} items as done`}
            >
              All done
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: allDone
              ? "rgba(34,197,94,0.7)"
              : "rgba(251,191,36,0.6)",
          }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((it, localIdx) => {
          const isUpdating =
            updatingItem?.orderId === orderId &&
            updatingItem?.itemIndex === it._globalIndex;

          return (
            <ItemCard
              key={localIdx}
              item={it}
              globalIndex={it._globalIndex}
              orderId={orderId}
              isUpdating={isUpdating}
              onToggle={onToggle}
            />
          );
        })}
      </div>

      {/* All done stamp */}
      {allDone && (
        <div className="mt-2 flex items-center justify-center gap-1 text-green-300 text-[10px] font-bold">
          <Check className="w-3 h-3" />
          Ready to serve
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SupportList() {
  const [orders, setOrders] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingItem, setUpdatingItem] = useState(null); // { orderId, itemIndex }

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
    if (nextStatus === "completed") {
      setTimeout(
        () => setOrders((prev) => prev.filter((o) => o._id !== id)),
        5000,
      );
    }
  };

  // ── Toggle single item ──────────────────────────────────────────────────────
  const toggleItemFinished = useCallback(async (orderId, itemIndex) => {
    setUpdatingItem({ orderId, itemIndex });

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => {
        if (o._id !== orderId) return o;
        const newItems = [...o.items];
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          finished: !newItems[itemIndex].finished,
        };
        return { ...o, items: newItems };
      }),
    );

    try {
      const res = await fetch("/api/orderHandler?action=toggleItemFinished", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, itemIndex }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed");
      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? data.order : o)),
        );
      }
    } catch (e) {
      console.error("Failed to toggle item:", e);
      // Revert
      setOrders((prev) =>
        prev.map((o) => {
          if (o._id !== orderId) return o;
          const newItems = [...o.items];
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            finished: !newItems[itemIndex].finished,
          };
          return { ...o, items: newItems };
        }),
      );
      alert("Failed to update item status. Please try again.");
    } finally {
      setUpdatingItem(null);
    }
  }, []);

  // ── Mark all items in a category as done ────────────────────────────────────
  const markCategoryAllDone = useCallback(
    async (orderId, categoryItems) => {
      const unfinished = categoryItems.filter((it) => !it.finished);
      if (unfinished.length === 0) return;

      // Fire all toggles sequentially (avoid race conditions)
      for (const it of unfinished) {
        await toggleItemFinished(orderId, it._globalIndex);
      }
    },
    [toggleItemFinished],
  );

  // ── Delete order ────────────────────────────────────────────────────────────
  const deleteOrder = async (orderId) => {
    if (!orderId) return;
    if (!confirm("Delete this order permanently?")) return;
    setDeletingId(orderId);
    try {
      const res = await fetch("/api/orderHandler?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success)
        throw new Error(data?.message || "Failed to delete order");
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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

      {/* Hint banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-200/70 text-xs">
        <ChefHat className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>Chef tip:</strong> Double-click (or double-tap on mobile) any
          dish to mark it as done. Use <em>All done</em> to finish an entire
          category at once.
        </span>
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

          const totalItems = o.items?.length || 0;
          const finishedItems =
            o.items?.filter((it) => it.finished).length || 0;
          const orderProgress =
            totalItems > 0 ? Math.round((finishedItems / totalItems) * 100) : 0;

          // Attach _globalIndex to each item before grouping
          const itemsWithIndex = (o.items || []).map((it, idx) => ({
            ...it,
            _globalIndex: idx,
          }));
          const grouped = groupByCategory(itemsWithIndex, menuLookup);

          return (
            <article
              key={o._id}
              className="rounded-2xl bg-white/8 border border-white/20 text-white p-4 md:p-5 transition-all duration-300"
              style={{
                borderColor:
                  orderProgress === 100
                    ? "rgba(34,197,94,0.35)"
                    : "rgba(255,255,255,0.2)",
              }}
            >
              {/* Order header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
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
                    >
                      {deletingId === o._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <div className="text-white/70 text-xs mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Placed: </span>
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

                {/* Progress badge */}
                {totalItems > 0 && (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{
                      background:
                        orderProgress === 100
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(251,191,36,0.15)",
                      borderColor:
                        orderProgress === 100
                          ? "rgba(34,197,94,0.3)"
                          : "rgba(251,191,36,0.3)",
                      color:
                        orderProgress === 100
                          ? "rgba(134,239,172,0.9)"
                          : "rgba(252,211,77,0.9)",
                    }}
                  >
                    {finishedItems}/{totalItems}
                    {/* done */}
                  </span>
                )}

                <OrderSlideSwitch
                  orderId={o._id}
                  tableNo={o.tableNo}
                  status={status}
                  onStatusChange={(nextStatus) =>
                    updateLocalStatus(o._id, nextStatus)
                  }
                />
              </div>

              {/* Overall progress bar */}
              {totalItems > 0 && (
                <div className="mb-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${orderProgress}%`,
                      background:
                        orderProgress === 100
                          ? "rgba(34,197,94,0.7)"
                          : "linear-gradient(90deg, rgba(251,191,36,0.7), rgba(251,191,36,0.5))",
                    }}
                  />
                </div>
              )}

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

              {/* Category cards */}
              {itemsWithIndex.length > 0 ? (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(grouped).map(([category, items]) => (
                      <CategoryCard
                        key={category}
                        category={category}
                        items={items}
                        orderId={o._id}
                        updatingItem={updatingItem}
                        onToggle={toggleItemFinished}
                        onMarkAllDone={(categoryItems) =>
                          markCategoryAllDone(o._id, categoryItems)
                        }
                      />
                    ))}
                  </div>

                  {/* Footer summary */}
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-white/50 text-xs">
                      Total: {o.items.reduce((s, it) => s + (it.qty || 1), 0)}{' '}
                      items
                    </span>
                    {orderProgress === 100 && (
                      <span className="text-green-300 text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        All items prepared — ready to serve!
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-white/70 mb-3 text-sm">No items.</div>
              )}

              {/* Status */}
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
