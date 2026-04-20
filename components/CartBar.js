export default function CartBar({ lines, total, onPlace }) {
  const disabled = lines.length === 0;

  return (
    <div className="bar">
      <div className="bar-inner">
        <div>
          <div className="total">
            Items: {lines.length} • Total: ₹{total}
          </div>
          <div className="total-sub">Tax included</div>
        </div>
        <button
          className="btn btn--accent disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={onPlace}
          disabled={disabled}
        >
          Place Order
        </button>
      </div>
    </div>
  );
}
