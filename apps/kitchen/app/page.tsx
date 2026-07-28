'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';
import type { Order, OrderStatus } from '@kismayo/shared';

const ORDER_FLOW: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED'];

const STATUS_CONFIG: Record<string, { accent: string; header: string; label: string; icon: string }> = {
  CONFIRMED: {
    accent: 'border-red-200',
    header: 'bg-red-50 border-b border-red-200',
    label: 'NEW',
    icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  },
  PREPARING: {
    accent: 'border-amber-200',
    header: 'bg-amber-50 border-b border-amber-200',
    label: 'PREPARING',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  READY: {
    accent: 'border-green-200',
    header: 'bg-green-50 border-b border-green-200',
    label: 'READY',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

const BUTTON_STYLES: Record<string, string> = {
  PREPARING: 'bg-amber-500 hover:bg-amber-600 text-white',
  READY: 'bg-green-500 hover:bg-green-600 text-white',
  SERVED: 'bg-blue-500 hover:bg-blue-600 text-white',
};

function getTimerColor(elapsedSeconds: number, prepMinutes?: number | null): string {
  if (!prepMinutes) {
    if (elapsedSeconds < 180) return 'text-green-600';
    if (elapsedSeconds < 300) return 'text-amber-600';
    return 'text-red-600';
  }
  const prepSeconds = prepMinutes * 60;
  const ratio = elapsedSeconds / prepSeconds;
  if (ratio < 0.6) return 'text-green-600';
  if (ratio < 1.0) return 'text-amber-600';
  return 'text-red-600';
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function OrderTicket({
  order,
  onAdvance,
  onBumpItem,
  expoMode,
}: {
  order: Order;
  onAdvance: (orderId: string, nextStatus: OrderStatus) => void;
  onBumpItem: (orderId: string, orderItemId: string) => void;
  expoMode: boolean;
}) {
  const [, setTick] = useState(0);
  const nextStatus = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1];

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
  const timerColor = order.status === 'PREPARING'
    ? getTimerColor(elapsed, order.items?.[0]?.menuItem?.prepTimeMinutes)
    : 'text-ink-400';

  const config = STATUS_CONFIG[order.status];

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-card ${config?.accent || 'border-surface-200'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${config?.header || 'bg-surface-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-ink-900">
            Table {order.table?.tableNumber ?? '?'}
          </span>
        </div>
        <span className={`text-xs font-bold ${timerColor}`}>{timeAgo(order.createdAt)}</span>
      </div>
      <div className="px-4 py-3">
        <p className="mb-2 text-xs font-medium text-ink-400">{order.customerName}</p>
        <div className="space-y-1.5">
          {order.items?.map((item) => (
            <div
              key={item.id}
              className={`flex items-baseline gap-2 text-sm ${expoMode ? 'cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-surface-50' : ''}`}
              onClick={() => expoMode && onBumpItem(order.id, item.id)}
            >
              <span className="font-bold text-ink-900">{item.quantity}x</span>
              <span className="text-ink-600">{item.menuItem?.name ?? 'Item'}</span>
              {item.specialInstructions && (
                <span className="text-[10px] text-amber-600">({item.specialInstructions})</span>
              )}
            </div>
          ))}
        </div>
        {order.notes && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-700">{order.notes}</p>
          </div>
        )}
      </div>
      {nextStatus && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onAdvance(order.id, nextStatus)}
            className={`w-full rounded-lg py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${BUTTON_STYLES[nextStatus] || 'bg-surface-100 hover:bg-surface-200 text-ink-700'}`}
          >
            {nextStatus === 'PREPARING'
              ? 'Start Preparing'
              : nextStatus === 'READY'
              ? 'Mark Ready'
              : 'Mark Served'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function KitchenPage() {
  const [token, setToken] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expoMode, setExpoMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const playAlert = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  const fetchActiveOrders = useCallback(
    async (rid: string, tok: string) => {
      try {
        const res = await fetch(`${API_URL}/api/restaurants/${rid}/orders/active`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (e) {
        console.error('Failed to fetch orders', e);
      }
    },
    []
  );

  useEffect(() => {
    if (!token || !restaurantId) return;

    fetchActiveOrders(restaurantId, token);

    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-kitchen', restaurantId);
    });

    socket.on('new-order', (order: Order) => {
      playAlert();
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [...prev, order];
      });
    });

    socket.on('order-update', (updated: Order) => {
      setOrders((prev) => {
        if (['SERVED', 'PAID', 'CANCELLED'].includes(updated.status)) {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });
    });

    const pollInterval = setInterval(() => {
      fetchActiveOrders(restaurantId, token);
    }, 30000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [token, restaurantId, fetchActiveOrders, playAlert]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      setRestaurantId(data.user.restaurantId);
      localStorage.setItem('kitchen_token', data.token);
      localStorage.setItem('kitchen_restaurant', data.user.restaurantId);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdvance = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setOrders((prev) => {
        if (['SERVED', 'PAID', 'CANCELLED'].includes(updated.status)) {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });
    } catch (e) {
      console.error('Failed to advance order', e);
    }
  };

  const handleBumpItem = async (orderId: string, orderItemId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: o.items?.map((item) =>
            item.id === orderItemId ? { ...item, bumped: true } : item
          ),
        };
      })
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('kitchen_token');
    const savedRestaurant = localStorage.getItem('kitchen_restaurant');
    if (savedToken && savedRestaurant) {
      setToken(savedToken);
      setRestaurantId(savedRestaurant);
    }
  }, []);

  const allDayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        const name = item.menuItem?.name ?? 'Unknown';
        counts[name] = (counts[name] || 0) + item.quantity;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [orders]);

  if (!token || !restaurantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-900 shadow-elevated">
              <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z" /></svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Kitchen Display</h1>
            <p className="mt-1 text-sm text-ink-400">Sign in to start receiving orders</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-surface-100 bg-white p-6 shadow-card">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="admin@restaurant.so"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required
              />
            </div>
            {loginError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{loginError}</div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-ink-900 py-3 font-bold text-white transition-all hover:bg-ink-800 hover:shadow-elevated disabled:opacity-40 active:scale-[0.98]"
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const confirmed = orders.filter((o) => o.status === 'CONFIRMED');
  const preparing = orders.filter((o) => o.status === 'PREPARING');
  const ready = orders.filter((o) => o.status === 'READY');

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="flex items-center justify-between border-b border-surface-100 bg-white/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold text-ink-900">Kitchen</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-ink-500">
              {orders.length} active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpoMode(!expoMode)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              expoMode
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-surface-200 text-ink-500 hover:bg-surface-50 hover:text-ink-700'
            }`}
          >
            {expoMode ? 'Expo Mode' : 'Expo'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-surface-50 hover:text-ink-700"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('kitchen_token');
              localStorage.removeItem('kitchen_restaurant');
              setToken(null);
              setRestaurantId(null);
            }}
            className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-surface-50 hover:text-ink-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      {allDayCounts.length > 0 && (
        <div className="border-b border-surface-100 bg-surface-100/50 px-6 py-2">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
            <span className="shrink-0 text-[10px] font-bold tracking-wider text-ink-400">ALL-DAY</span>
            {allDayCounts.map(([name, count]) => (
              <div key={name} className="shrink-0 flex items-center gap-1.5 rounded-full bg-white px-3 py-1">
                <span className="text-xs font-bold text-brand-600">{count}</span>
                <span className="text-[11px] text-ink-500">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-3 gap-4 p-4 overflow-auto">
        {[
          { key: 'CONFIRMED', orders: confirmed, config: STATUS_CONFIG.CONFIRMED },
          { key: 'PREPARING', orders: preparing, config: STATUS_CONFIG.PREPARING },
          { key: 'READY', orders: ready, config: STATUS_CONFIG.READY },
        ].map(({ key, orders: colOrders, config }) => (
          <div key={key} className="flex flex-col">
            <div className={`flex items-center justify-between rounded-t-xl px-4 py-3 ${config.header}`}>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={config.icon} />
                </svg>
                <span className="text-xs font-bold tracking-wider text-ink-700">
                  {config.label}
                </span>
              </div>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-200 px-1.5 text-[10px] font-bold text-ink-600">
                {colOrders.length}
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-auto rounded-b-xl border border-t-0 border-surface-200 bg-surface-50 p-3">
              {colOrders.length === 0 && (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-xs text-ink-300">Empty</p>
                </div>
              )}
              {colOrders.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  onAdvance={handleAdvance}
                  onBumpItem={handleBumpItem}
                  expoMode={expoMode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
