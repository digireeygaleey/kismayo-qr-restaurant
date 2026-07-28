'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Category, Restaurant } from '@kismayo/shared';
import { api } from '@/lib/api';
import MenuItemCard from '@/components/MenuItemCard';
import CartButton from '@/components/CartButton';

function MenuContent({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const table = searchParams.get('table') || '1';
  const [slug, setSlug] = useState('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const rest = await api<Restaurant>(`/api/restaurants/${slug}`);
        setRestaurant(rest);
        const menu = await api<Category[]>(`/api/restaurants/${rest.id}/menu`);
        setCategories(menu);
        if (menu.length > 0) setActiveCategory(menu[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        </div>
        <p className="text-gray-500">{error || 'Restaurant not found'}</p>
      </div>
    );
  }

  const activeItems = categories.find((c) => c.id === activeCategory)?.menuItems || [];
  const filteredItems = searchQuery.trim()
    ? categories.flatMap((c) => c.menuItems ?? []).filter((item): item is NonNullable<typeof item> =>
        item != null && (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description != null && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
    : activeItems;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-5 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{restaurant.name}</h1>
          <p className="mt-0.5 text-xs font-medium text-emerald-600">Table {table}</p>
        </div>
      </header>

      <div className="sticky top-[73px] z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-5 py-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {!searchQuery && (
          <div className="flex gap-2 overflow-x-auto px-5 pb-3 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-lg space-y-3 px-5 py-5">
        {searchQuery && filteredItems.length > 0 && (
          <p className="text-xs font-medium text-gray-500">{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</p>
        )}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-400">
              {searchQuery ? 'No items found' : 'No items yet'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => <MenuItemCard key={item.id} item={item} />)
        )}
      </main>

      <CartButton slug={slug} table={table} />
    </div>
  );
}

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
        </div>
      }
    >
      <MenuContent params={params} />
    </Suspense>
  );
}
