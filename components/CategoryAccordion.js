// import { useEffect, useState, useMemo } from 'react';
// import FoodCard from './FoodCard';
// import Image from 'next/image';

// export default function CategoryAccordion({
//   title,
//   items,
//   cart,
//   onAdd,
//   onRemove,
// }) {
//   const [open, setOpen] = useState(false); // collapsed on load
//   const count = useMemo(
//     () => items.reduce((n, i) => n + (cart[i.id] || 0), 0),
//     [items, cart]
//   );

//   return (
//     <section className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
//       <button
//         className="w-full flex items-center justify-between px-4 py-3"
//         onClick={() => setOpen((v) => !v)}
//       >
//         <div className="text-left">
//           <div className="font-semibold">{title}</div>
//           {count > 0 && (
//             <div className="text-xs text-neutral-500">{count} selected</div>
//           )}
//         </div>
//         <span className="text-xs px-2 py-1 rounded-lg bg-neutral-100 border border-neutral-200">
//           {open ? 'Hide' : 'Show'}
//         </span>
//       </button>

//       {open && (
//         <div className="px-3 pb-4">
//           <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
//             {items.map((it) => (
//               <FoodCard
//                 key={it.id}
//                 item={it}
//                 qty={cart[it.id] || 0}
//                 onAdd={onAdd}
//                 onRemove={onRemove}
//               />
//             ))}
//           </div>
//         </div>
//       )}
//     </section>
//   );
// }
import { useState, useMemo } from 'react';
import FoodCard from './FoodCard';

export default function CategoryAccordion({
  title,
  items,
  cart,
  onAdd,
  onRemove,
}) {
  const [open, setOpen] = useState(false);
  const count = useMemo(
    () => items.reduce((n, i) => n + (cart[i.id] || 0), 0),
    [items, cart]
  );

  return (
    <section className="mb-4">
      <details
        className="by-acc"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary>
          <span className="text-[17px]">{title}</span>
          <span className="by-badge-gold">{count} selected</span>
        </summary>

        <div className="by-acc-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {items.map((it) => (
              <FoodCard
                key={it.id}
                item={it}
                qty={cart[it.id] || 0}
                onAdd={onAdd}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
