export default function MenuGrid({ items, cart, onAdd, onRemove }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => {
        const qty = cart[it.id] || 0;
        return (
          <div key={it.id} className="rounded-2xl p-4 bg-white border shadow-soft flex items-center justify-between">
            <div>
              <div className="font-semibold">{it.name}</div>
              {"price" in it && <div className="text-sm opacity-70 mt-0.5">₹{it.price}</div>}
            </div>

            <div className="flex items-center gap-3">
              <button
                className="px-3 py-1 rounded-xl border"
                onClick={() => onRemove(it)}
                disabled={qty === 0}
              >-</button>
              <span className="w-6 text-center">{qty}</span>
              <button
                className="px-3 py-1 rounded-xl bg-brand.yellow font-bold"
                onClick={() => onAdd(it)}
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
