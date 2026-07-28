'use client';

import { useState, useEffect } from 'react';
import { api, API_URL } from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  currency: string;
  language: string;
}

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    currency: 'USD',
    language: 'so',
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const data = await api<Restaurant>(`/api/restaurants/${user.restaurantId}/details`);
      setRestaurant(data);
      setForm({
        name: data.name,
        description: data.description || '',
        phone: data.phone || '',
        address: data.address || '',
        currency: data.currency,
        language: data.language,
      });
    } catch (e) {
      console.error('Failed to load restaurant', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    setMessage('');
    try {
      await api(`/api/restaurants/${restaurant.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Restaurant Settings</h1>
        <p className="mt-1 text-sm text-ink-400">Manage your restaurant profile</p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
            message.includes('success')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-surface-100 bg-white p-6 shadow-card space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Restaurant Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[80px] resize-none"
              rows={3}
              placeholder="A short description of your restaurant"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="+252 61 XXX XXXX"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="input"
              >
                <option value="USD">USD ($)</option>
                <option value="SOS">SOS (Sh)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
              placeholder="Kismayo, Somalia"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Default Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="input"
            >
              <option value="so">Somali</option>
              <option value="ar">Arabic</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {restaurant?.slug && (
          <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
            <p className="mb-2 text-xs font-medium text-ink-500">QR Code URL</p>
            <div className="rounded-xl bg-surface-50 px-4 py-3">
              <p className="break-all font-mono text-xs text-ink-600">
                {typeof window !== 'undefined' ? window.location.origin : ''}/menu/{restaurant.slug}?table=1
              </p>
            </div>
            <p className="mt-2 text-xs text-ink-300">
              Share this URL or generate QR codes from the Tables page.
            </p>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
