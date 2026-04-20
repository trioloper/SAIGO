function Count({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-neutral-600">{label}</label>
      <input
        type="number"
        min="0"
        className="h-10 w-full rounded-xl bg-white border border-black/10 px-3"
        value={value}
        onChange={(e)=>onChange(Math.max(0, parseInt(e.target.value||"0",10)))}
      />
    </div>
  );
}

export default function PeopleStrip({ adult, barn1, barn2, setAdult, setBarn1, setBarn2 }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 rounded-2xl bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)] border border-black/5 p-4">
      <Count label="ADULT" value={adult} onChange={setAdult} />
      <Count label="BARN 7–12 ÅR" value={barn1} onChange={setBarn1} />
      <Count label="BARN 3–6 ÅR" value={barn2} onChange={setBarn2} />
    </div>
  );
}
