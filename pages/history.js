import { useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import tablesData from '../data/tables.json';

export default function OrderHistory() {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchOrders = useCallback(async (tableNo) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orderHandler?tableNo=${tableNo}`);
      const data = await res.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectTable = (t) => {
    setSelectedTable(t);
    fetchOrders(t);
  };

  const deleteOrder = async (orderId) => {
    if (!orderId) return;
    const yes = confirm('Delete this order permanently?');
    if (!yes) return;
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/orderHandler?action=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        alert('Failed to delete order');
      }
    } catch {
      alert('Network error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return '—';
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Group items by category
  const groupItems = (items) => {
    const groups = {};
    for (const it of items || []) {
      const cat = it.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    }
    return groups;
  };

  return (
    <>
      <Head>
        <title>Order History | Restaurant</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#1a3a2e] via-[#1d3f32] to-[#152b23] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                Order History
              </h1>
              <p className="text-white/50 text-sm mt-1">
                View all orders by table
              </p>
            </div>
            <button
              onClick={() => router.push('/menu')}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm hover:bg-white/15 transition"
            >
              ← Back to Menu
            </button>
          </div>

          {/* Table selector */}
          <div className="mb-6">
            <p className="text-white/60 text-sm mb-3">Select a table:</p>
            <div className="flex flex-wrap gap-2">
              {tablesData.map((t) => (
                <button
                  key={t}
                  onClick={() => selectTable(t)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition border ${
                    selectedTable === t
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Orders */}
          {selectedTable && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">
                Table #{selectedTable}
                <span className="text-white/50 font-normal text-sm ml-2">
                  {loading
                    ? 'Loading...'
                    : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
                </span>
              </h2>

              {loading && (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-white/10 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!loading && orders.length === 0 && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center text-white/50">
                  No orders found for Table #{selectedTable}
                </div>
              )}

              {!loading && (
                <div className="space-y-4">
                  {orders.map((o) => {
                    const groups = groupItems(o.items);
                    const isComplete = o.status === 'completed';
                    return (
                      <div
                        key={o._id}
                        className="rounded-xl bg-white/8 border border-white/15 p-4"
                      >
                        {/* Order header */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                isComplete
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {isComplete ? 'Completed' : 'Placed'}
                            </span>
                            <span className="text-white/50 text-xs ml-2">
                              {formatDate(o.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs text-white/50">
                            Adult: {o.adult || 0} | Barn 7-12: {o.Barn1 || 0} |
                            Barn 3-6: {o.Barn2 || 0}
                          </div>
                        </div>

                        {/* Grouped items */}
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(groups).map(([cat, items]) => (
                            <div
                              key={cat}
                              className="rounded-lg bg-black/25 border border-white/10 p-2 min-w-[130px]"
                            >
                              <div className="mb-1.5">
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[9px] font-bold uppercase tracking-wider">
                                  {cat}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {items.map((it, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-1.5 text-xs"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={it.image || '/menu/default.jpg'}
                                      alt={it.name}
                                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          '/menu/default.jpg';
                                      }}
                                    />
                                    <span className="text-white truncate">
                                      {it.name}
                                    </span>
                                    <span className="text-amber-300/80 font-bold ml-auto flex-shrink-0">
                                      ×{it.qty}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Summary */}
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                          <span>
                            {(o.items || []).reduce(
                              (s, it) => s + (it.qty || 1),
                              0,
                            )}{' '}
                            items
                          </span>
                          <div className="flex items-center gap-3">
                            {o.payable > 0 && (
                              <span className="text-amber-300 font-bold">
                                {o.payable} KR
                              </span>
                            )}
                            <button
                              onClick={() => deleteOrder(o._id)}
                              disabled={deletingId === o._id}
                              className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition disabled:opacity-50"
                            >
                              {deletingId === o._id ? '...' : '🗑️ Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
