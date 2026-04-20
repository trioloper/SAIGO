// import Image from "next/image";

// export default function FoodCard({ item, qty=0, onAdd, onRemove }) {
//   const imgSrc = item.image || `/menu/${item.id}.jpg`;
//   const showFallback = !item.image && !String(item.id); // always false, but we still handle error
//   return (
//     <div className="rounded-2xl bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden">
//       <div className="relative h-28 w-full sm:h-32">
//         <Image
//           src={imgSrc}
//           alt={item.name}
//           fill
//           sizes="(max-width: 640px) 100vw, 33vw"
//           className="object-cover"
//           onError={(e)=>{ e.currentTarget.style.display='none'; e.currentTarget.parentElement.style.background='linear-gradient(135deg,#FFE08A,#FF9EC3)'; }}
//         />
//         {/* qty pill */}
//         {qty > 0 && (
//           <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-black/80 text-white">
//             {qty} in cart
//           </div>
//         )}
//       </div>

//       <div className="p-3">
//         <div className="flex items-start justify-between gap-2">
//           <div className="min-w-0">
//             <h3 className="font-semibold leading-snug truncate">{item.name}</h3>
//             <p className="text-sm text-neutral-500 mt-0.5">{item.price ? `₹${item.price}` : "—"}</p>
//           </div>

//           <div className="flex items-center gap-1 shrink-0">
//             <button
//               className="h-8 w-8 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
//               onClick={() => onRemove(item)}
//               disabled={qty === 0}
//               aria-label="Decrease"
//             >
//               –
//             </button>
//             <span className="min-w-[26px] text-center text-sm">{qty}</span>
//             <button
//               className="h-8 px-3 rounded-xl bg-[#FFD84D] text-black font-semibold hover:bg-[#FFC93A]"
//               onClick={() => onAdd(item)}
//               aria-label="Increase"
//             >
//               +
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState } from 'react';
import Image from 'next/image';

export default function FoodCard({ item, qty = 0, onAdd, onRemove }) {
  const imgSrc = item.image || `/menu/${item.id}.jpg`;
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* CARD */}
      <div className="by-card">
        <div className="by-card-media clickable" onClick={() => setOpen(true)}>
          <Image
            src={imgSrc}
            alt={item.name}
            fill
            quality={60}
            loading="lazy"
            placeholder="blur"
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.style.background =
                'linear-gradient(135deg,#E9C46A33,#F4D35E33)';
            }}
          />
        </div>

        <div className="by-card-body">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="by-card-title truncate">{item.name}</div>
              <p className="by-card-sub truncate">{item.desc || ' '}</p>
            </div>

            <div className="by-qty">
              <button
                className="by-btn-icon"
                onClick={() => onRemove(item)}
                aria-label="decrease"
              >
                −
              </button>
              <span className="by-qty-value">{qty}</span>
              <button
                className="by-btn-icon"
                onClick={() => onAdd(item)}
                aria-label="increase"
              >
                +
              </button>
            </div>
          </div>

          {typeof item.price === 'number' && (
            <div className="mt-3">
              <span className="by-badge-gold">₹{item.price}</span>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL */}
      {open && (
        <div className="popup-overlay" onClick={() => setOpen(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-image">
              <Image
                src={imgSrc}
                alt={item.name}
                fill
                quality={80}
                className="object-cover rounded-t-2xl"
              />
            </div>
            <div className="popup-info">
              <h3>{item.name}</h3>
              {item.desc && <p>{item.desc}</p>}
              {typeof item.price === 'number' && (
                <p className="popup-price">₹{item.price}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        /* CARD IMAGE AREA */
        .by-card-media {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
        }

        /* Make clickable */
        .clickable {
          cursor: pointer;
        }

        /* POPUP OVERLAY */
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }

        /* POPUP CONTENT */
        .popup-content {
          background: #fff;
          width: 90%;
          max-width: 700px;
          height: 75vh; /* 3/4 of the screen */
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: scaleUp 0.3s ease;
        }

        .popup-image {
          position: relative;
          width: 100%;
          height: 65%;
        }

        .popup-info {
          padding: 16px;
          text-align: center;
        }

        .popup-info h3 {
          font-size: 1.4rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .popup-info p {
          margin: 4px 0;
          color: #555;
        }

        .popup-price {
          color: #d97706;
          font-weight: bold;
          font-size: 1.1rem;
          margin-top: 8px;
        }

        /* ANIMATIONS */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleUp {
          from {
            transform: scale(0.95);
          }
          to {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
