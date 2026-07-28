'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

export default function CartButton({ slug, table }: { slug: string; table: string }) {
  const { items } = useCart();
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href={`/menu/${slug}/cart?table=${table}`}
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink-900 px-6 py-3.5 text-white shadow-elevated transition-all duration-200 hover:bg-ink-800 active:scale-[0.98]"
    >
      <span className="relative">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.872l1.836-8.073A1.125 1.125 0 0018.054 3H5.106m2.394 11.25l-1.5-6h13.5" />
        </svg>
        <span className="absolute -right-2 -top-2 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-ink-900">
          {count}
        </span>
      </span>
      <span className="text-sm font-bold text-brand-400">${total.toFixed(2)}</span>
      <svg className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
