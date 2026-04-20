import { useEffect, useState } from 'react';

/**
 * Two-way slide switch for Support:
 *  - ON  => complete order
 *  - OFF => reopen order (set back to 'placed')
 */
export default function OrderSlideSwitch({
  orderId,
  tableNo,
  status = 'placed',
  onStatusChange, // (nextStatus, order) => void
}) {
  const serverIsComplete = status === 'completed';
  const [on, setOn] = useState(serverIsComplete);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  const storageKey = `orderSlide:${orderId || tableNo}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    // Always respect server on initial mount
    if (serverIsComplete) setOn(true);
    else if (saved === 'on') setOn(true);
    else setOn(false);
    setHydrated(true);
  }, [storageKey, serverIsComplete]);

  const hit = async (action) => {
    const body = orderId ? { orderId } : { tableNo };
    const res = await fetch(`/api/orderHandler?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data?.order?._id) {
      throw new Error(data?.message || `Failed to ${action} order`);
    }
    return data.order;
  };

  const toggle = async () => {
    if (loading) return;
    const next = !on;
    setLoading(true);
    try {
      if (next) {
        // turning ON => complete
        const order = await hit('completed');
        setOn(true);
        if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, 'on');
        onStatusChange?.('completed', order);
      } else {
        // turning OFF => reopen
        const order = await hit('reopen');
        setOn(false);
        if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, 'off');
        onStatusChange?.('placed', order);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`relative w-16 h-8 rounded-full flex items-center transition-all duration-300
        ${on ? 'bg-green-600/90' : 'bg-red-500/60 hover:bg-red-500/80'}
        ${loading ? 'opacity-60 cursor-wait' : ''}
        ring-1 ring-white/20
      `}
      aria-pressed={on}
      aria-label={on ? 'Completed (click to reopen)' : 'Not completed (click to complete)'}
      title={on ? 'Completed – click to mark Not completed' : 'Not completed – click to mark Completed'}
    >
      <span
        className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300
          ${on ? 'translate-x-8' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
