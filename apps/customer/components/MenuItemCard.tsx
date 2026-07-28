'use client';

import { MenuItem } from '@kismayo/shared';
import { useCart } from '@/lib/cart';
import { useState } from 'react';

const TAG_COLORS: Record<string, string> = {
  spicy: 'bg-red-50 text-red-600',
  vegetarian: 'bg-green-50 text-green-600',
  vegan: 'bg-emerald-50 text-emerald-600',
  gluten_free: 'bg-amber-50 text-amber-600',
  halal: 'bg-blue-50 text-blue-600',
  dairy_free: 'bg-purple-50 text-purple-600',
  nut_free: 'bg-orange-50 text-orange-600',
  popular: 'bg-pink-50 text-pink-600',
};

const TAG_LABELS: Record<string, string> = {
  spicy: '🌶 Spicy',
  vegetarian: '🥬 Vegetarian',
  vegan: '🌱 Vegan',
  gluten_free: '🌾 Gluten Free',
  halal: '☪ Halal',
  dairy_free: '🥛 Dairy Free',
  nut_free: '🥜 Nut Free',
  popular: '🔥 Popular',
};

export default function MenuItemCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  let tags: string[] = [];
  try {
    tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : Array.isArray(item.tags) ? item.tags : [];
  } catch {
    tags = [];
  }

  const handleAdd = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl opacity-40">🍽</span>
        )}
        {item.isChefSpecial && (
          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs shadow-sm">
            ⭐
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          {item.isChefSpecial && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              Chef&apos;s Special
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-gray-500">{item.description}</p>
        )}
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-500'}`}
              >
                {TAG_LABELS[tag] || tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">${item.price.toFixed(2)}</span>
            {item.prepTimeMinutes && (
              <span className="text-[11px] text-gray-400">~{item.prepTimeMinutes}min</span>
            )}
          </div>
          <button
            onClick={handleAdd}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              added
                ? 'bg-gray-100 text-gray-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
            }`}
          >
            {added ? (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Added
              </span>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
