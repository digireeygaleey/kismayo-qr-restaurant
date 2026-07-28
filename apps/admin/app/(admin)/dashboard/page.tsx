'use client';

import { useEffect, useState } from 'react';
import { DashboardStats, Order, AuthUser, TableStatus } from '@kismayo/shared';
import { api } from '@/lib/api';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700' },
  PREPARING: { bg: 'bg-orange-50', text: 'text-orange-700' },
  READY: { bg: 'bg-green-50', text: 'text-green-700' },
  SERVED: { bg: 'bg-purple-50', text: 'text-purple-700' },
  PAID: { bg: 'bg-surface-100', text: 'text-ink-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-600' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [statsData, ordersData, tableData] = await Promise.all([
          api<DashboardStats>(`/api/restaurants/${user!.restaurantId}/dashboard`),
          api<Order[]>(`/api/restaurants/${user!.restaurantId}/orders`),
          api<TableStatus[]>(`/api/restaurants/${user!.restaurantId}/table-status`),
        ]);
        setStats(statsData);
        setOrders(ordersData.slice(0, 15));
        setTables(tableData);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      }
    }
    load();

    let channel: ReturnType<Awaited<ReturnType<typeof import('@kismayo/shared/supabase')['createBrowserClient']>>['channel']> | null = null;

    async function setupRealtime() {
      const { createBrowserClient } = await import('@kismayo/shared/supabase');
      const supabase = createBrowserClient();
      channel = supabase
        .channel(`restaurant:${user!.restaurantId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'Order', filter: `restaurantId=eq.${user!.restaurantId}` },
          async () => {
            const data = await api<Order[]>(`/api/restaurants/${user!.restaurantId}/orders`);
            setOrders(data.slice(0, 15));
          }
        )
        .subscribe();
    }
    setupRealtime();

    return () => { channel?.unsubscribe(); };
  }, [user]);

  const occupiedTables = tables.filter((t) => t.currentOrder);
  const avgPrep = stats?.avgPrepTimeMinutes ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-400">Overview of your restaurant today</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Today's Orders", value: stats?.todayOrders ?? '—', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
          { label: "Today's Revenue", value: stats ? `$${stats.todayRevenue.toFixed(2)}` : '—', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Active', value: stats?.activeOrders ?? '—', icon: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z' },
          { label: 'Avg Order', value: stats ? `$${stats.averageOrderValue.toFixed(2)}` : '—', icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
          { label: 'Avg Prep Time', value: avgPrep ? `${avgPrep}m` : '—', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100">
              <svg className="h-5 w-5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
              </svg>
            </div>
            <p className="text-xs font-medium text-ink-400">{stat.label}</p>
            <p className="mt-0.5 font-display text-2xl font-bold text-ink-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {tables.length > 0 && (
        <div className="mb-8 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Table Status
              <span className="ml-2 text-sm font-normal text-ink-400">
                {occupiedTables.length}/{tables.length} occupied
              </span>
            </h2>
            <a href="/tables" className="text-sm font-medium text-brand-600 hover:text-brand-700">Manage</a>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                  table.currentOrder
                    ? 'border-brand/30 bg-brand/5'
                    : 'border-surface-100 bg-surface-50'
                }`}
              >
                <span className={`text-lg font-bold ${table.currentOrder ? 'text-brand' : 'text-ink-300'}`}>
                  {table.tableNumber}
                </span>
                {table.currentOrder ? (
                  <>
                    <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_STYLES[table.currentOrder.status]?.bg} ${STATUS_STYLES[table.currentOrder.status]?.text}`}>
                      {STATUS_LABELS[table.currentOrder.status]}
                    </span>
                    <span className="mt-1 text-[10px] text-ink-400">
                      ${table.currentOrder.totalAmount.toFixed(0)}
                    </span>
                  </>
                ) : (
                  <span className="mt-1 text-[10px] text-ink-300">Empty</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Recent Orders</h2>
          <a href="/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</a>
        </div>
        {orders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-ink-300">No orders yet today</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between py-3 ${
                  order.status === 'CANCELLED' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-sm font-bold text-ink-600">
                    T{order.table?.tableNumber ?? '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">{order.customerName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[order.status]?.bg || 'bg-surface-100'} ${STATUS_STYLES[order.status]?.text || 'text-ink-500'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink-400">
                      {order.items && order.items.length > 0
                        ? order.items.map((i) => `${i.quantity}x ${i.menuItem?.name || 'Item'}`).join(', ')
                        : 'No items'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink-900">${order.totalAmount.toFixed(2)}</p>
                  <p className="text-[11px] text-ink-300">{timeAgo(order.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
