"use client";
import Image from "next/image";

export default function MenuItemCard({ item, onAdd }) {
  return (
    <div className="bg-card border border-slate-800 rounded-2xl overflow-hidden hover:shadow-soft hover:border-mint/50 transition">
      <div className="relative w-full aspect-[4/3] bg-black/30">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 33vw, 300px"
          className="object-cover"
          priority={item.id <= 6}
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{item.name}</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-teal-700 text-teal-200">
            #{item.id}
          </span>
        </div>
        <button
          className="mt-3 w-full rounded-xl bg-brand text-black font-bold py-2 hover:bg-brand-dim transition"
          onClick={() => onAdd(item)}
        >
          Add
        </button>
      </div>
    </div>
  );
}
