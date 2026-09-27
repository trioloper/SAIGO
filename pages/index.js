import Image from "next/image";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

import Shell from "../components/Shell";
import tablesData from "../data/tables.json";
import staticMenuData from "../data/menu.json";

const price1 = 99;
const price2 = 299;
const price3 = 329;

const SupportList = dynamic(() => import("../components/SupportList"), {
  ssr: false,
});

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

// Transform DB format to static format for compatibility
function transformDbMenu(dbCategories) {
  return dbCategories
    .filter((cat) => !cat.hidden)
    .map((cat) => ({
      category: cat.name,
      items: (cat.items || [])
        .filter((item) => !item.hidden)
        .map((item) => ({
          id: item._id,
          name: item.name,
          image: item.image || "/menu/default.jpg",
          price: item.price || 0,
        })),
    }));
}

export default function Home() {
  const router = useRouter();
  const adultRef = useRef(null);
  const [placing, setPlacing] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const { support, tableNo: tableNoParam, menu: menuParam } = router.query;

  // Dynamic menu state
  const [menuData, setMenuData] = useState(staticMenuData);
  const [menuLoading, setMenuLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menuHandler");
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success && data.categories?.length > 0) {
          // DB is the single source of truth — only show DB categories
          const dbMenu = transformDbMenu(data.categories);
          setMenuData(dbMenu);
        }
      } catch {
        console.error("Menu API returned non-JSON");
      }
    } catch (err) {
      console.error("Failed to fetch menu, using static data:", err);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    // Re-fetch menu when tab becomes visible again (admin may have changed items)
    const onVisChange = () => {
      if (document.visibilityState === "visible") fetchMenu();
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [fetchMenu]);

  const [routerReady, setRouterReady] = useState(false);
  useEffect(() => {
    if (router.isReady) setRouterReady(true);
  }, [router.isReady]);

  // Redirect to /menu admin page if ?menu is present
  useEffect(() => {
    if (router.isReady && menuParam !== undefined) {
      router.replace("/menu");
    }
  }, [router.isReady, menuParam, router]);

  const [showPeopleError, setShowPeopleError] = useState(false);

  // NEW: success modal state
  const [showPlacedModal, setShowPlacedModal] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null); // { id, items, payable }

  // Welcome modal state (shows OBS warning on first scan)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // ---------- Hooks (unconditional) ----------
  const tableSet = useMemo(() => new Set(tablesData), []);
  const [cart, setCart] = useState({});

  // People counters start as EMPTY strings (no "0" shown initially)
  const [adult, setAdult] = useState("");
  const [barn1, setBarn1] = useState("");
  const [barn2, setBarn2] = useState("");

  const categories = useMemo(() => menuData, [menuData]);

  const lines = useMemo(() => {
    const out = [];
    for (const sec of categories) {
      for (const it of sec.items) {
        const q = cart[it.id] || 0;
        if (q > 0) {
          out.push({
            id: it.id,
            name: it.name,
            price: it.price || 0,
            qty: q,
            category: sec.category,
            image: it.image || `/menu/${it.id}.jpg`,
            lineTotal: (it.price || 0) * q,
          });
        }
      }
    }
    return out;
  }, [cart, categories]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0),
    [lines],
  );

  const add = (it) => setCart((c) => ({ ...c, [it.id]: (c[it.id] || 0) + 1 }));
  const remove = (it) =>
    setCart((c) => ({ ...c, [it.id]: Math.max(0, (c[it.id] || 0) - 1) }));

  const sectionRefs = useRef({});

  const isSupport = support === "true";

  // --- Robust tableNo read: router first, window fallback ---
  const rawTableNoParam = useMemo(() => {
    if (typeof tableNoParam !== "undefined") return tableNoParam;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("tableNo") ?? undefined;
    }
    return undefined;
  }, [tableNoParam]);

  const tableNo = useMemo(() => {
    const n = Number(rawTableNoParam);
    return Number.isFinite(n) ? n : undefined;
  }, [rawTableNoParam]);

  // Only mark invalid if URL actually had a tableNo AND it’s not allowed
  const urlHasTableNo =
    typeof rawTableNoParam !== "undefined" && rawTableNoParam !== null;
  const valid = !!tableNo && tableSet.has(tableNo);

  // Convert people inputs to non-negative integers; empty -> 0
  const adultNum = adult === "" ? 0 : Math.max(0, parseInt(adult, 10) || 0);
  const barn1Num = barn1 === "" ? 0 : Math.max(0, parseInt(barn1, 10) || 0);
  const barn2Num = barn2 === "" ? 0 : Math.max(0, parseInt(barn2, 10) || 0);
  const peopleTotal = adultNum + barn1Num + barn2Num;

  useEffect(() => {
    if (showPeopleError && peopleTotal > 0) {
      setShowPeopleError(false);
    }
  }, [peopleTotal, showPeopleError]);

  // Show welcome modal on first visit with valid tableNo
  useEffect(() => {
    if (routerReady && valid && tableNo) {
      const key = `welcomed_table_${tableNo}`;
      const hasSeenWelcome = sessionStorage.getItem(key);
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true);
        sessionStorage.setItem(key, "true");
      }
    }
  }, [routerReady, valid, tableNo]);

  const ensurePeopleOrFocus = () => {
    if (peopleTotal === 0) {
      adultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      adultRef.current?.focus({ preventScroll: true });
      setShowPeopleError(true);
      return false;
    }
    setShowPeopleError(false);
    return true;
  };

  // Upsert into ongoing "placed" order (same order id reused)
  const placeOrder = async () => {
    if (placing) return; // prevent double click
    if (!ensurePeopleOrFocus()) return;

    setPlacing(true);
    const controller = new AbortController();
    // auto-timeout after 40 s so UI never hangs (allows DB reconnect)
    const timeout = setTimeout(() => controller.abort(), 40000);

    try {
      const payload = {
        tableNo,
        items: lines.map((l) => ({
          id: l.id,
          name: l.name,
          price: l.price,
          qty: l.qty,
          category: l.category,
          image: l.image,
        })),
        adult: adultNum,
        Barn1: barn1Num,
        Barn2: barn2Num,
      };

      const res = await fetch("/api/orderHandler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json();

      if (res.ok && data?.order?._id) {
        setPlacedOrder({
          id: data.order._id,
          items: data.order.items || [],
          payable: data.order.payable,
        });
        setShowPlacedModal(true);
        setCart({});
      } else {
        alert(data?.message || "Failed to place order");
      }
    } catch (err) {
      alert(
        err?.name === "AbortError"
          ? "Request timed out, please try again."
          : "Network error. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      setPlacing(false);
    }
  };

  // Complete even with zero items/people
  const completeOrder = async () => {
    const res = await fetch("/api/orderHandler?action=completed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNo,
        adult: adultNum,
        Barn1: barn1Num,
        Barn2: barn2Num,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.order?._id) {
      router.push(`/placed?id=${data.order._id}`);
    } else {
      alert(data?.message || "Failed to complete order");
    }
  };

  const sectionCount = (sec) =>
    sec.items.reduce((n, it) => n + (cart[it.id] || 0), 0);

  // ---------- Support page ----------
  if (isSupport) {
    return (
      <Shell title="Support — All Orders" subtitle="Oldest first">
        <div className="space-y-4">
          <SupportList />
        </div>
      </Shell>
    );
  }

  // ---------- Lazy loading while router/query not ready ----------
  if (!routerReady) {
    return (
      <div className="min-h-screen bg-[#244a38] text-white">
        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-40 rounded-2xl bg-white/10" />
            <div className="h-8 w-40 rounded-full bg-white/10" />
            <div className="h-24 rounded-xl bg-white/10" />
          </div>
        </main>
      </div>
    );
  }

  // ---------- If URL HAS tableNo but it's invalid, then show invalid ----------
  if (urlHasTableNo && !valid) {
    return (
      <Shell title="Welcome" subtitle="Scan your table QR to begin">
        <div className="ui-surface p-4">Invalid table number.</div>
      </Shell>
    );
  }

  // ---------- If URL DOES NOT have tableNo, show welcome (no invalid flash) ----------
  if (!urlHasTableNo) {
    return (
      <Shell title="Welcome" subtitle="Scan your table QR to begin">
        <div className="ui-surface p-4">
          Please scan your table QR to begin.
        </div>
      </Shell>
    );
  }

  // ---------- Main page ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a2e] via-[#1d3f32] to-[#152b23] text-white">
      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* HERO IMAGE */}
        <div className="hero-premium">
          <div className="w-full h-48 sm:h-56 md:h-64 lg:h-72 relative">
            <Image
              src="/menu/saigo.jpg"
              alt="Restaurant ambiance"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Table # and hint (compact, under hero) */}
        <div className="mt-4 flex items-center gap-3">
          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <span className="font-bold text-amber-200">Bord #{tableNo}</span>
          </div>
          <span className="text-white/70 text-sm font-medium">
            Välj dina rätter
          </span>
        </div>

        {/* People counters */}
        <div className="mt-5 premium-card p-5">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* Adult Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] sm:text-[11px] font-bold text-amber-300/90 tracking-wide uppercase">
                Vuxen
              </label>

              <select
                ref={adultRef}
                className="select-premium w-full text-white rounded-xl p-2.5 text-sm sm:text-base"
                value={adult}
                onChange={(e) => setAdult(Number(e.target.value))}
              >
                <option value={0}>Select</option>
                {[...Array(10)].map((_, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                    className="bg-[#1d3f32] text-white"
                  >
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Barn 7–12 ÅR Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] sm:text-[11px] font-bold text-amber-300/90 tracking-wide uppercase">
                Barn 7–12 ÅR
              </label>
              <select
                className="select-premium w-full text-white rounded-xl p-2.5 text-sm sm:text-base"
                value={barn1}
                onChange={(e) => setBarn1(Number(e.target.value))}
              >
                <option value={0}>Select</option>
                {[...Array(10)].map((_, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                    className="bg-[#1d3f32] text-white"
                  >
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Barn 4–6 ÅR Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] sm:text-[11px] font-bold text-amber-300/90 tracking-wide uppercase">
                Barn 3–6 ÅR
              </label>
              <select
                className="select-premium w-full text-white rounded-xl p-2.5 text-sm sm:text-base"
                value={barn2}
                onChange={(e) => setBarn2(Number(e.target.value))}
              >
                <option value={0}>Select</option>
                {[...Array(10)].map((_, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                    className="bg-[#1d3f32] text-white"
                  >
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showPeopleError && (
            <p className="text-red-300 text-sm text-center mt-4 animate-fadeIn font-medium">
              Please select at least one person (Adult or Barn) to continue.
            </p>
          )}
        </div>

        {/* OBS warning */}
        {/* <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
          <p className="text-red-200 text-xs sm:text-sm font-medium leading-relaxed text-center">
            <span className="font-bold text-red-300">OBS!</span> För att undvika
            matspill får du/ni inte lämna mer än 3 sushibitar/bord vid måltidens
            slut, annars debiteras 15 kr/bit.
          </p>
        </div> */}

        {/* Category chips (NORMAL, non-sticky) */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((sec, i) => {
            const id = slugify(sec.category);
            const count = sectionCount(sec);
            const isActive = i === 0;
            return (
              <button
                key={id}
                className={`px-4 py-2.5 rounded-full whitespace-nowrap font-semibold text-sm transition-all ${
                  isActive
                    ? "chip-premium active"
                    : "chip-premium text-white/80"
                }`}
                onClick={() => {
                  const el = sectionRefs.current[id];
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {sec.category} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Sections (horizontal scroll cards) */}
        <div className="mt-6 space-y-10 pb-32">
          {categories.map((sec) => {
            const id = slugify(sec.category);
            return (
              <section
                key={id}
                id={id}
                ref={(el) => {
                  sectionRefs.current[id] = el;
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-title text-xl">{sec.category}</h2>
                  <span className="text-sm text-white/60 font-medium">
                    {sectionCount(sec)} selected
                  </span>
                </div>

                {/* Horizontal row of cards */}
                <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
                  {sec.items.map((it) => {
                    const qty = cart[it.id] || 0;
                    const img = it.image || `/menu/${it.id}.jpg`;
                    return (
                      <article
                        key={it.id}
                        style={{ width: 160, minWidth: 160, maxWidth: 160 }}
                        className="flex-shrink-0 rounded-xl overflow-hidden bg-[#1a2f28] border border-white/10 shadow-lg sm:!w-[220px] sm:!min-w-[220px] sm:!max-w-[220px] md:!w-[260px] md:!min-w-[260px] md:!max-w-[260px]"
                      >
                        {/* Image area - explicit fixed height */}
                        <div
                          style={{ height: 140 }}
                          className="relative w-full cursor-pointer overflow-hidden bg-[#0f1f1a] sm:!h-[180px] md:!h-[200px]"
                          onClick={() => setSelectedItem(it)}
                        >
                          <Image
                            src={img}
                            alt={it.name}
                            fill
                            sizes="160px"
                            className="object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
                            onError={(e) => {
                              e.currentTarget.srcset = "";
                              e.currentTarget.src = "/menu/default.jpg";
                            }}
                          />
                        </div>

                        {/* Footer */}
                        <div className="px-2 py-1.5 flex items-center justify-between bg-[#1a2f28] border-t border-white/10 sm:px-3">
                          <div className="min-w-0 pr-1 flex-1">
                            <span className="font-medium text-white text-[10px] sm:text-xs leading-tight line-clamp-2">
                              {it.name}
                            </span>
                            {it.price > 0 && (
                              <span className="text-red-400 font-bold text-[10px] sm:text-xs block">
                                +{it.price}KR
                              </span>
                            )}
                          </div>

                          <div className="flex items-center bg-[#0f1f1a] rounded-full border border-white/10 flex-shrink-0">
                            <button
                              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white text-sm font-medium transition-colors"
                              onClick={() => remove(it)}
                              aria-label="decrease"
                            >
                              −
                            </button>
                            <span className="font-bold text-white w-4 sm:w-5 text-center text-[11px] sm:text-xs">
                              {qty}
                            </span>
                            <button
                              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white text-sm font-medium transition-colors"
                              onClick={() => add(it)}
                              aria-label="increase"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Floating order bar */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="floating-bar rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold">{lines.length}</span>
              </div>
              <div>
                <div className="font-bold text-white">Artiklar</div>
                <div className="text-xs text-white/50">i din beställning</div>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                className="btn-premium px-4 sm:px-6 py-2.5 rounded-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={placeOrder}
                disabled={lines.length === 0 || placing}
              >
                {placing ? (
                  <>
                    <span className="spinner h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Placerar...</span>
                  </>
                ) : (
                  "Lägg beställning"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* === Welcome Modal (OBS warning on first scan) === */}
      {showWelcomeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowWelcomeModal(false)}
        >
          <div
            className="bg-gradient-to-b from-[#1a3a2e] to-[#152b23] rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl border border-white/10 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-4xl">👋</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Välkommen till Bord #{tableNo}!
              </h3>
              <p className="text-white/70 text-sm">
                Innan du börjar beställa, läs detta viktiga meddelande
              </p>
            </div>

            {/* Message */}

            <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-4 mb-6">
              <p className="text-red-200 text-sm font-medium leading-relaxed text-center">
                <span className="font-bold text-red-300 text-base">OBS!</span>
                <br />
                <span className="mt-2 block">
                  För att undvika matspill får du/ni inte lämna mer än 3
                  sushibitar/bord vid måltidens slut, annars debiteras 15
                  kr/bit.
                </span>
              </p>
            </div>

            {/* Pricing */}
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-4 mb-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3 text-center">
                All You Can Eat Priser
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Vuxen</span>
                  <span className="text-amber-300 font-bold text-base">${price3} kr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Barn 7–12 år</span>
                  <span className="text-amber-300  font-bold text-base">${price2} kr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">Barn 3–6 år</span>
                  <span className="text-amber-300  font-bold text-base">${price1} kr</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full btn-premium px-6 py-3 rounded-xl text-base font-semibold"
            >
              Jag förstår – Börja beställa
            </button>
          </div>
        </div>
      )}

      {/* === Image Preview Modal === */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="premium-card overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-[4/3]">
              <Image
                src={selectedItem.image || `/menu/${selectedItem.id}.jpg`}
                alt={selectedItem.name}
                fill
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
            <div className="p-5 text-center bg-gradient-to-b from-[#1a3a2e] to-[#152b23]">
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedItem.name}
              </h3>
              {selectedItem.desc && (
                <p className="text-white/70 text-sm mb-3">
                  {selectedItem.desc}
                </p>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-premium px-6 py-2.5 rounded-xl mt-2"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Success Modal (after Place Order) ===== */}
      {showPlacedModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-[#244a38] rounded-2xl w-full max-w-md mx-4 p-5 shadow-xl animate-fadeIn">
            {/* <div className="flex items-center justify-between mb-3"> */}
            {/* OBS warning */}
            {/* <div className="mt-0 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
              <p className="text-red-300 text-xs sm:text-sm font-medium leading-relaxed text-center">
                <span className="font-bold text-red-400">OBS!</span> För att
                undvika matspill får du/ni inte lämna mer än 3 sushibitar/bord
                vid måltidens slut, annars debiteras 15 kr/bit.
              </p>
            </div> */}
            <div className="flex items-center justify-between mt-2">
              <h3 className="text-lg font-semibold">Order placed!</h3>
              <button
                aria-label="Close"
                onClick={() => setShowPlacedModal(false)}
                className="w-8 h-8 -mr-2 rounded-full text-[#244a38]/70 hover:bg-black/5"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-700 mt-1">
              We’ve added these items to your order for{" "}
              <span className="font-semibold">Table #{tableNo}</span>.
            </p>

            <ul className="mt-3 max-h-48 overflow-auto divide-y divide-gray-200/70 mb-4">
              {(placedOrder?.items || []).map((it) => (
                <li
                  key={it.id}
                  className="py-2 flex items-center justify-between text-sm"
                >
                  <span className="truncate pr-2">{it.name}</span>
                  <span className="font-semibold">× {it.qty}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPlacedModal(false)}
                className="px-4 py-2 rounded-xl bg-[#244a38] text-white font-semibold hover:bg-[#1d3f32] transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
