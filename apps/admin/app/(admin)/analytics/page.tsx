'use client';

import { useEffect, useState } from 'react';
import { AuthUser } from '@kismayo/shared';
import { api } from '@/lib/api';

export default function AnalyticsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [revenue, setRevenue] = useState<Array<{ date: string; revenue: number }>>([]);
  const [popular, setPopular] = useState<Array<{ menuItem: { name: string } | undefined; totalOrdered: number | null }>>([]);
  const [peak, setPeak] = useState<Array<{ hour: number; count: number }>>([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = user.restaurantId;
    Promise.all([
      api<Array<{ date: string; revenue: number }>>(`/api/restaurants/${id}/analytics/revenue?days=7`),
      api<Array<{ menuItem: { name: string }; totalOrdered: number }>>(`/api/restaurants/${id}/analytics/popular`),
      api<Array<{ hour: number; count: number }>>(`/api/restaurants/${id}/analytics/peak`),
    ]).then(([r, p, pk]) => {
      setRevenue(r);
      setPopular(p);
      setPeak(pk);
    });
  }, [user]);

  const maxRevenue = Math.max(...revenue.map((r) => r.revenue), 1);
  const maxPeak = Math.max(...peak.map((p) => p.count), 1);
  const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Analytics</h1>
        <p className="mt-1 text-sm text-ink-400">Last 7 days performance</p>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Revenue</h2>
          <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-semibold text-ink-600">
            ${totalRevenue.toFixed(2)} total
          </span>
        </div>
        {revenue.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-ink-300">No revenue data yet</p>
          </div>
        ) : (
          <div className="flex h-44 items-end gap-1.5">
            {revenue.map((r) => (
              <div key={r.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-ink-400">
                  {r.revenue > 0 ? `$${r.revenue.toFixed(0)}` : ''}
                </span>
                <div
                  className="w-full rounded-t-md bg-ink-900 transition-all duration-500"
                  style={{ height: `${(r.revenue / maxRevenue) * 100}%`, minHeight: r.revenue > 0 ? '6px' : '2px', opacity: r.revenue > 0 ? 1 : 0.15 }}
                />
                <span className="text-[10px] text-ink-300">{r.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Popular Items</h2>
          {popular.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-ink-300">No data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {popular.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-surface-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 text-xs font-bold text-ink-500">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-ink-700">{item.menuItem?.name || 'Unknown'}</span>
                  </div>
                  <span className="text-sm font-semibold text-ink-900">{item.totalOrdered}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Peak Hours</h2>
          {peak.every((p) => p.count === 0) ? (
            <div className="py-8 text-center">
              <p className="text-ink-300">No data yet</p>
            </div>
          ) : (
            <div className="flex h-36 items-end gap-1">
              {peak.filter((p) => p.hour >= 8 && p.hour <= 22).map((p) => (
                <div key={p.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-brand-500 transition-all duration-500"
                    style={{ height: `${(p.count / maxPeak) * 100}%`, minHeight: p.count > 0 ? '4px' : '2px', opacity: p.count > 0 ? 1 : 0.15 }}
                  />
                  <span className="text-[10px] text-ink-300">{p.hour}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
