import Link from "next/link";

export default function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          🏠 FixFlow
        </Link>
        <div className="flex gap-6 text-sm font-medium text-slate-600">
          <Link href="/tenant" className="hover:text-slate-900">Tenant</Link>
          <Link href="/landlord" className="hover:text-slate-900">Landlord</Link>
        </div>
      </nav>
    </header>
  );
}
