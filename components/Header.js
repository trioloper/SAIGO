import Image from 'next/image';

export default function Header({ title, subtitle }) {
  return (
    <header className="py-4 mb-4">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
        </div>
        <div className="">
          <Image
            src="/menu/saigo.png" // ✅ make sure this file exists under /public/menu/
            alt="Saigo Logo"
            width={92}
            height={92}
            className="rounded-full"
          />
        </div>
      </div>
    </header>
  );
}
