'use client';

import { CartProvider } from '@/lib/cart';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
