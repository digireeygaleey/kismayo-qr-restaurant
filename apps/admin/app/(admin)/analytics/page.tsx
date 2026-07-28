'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthUser } from '@kismayo/shared';
import { api } from '@/lib/api';

type Period = 'daily' | 'weekly' | 'monthly';

interface ReportData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topItem: { name: string; quantity: number; revenue: number };
    itemCount: number;
  };
  paymentBreakdown: Record<string, { count: number; revenue: number }>;
  periods: Array<{ label: string; orders: number; revenue: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const loadReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api<ReportData>(
        `/api/restaurants/${user.restaurantId}/analytics/report?period=${period}`
      );
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const maxRevenue = Math.max(...(report?.periods.map((p) => p.revenue) || [1]), 1);
  const maxOrders = Math.max(...(report?.periods.map((p) => p.orders) || [1]), 1);
  const paymentMethods = [
    { key: 'CASH', label: 'Cash' },
    { key: 'EVC_PLUS', label: 'EVC Plus' },
    { key: 'EDAHAB', label: 'eDahab' },
    { key: 'SAHAL', label: 'Sahal' },
  ];

  const PERIOD_LABELS: Record<Period, string> = {
    daily: 'Last 7 Days',
    weekly: 'Last 4 Weeks',
    monthly: 'Last 3 Months',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Accountant Report</h1>
          <p className="mt-1 text-sm text-ink-400">{PERIOD_LABELS[period]}</p>
        </div>
        <div className="flex rounded-xl border border-surface-200 bg-surface-50 p-0.5">
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                period === p
                  ? 'bg-white text-ink-900 shadow-sm'
                  : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {loading && !report && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
        </div>
      )}

      {report && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
              <p className="text-xs font-medium text-ink-400">Total Revenue</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink-900">${report.summary.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
              <p className="text-xs font-medium text-ink-400">Total Orders</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink-900">{report.summary.totalOrders}</p>
              <p className="text-[11px] text-ink-400">Avg ${report.summary.averageOrderValue.toFixed(2)}/order</p>
            </div>
            <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
              <p className="text-xs font-medium text-ink-400">Items Sold</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink-900">{report.summary.itemCount}</p>
              {report.summary.topItem.name && (
                <p className="text-[11px] text-ink-400">Top: {report.summary.topItem.name}</p>
              )}
            </div>
            <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
              <p className="text-xs font-medium text-ink-400">Top Item</p>
              <p className="mt-1 font-display text-xl font-bold text-ink-900 truncate">{report.summary.topItem.name || 'N/A'}</p>
              {report.summary.topItem.quantity > 0 && (
                <p className="text-[11px] text-ink-400">{report.summary.topItem.quantity} sold · ${report.summary.topItem.revenue.toFixed(2)}</p>
              )}
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card lg:col-span-2">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">
                {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'} Revenue
              </h2>
              {report.periods.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-ink-300">No data for this period</p>
                </div>
              ) : (
                <div className="flex h-44 items-end gap-2">
                  {report.periods.map((p) => (
                    <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-ink-400">
                        {p.revenue > 0 ? `$${p.revenue.toFixed(0)}` : ''}
                      </span>
                      <div className="relative w-full">
                        <div
                          className="w-full rounded-t-md bg-ink-900 transition-all duration-500"
                          style={{ height: `${(p.revenue / maxRevenue) * 100}%`, minHeight: p.revenue > 0 ? '6px' : '2px', opacity: p.revenue > 0 ? 1 : 0.15 }}
                        />
                        <div
                          className="absolute bottom-0 w-full rounded-t-md bg-brand-400 transition-all duration-500"
                          style={{ height: `${(p.orders / maxOrders) * 100}%`, minHeight: p.orders > 0 ? '3px' : '0px', opacity: p.orders > 0 ? 0.6 : 0 }}
                        />
                      </div>
                      <span className="text-[9px] text-ink-300">{p.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-400">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-ink-900" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-brand-400" /> Orders</span>
              </div>
            </div>

            <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Payment Methods</h2>
              {report.paymentBreakdown ? (
                <div className="space-y-3">
                  {paymentMethods.map(({ key, label }) => {
                    const pm = report.paymentBreakdown[key];
                    if (!pm || pm.count === 0) return null;
                    const pct = report.summary.totalRevenue > 0 ? (pm.revenue / report.summary.totalRevenue) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-ink-700">{label}</span>
                          <span className="font-medium text-ink-900">${pm.revenue.toFixed(2)}</span>
                        </div>
                        <div className="flex h-5 overflow-hidden rounded-full bg-surface-100">
                          <div
                            className="rounded-full bg-ink-900 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-0.5 flex justify-between text-[10px] text-ink-400">
                          <span>{pm.count} orders</span>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {paymentMethods.every(({ key }) => !report.paymentBreakdown?.[key]?.count) && (
                    <p className="py-8 text-center text-sm text-ink-300">No payment data</p>
                  )}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-ink-300">No payment data</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Items Sold</h2>
            {report.topItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-ink-300">No items sold in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 text-left text-xs font-medium text-ink-400">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Item</th>
                      <th className="pb-3 pr-4 text-right">Qty Sold</th>
                      <th className="pb-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topItems.map((item, i) => (
                      <tr key={item.name} className="border-b border-surface-50 last:border-0">
                        <td className="py-3 pr-4 text-ink-400">{i + 1}</td>
                        <td className="py-3 pr-4 font-medium text-ink-900">{item.name}</td>
                        <td className="py-3 pr-4 text-right text-ink-600">{item.quantity}</td>
                        <td className="py-3 text-right font-medium text-ink-900">${item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-ink-200 font-semibold">
                      <td className="py-3 pr-4 text-ink-500" colSpan={2}>Total</td>
                      <td className="py-3 pr-4 text-right text-ink-900">{report.topItems.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="py-3 text-right text-ink-900">${report.topItems.reduce((s, i) => s + i.revenue, 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
