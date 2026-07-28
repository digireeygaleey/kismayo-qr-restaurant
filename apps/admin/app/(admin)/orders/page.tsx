'use client';

import { useEffect, useState } from 'react';
import { Order, AuthUser, ORDER_STATUS_LABELS, OrderStatus } from '@kismayo/shared';
import { api, API_URL } from '@/lib/api';
import { io } from 'socket.io-client';

const STATUSES: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED'];

const STATUS_DOT: Record<string, string> = {
  CONFIRMED: 'bg-blue-500',
  PREPARING: 'bg-orange-500',
  READY: 'bg-green-500',
  SERVED: 'bg-purple-500',
  PAID: 'bg-ink-300',
  CANCELLED: 'bg-red-400',
};

export default function OrdersPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const data = await api<Order[]>(`/api/restaurants/${user!.restaurantId}/orders`);
      setOrders(data);
    }
    load();

    const socket = io(API_URL);
    socket.emit('join-restaurant', user.restaurantId);
    socket.on('new-order', (order: Order) => setOrders((prev) => [order, ...prev]));
    socket.on('order-update', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await api(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Orders</h1>
        <p className="mt-1 text-sm text-ink-400">{orders.length} total orders</p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              filter === s
                ? 'bg-ink-900 text-white shadow-elevated'
                : 'bg-surface-100 text-ink-500 hover:bg-surface-200'
            }`}
          >
            {s !== 'all' && (
              <span className={`h-1.5 w-1.5 rounded-full ${filter === s ? 'bg-white' : STATUS_DOT[s] || 'bg-ink-300'}`} />
            )}
            {s === 'all' ? `All (${orders.length})` : ORDER_STATUS_LABELS[s as OrderStatus]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((order) => (
          <div key={order.id} className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-medium text-ink-900">{order.customerName}</p>
                <p className="text-sm text-ink-400">
                  Table {order.table?.tableNumber} · #{order.id.slice(0, 8)}
                </p>
                <p className="mt-0.5 text-xs text-ink-300">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-ink-900">${order.totalAmount.toFixed(2)}</p>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status] || 'bg-ink-300'}`} />
                  <span className="text-xs font-medium text-ink-600">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-1">
              {order.items?.map((item) => (
                <p key={item.id} className="text-sm text-ink-500">
                  {item.quantity}x {item.menuItem?.name}
                </p>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== order.status).map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(order.id, status)}
                  className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition-all hover:border-surface-300 hover:bg-surface-50 hover:text-ink-700"
                >
                  → {ORDER_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-ink-300">No orders match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
