'use client';

import { useEffect, useState } from 'react';
import { Category, AuthUser } from '@kismayo/shared';
import { api } from '@/lib/api';

const AVAILABLE_TAGS = ['Vegetarian', 'Vegan', 'Spicy', 'Gluten-Free', 'Halal', 'Dairy-Free'];

export default function MenuPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    categoryId: '',
    description: '',
    isChefSpecial: false,
    tags: [] as string[],
    prepTimeMinutes: '',
  });
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;
    api<Category[]>(`/api/restaurants/${user.restaurantId}/menu`).then(setCategories);
  }, [user]);

  const refresh = () => {
    if (!user) return;
    api<Category[]>(`/api/restaurants/${user.restaurantId}/menu`).then(setCategories);
  };

  const addCategory = async () => {
    if (!user || !newCategory.trim()) return;
    await api(`/api/restaurants/${user.restaurantId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: newCategory.trim() }),
    });
    setNewCategory('');
    refresh();
  };

  const addItem = async () => {
    if (!user || !newItem.name || !newItem.categoryId || !newItem.price) return;
    await api(`/api/restaurants/${user.restaurantId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        name: newItem.name,
        description: newItem.description || undefined,
        price: parseFloat(newItem.price),
        categoryId: newItem.categoryId,
        isChefSpecial: newItem.isChefSpecial,
        tags: JSON.stringify(newItem.tags),
        prepTimeMinutes: newItem.prepTimeMinutes ? parseInt(newItem.prepTimeMinutes) : undefined,
      }),
    });
    setNewItem({ name: '', price: '', categoryId: '', description: '', isChefSpecial: false, tags: [], prepTimeMinutes: '' });
    setShowAddItem(false);
    refresh();
  };

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    await api(`/api/items/${itemId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ isAvailable: !isAvailable }),
    });
    refresh();
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    await api(`/api/items/${itemId}`, { method: 'DELETE' });
    refresh();
  };

  const toggleTag = (tag: string) => {
    setNewItem((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Menu Management</h1>
        <p className="mt-1 text-sm text-ink-400">Organize your menu items and categories</p>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-medium text-ink-700">Add Category</h2>
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category name"
            className="input flex-1"
          />
          <button onClick={addCategory} className="btn-primary">Add</button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-ink-700">Add Menu Item</h2>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {showAddItem ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {showAddItem && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Item name"
                className="input"
              />
              <input
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                placeholder="Price"
                type="number"
                step="0.01"
                className="input"
              />
              <select
                value={newItem.categoryId}
                onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                className="input"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Description (optional)"
                className="input"
              />
              <input
                value={newItem.prepTimeMinutes}
                onChange={(e) => setNewItem({ ...newItem, prepTimeMinutes: e.target.value })}
                placeholder="Prep time (minutes)"
                type="number"
                className="input"
              />
              <label className="flex items-center gap-2 rounded-xl border border-surface-200 px-4 py-3 cursor-pointer hover:bg-surface-50">
                <input
                  type="checkbox"
                  checked={newItem.isChefSpecial}
                  onChange={(e) => setNewItem({ ...newItem, isChefSpecial: e.target.checked })}
                  className="h-4 w-4 rounded text-brand"
                />
                <span className="text-sm text-ink-700">Chef&apos;s Special</span>
              </label>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-ink-500">Dietary Tags</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                      newItem.tags.includes(tag)
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-ink-500 border-surface-200 hover:border-ink-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addItem} className="btn-primary">Add Item</button>
          </div>
        )}
      </div>

      {categories.map((cat) => (
        <div key={cat.id} className="mb-4 rounded-2xl border border-surface-100 bg-white shadow-card">
          <div className="border-b border-surface-100 px-5 py-3">
            <h2 className="font-display text-lg font-semibold text-ink-900">{cat.name}</h2>
          </div>
          <div className="p-5">
            {!cat.menuItems?.length ? (
              <p className="text-sm text-ink-300">No items in this category</p>
            ) : (
              <div className="divide-y divide-surface-100">
                {cat.menuItems.map((item) => {
                  let itemTags: string[] = [];
                  try { itemTags = JSON.parse(item.tags || '[]'); } catch {}
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${!item.isAvailable ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
                            {item.name}
                          </p>
                          {item.isChefSpecial && <span className="text-xs">⭐</span>}
                          {item.prepTimeMinutes && (
                            <span className="text-[10px] text-ink-400 bg-surface-100 px-1.5 py-0.5 rounded">{item.prepTimeMinutes}m</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm text-ink-400">${item.price.toFixed(2)}</p>
                          {itemTags.length > 0 && (
                            <div className="flex gap-1">
                              {itemTags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] text-ink-400 bg-surface-50 px-1.5 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAvailability(item.id, item.isAvailable)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            item.isAvailable
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-surface-100 text-ink-400 hover:bg-surface-200'
                          }`}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
