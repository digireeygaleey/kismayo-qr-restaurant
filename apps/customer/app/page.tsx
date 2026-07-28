import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-100 via-surface-50 to-surface-50" />
      <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100/40 blur-3xl" />

      <div className="relative z-10 max-w-md text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-ink-900 shadow-elevated">
          <span className="font-display text-2xl font-bold text-brand-400">KM</span>
        </div>

        <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-ink-900">
          Kismayo QR
        </h1>
        <p className="mb-1 font-display text-lg italic text-ink-400">
          scan · order · pay
        </p>
        <p className="mb-10 text-sm leading-relaxed text-ink-400">
          From your table to the kitchen in seconds.<br />
          No waiters, no queues, no hassle.
        </p>

        <Link
          href="/menu/mecca-hotel?table=1"
          className="inline-block w-full rounded-xl bg-ink-900 px-6 py-3.5 text-center font-medium text-white transition-all duration-200 hover:bg-ink-800 hover:shadow-elevated active:scale-[0.98]"
        >
          View Demo Menu
        </Link>

        <div className="mt-12 flex items-center justify-center gap-8 text-xs text-ink-300">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100">
              <svg className="h-4 w-4 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <span>Browse Menu</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100">
              <svg className="h-4 w-4 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.872l1.836-8.073A1.125 1.125 0 0018.054 3H5.106m2.394 11.25l-1.5-6h13.5" /></svg>
            </div>
            <span>Add to Cart</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100">
              <svg className="h-4 w-4 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
            </div>
            <span>Pay Easily</span>
          </div>
        </div>

        <p className="mt-10 text-[11px] text-ink-300">
          Scan the QR code on your table to begin
        </p>
      </div>
    </main>
  );
}
