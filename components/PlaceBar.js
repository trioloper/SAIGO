// export default function PlaceBar({ total, onPlace, disabled }) {
//   return (
//     <div className="fixed bottom-0 left-0 right-0 z-40">
//       <div className="max-w-5xl mx-auto px-3 pb-3">
//         <div className="rounded-2xl bg-white/95 backdrop-blur border border-black/10 shadow-[0_8px_22px_rgba(0,0,0,0.12)] flex items-center justify-between px-4 py-3">
//           <div className="font-semibold">
//             Total: <span className="text-[#FF7B54]">₹{total}</span>
//           </div>
//           <button
//             className={`px-5 py-2 rounded-xl font-semibold bg-[#FF7B54] text-white hover:brightness-110 ${
//               disabled ? 'opacity-50 cursor-not-allowed' : ''
//             }`}
//             onClick={onPlace}
//             disabled={disabled}
//           >
//             Place Order
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
export default function PlaceBar({ total, onPlace, disabled }) {
  return (
    <div className="by-placebar">
      <div className="by-placebar-inner flex items-center justify-between">
        <div>
          <div className="by-total">Total: ₹{total}</div>
          <div className="by-total-sub">Tax included</div>
        </div>

        <button
          onClick={onPlace}
          disabled={disabled}
          className="by-btn by-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Place Order
        </button>
      </div>
    </div>
  );
}
