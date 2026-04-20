import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';

export default function CategoryCard({
  title,
  items,
  cart,
  onAdd,
  onRemove,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  // collapse on load (even if defaultOpen true on hydration)
  useEffect(() => {
    setOpen(false);
  }, []);

  const countInCategory = useMemo(
    () => items.reduce((n, it) => n + (cart[it.id] || 0), 0),
    [items, cart]
  );

  return (
    <section className="rounded-xl3 bg-by-card border border-white/10 shadow-float overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-left">
          <div className="font-semibold text-by-text">{title}</div>
          {countInCategory > 0 && (
            <div className="text-xs text-by-sub">
              {countInCategory} selected
            </div>
          )}
        </div>
        <span className="text-[11px] px-2 py-1 rounded-lg bg-by-soft text-by-sub border border-white/10">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <ul className="divide-y divide-white/5">
          {items.map((it) => {
            const qty = cart[it.id] || 0;
            return (
              <li
                key={it.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  {'price' in it && (
                    <div className="text-xs text-by-sub mt-0.5">
                      {it.price ? `₹${it.price}` : '—'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded-xl border border-white/10 bg-by-soft text-by-text hover:bg-white/5 disabled:opacity-40"
                    onClick={() => onRemove(it)}
                    disabled={qty === 0}
                    aria-label="Decrease"
                  >
                    –
                  </button>

                  <span className="min-w-[28px] text-center text-sm px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                    {qty}
                  </span>

                  <button
                    className="h-8 px-3 rounded-xl bg-by-y text-black font-semibold hover:opacity-90"
                    onClick={() => onAdd(it)}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
