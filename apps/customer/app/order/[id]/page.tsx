'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Order, ORDER_STATUS_LABELS } from '@kismayo/shared';
import { api, API_URL } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

const STATUS_STEPS = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'PAID'];

export default function OrderTrackingPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tableNum = searchParams.get('table') || '1';
  const slug = searchParams.get('slug') || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    let socket: Socket | null = null;

    async function load() {
      try {
        const data = await api<Order>(`/api/orders/${orderId}`);
        setOrder(data);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }
    load();

    socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socket.on('order-update', (updated: Order) => {
      if (updated.id === orderId) setOrder(updated);
    });

    const interval = setInterval(load, 10000);
    return () => {
      clearInterval(interval);
      socket?.disconnect();
    };
  }, [orderId]);

  const canCancel = order && ['PENDING', 'CONFIRMED'].includes(order.status);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const updated = await api<Order>(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      setOrder(updated);
      setShowCancelConfirm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100">
          <svg className="h-8 w-8 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        </div>
        <p className="text-ink-500">Order not found</p>
      </div>
    );
  }

  const isPending = order.status === 'PENDING';
  const isCancelled = order.status === 'CANCELLED';
  const currentStep = isPending ? -1 : STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-surface-50 px-5 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-ink-400">
            {isPending ? 'Waiting for payment...' : 'Order placed'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1">
            <div className={`h-1.5 w-1.5 rounded-full ${
              isCancelled ? 'bg-red-500' : isPending ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
            }`} />
            <span className="text-sm font-medium text-ink-600">
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          {order.table && (
            <p className="mt-1 text-sm text-ink-400">Table {order.table.tableNumber}</p>
          )}
        </div>

        {isPending && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
            <p className="font-medium text-amber-800">Waiting for Payment Confirmation</p>
            <p className="mt-1 text-sm text-amber-600/80">
              Check your phone for the PIN prompt from{' '}
              {order.paymentMethod === 'EVC_PLUS' ? 'EVC Plus' : order.paymentMethod === 'EDAHAB' ? 'eDahab' : 'Sahal'}
            </p>
          </div>
        )}

        {isCancelled && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="font-medium text-red-800">Order Cancelled</p>
            <p className="mt-1 text-sm text-red-600/80">This order has been cancelled.</p>
          </div>
        )}

        {!isPending && !isCancelled && (
          <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-6 shadow-card">
            <h2 className="mb-5 text-sm font-medium text-ink-500">Order Progress</h2>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const isComplete = i <= currentStep;
                const isCurrent = i === currentStep;
                const isLast = i === STATUS_STEPS.length - 1;

                return (
                  <div key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                          isComplete
                            ? 'bg-ink-900 text-white'
                            : 'border-2 border-surface-200 bg-white text-ink-300'
                        } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}
                      >
                        {isComplete ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-xs font-semibold">{i + 1}</span>
                        )}
                      </div>
                      {!isLast && (
                        <div className={`my-1 h-6 w-0.5 ${isComplete && i < currentStep ? 'bg-ink-900' : 'bg-surface-200'}`} />
                      )}
                    </div>
                    <div className={`pt-1.5 ${isComplete ? '' : 'opacity-40'}`}>
                      <p className={`text-sm ${isCurrent ? 'font-semibold text-ink-900' : 'text-ink-600'}`}>
                        {ORDER_STATUS_LABELS[step as keyof typeof ORDER_STATUS_LABELS]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-medium text-ink-500">Items</h2>
          <div className="divide-y divide-surface-100">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-ink-600">
                  {item.quantity}x {item.menuItem?.name || 'Item'}
                </span>
                <span className="text-sm font-medium text-ink-900">${item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-surface-100 pt-3">
            <span className="font-medium text-ink-500">Total</span>
            <span className="font-display text-lg font-bold text-ink-900">${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {order.paymentStatus === 'UNPAID' && order.status === 'SERVED' && (
          <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-5 text-center shadow-card">
            <p className="mb-1 font-medium text-ink-700">Ready to pay?</p>
            <p className="text-sm text-ink-400">
              Pay with {order.paymentMethod || 'cash'} when the waiter arrives
            </p>
          </div>
        )}

        {order.paymentStatus === 'PAID' && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50/50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-medium text-green-800">Payment Complete</p>
            <p className="text-sm text-green-600/80">Thank you for dining with us</p>
          </div>
        )}

        {canCancel && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="mb-4 w-full rounded-xl border border-red-200 py-3 text-center text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            Cancel Order
          </button>
        )}

        {showCancelConfirm && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/50 p-5">
            <p className="mb-1 text-center font-medium text-red-800">Cancel this order?</p>
            <p className="mb-4 text-center text-sm text-red-600/80">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border border-surface-200 bg-white px-6 py-3.5 font-medium text-ink-700 transition-all duration-200 hover:border-surface-300 hover:shadow-card active:scale-[0.98]"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-40"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {slug && (
            <Link
              href={`/menu/${slug}?table=${tableNum}`}
              className="block w-full rounded-xl bg-ink-900 px-6 py-3.5 text-center font-medium text-white transition-all duration-200 hover:bg-ink-800 hover:shadow-elevated active:scale-[0.98]"
            >
              Order More
            </Link>
          )}
          <Link
            href={`/menu/${slug || 'mecca-hotel'}?table=${tableNum}`}
            className="block w-full rounded-xl border border-surface-200 bg-white px-6 py-3.5 text-center font-medium text-ink-700 transition-all duration-200 hover:border-surface-300 hover:shadow-card active:scale-[0.98]"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
