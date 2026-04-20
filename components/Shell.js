// export default function Shell({ title, subtitle, right, children }) {
//   return (
//     <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#FFF6D6_0%,#FFF_35%,#FFF_100%)]">
//       <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-black/5">
//         <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
//           <div>
//             <h1 className="text-xl sm:text-2xl font-extrabold">{title}</h1>
//             {subtitle && <p className="text-xs sm:text-sm text-neutral-500">{subtitle}</p>}
//           </div>
//           {right ?? (
//             <div className="px-3 py-1 rounded-xl bg-[#FFD84D] text-black font-semibold shadow">
//               Black & Yellow
//             </div>
//           )}
//         </div>
//       </header>
//       <main className="max-w-5xl mx-auto px-4 py-4">{children}</main>
//     </div>
//   );
// }

import Image from 'next/image';

export default function Shell({ title, subtitle, right, children }) {
  return (
    <div
      className="min-h-[100dvh]"
      style={{
        background: '#3D846C', // your theme background
        color: '#000',
      }}
    >
      {/* Sticky glass header */}
      <header className="sticky top-0 z-30 header-glass">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between sticky bg-[#3D846C]">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/85">{subtitle}</p>
            )}
          </div>

          {right ?? (
            <div>
              <Image
                src="/menu/saigo.png" // make sure this exists in /public/menu/
                alt="Saigo Logo"
                width={92}
                height={92}
                className="rounded-full"
              />
            </div>
          )}
        </div>
      </header>

      {/* Page body */}
      <main className="max-w-5xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
