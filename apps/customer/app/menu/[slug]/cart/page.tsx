'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Restaurant, PaymentMethod } from '@kismayo/shared';
import { useCart } from '@/lib/cart';
import { api } from '@/lib/api';

type Step = 'cart' | 'paying';

function CartContent({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableNum = parseInt(searchParams.get('table') || '1');
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const [slug, setSlug] = useState('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('cart');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    api<Restaurant>(`/api/restaurants/${slug}`).then(setRestaurant).catch(console.error);
  }, [slug]);

  useEffect(() => {
    const savedName = localStorage.getItem('customerName');
    const savedPhone = localStorage.getItem('customerPhone');
    if (savedName) setCustomerName(savedName);
    if (savedPhone) setCustomerPhone(savedPhone);
  }, []);

  useEffect(() => {
    if (customerName) localStorage.setItem('customerName', customerName);
    if (customerPhone) localStorage.setItem('customerPhone', customerPhone);
  }, [customerName, customerPhone]);

  const isMobileMoney = paymentMethod !== 'CASH' && paymentMethod !== 'BANK';

  const handlePlaceOrder = async () => {
    if (!restaurant || !customerName.trim() || items.length === 0) {
      setError('Please enter your name and add items to cart');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const order = await api<{ id: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableNumber: tableNum,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            specialInstructions: i.specialInstructions,
          })),
        }),
      });

      setOrderId(order.id);

      if (isMobileMoney) {
        setStep('paying');
        initiatePayment(order.id);
      } else {
        clearCart();
        router.push(`/order/${order.id}?table=${tableNum}&slug=${slug}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const initiatePayment = async (oid: string) => {
    setPaying(true);
    setPayError('');
    try {
      const endpoint = paymentMethod === 'EVC_PLUS' ? '/api/payments/evc-plus' : '/api/payments/edahab';
      const result = await api<{ success: boolean; message: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          orderId: oid,
          phone: customerPhone.trim(),
        }),
      });

      if (result.success) {
        pollPaymentStatus(oid);
      } else {
        setPayError(result.message || 'Payment failed. Please try again.');
        setPaying(false);
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Payment initiation failed');
      setPaying(false);
    }
  };

  const pollPaymentStatus = async (oid: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const check = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setPayError('Payment timed out. Please try again.');
        setPaying(false);
        return;
      }

      try {
        const status = await api<{ status: string; paymentStatus: string }>(
          `/api/orders/${oid}/payment-status`
        );
        if (status.status === 'CONFIRMED' && status.paymentStatus === 'PAID') {
          clearCart();
          router.push(`/order/${oid}?table=${tableNum}&slug=${slug}`);
          return;
        }
        setTimeout(check, 2000);
      } catch {
        setTimeout(check, 3000);
      }
    };

    setTimeout(check, 2000);
  };

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100">
          <svg className="h-8 w-8 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.872l1.836-8.073A1.125 1.125 0 0018.054 3H5.106m2.394 11.25l-1.5-6h13.5" /></svg>
        </div>
        <p className="mb-4 font-display text-lg text-ink-300">Your cart is empty</p>
        <button onClick={() => router.back()} className="rounded-xl bg-ink-900 px-6 py-3.5 font-medium text-white transition-all duration-200 hover:bg-ink-800 hover:shadow-elevated active:scale-[0.98]">
          Browse Menu
        </button>
      </div>
    );
  }

  if (step === 'paying') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-surface-50" />
        <div className="relative z-10 w-full max-w-sm text-center">
          {paying && !payError && (
            <>
              <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-2 border-surface-200 border-t-brand-500" />
              <h2 className="mb-2 font-display text-2xl font-semibold text-ink-900">Waiting for Payment</h2>
              <p className="text-ink-400">
                Check your phone for a PIN prompt
              </p>
              <p className="mt-1 text-sm font-medium text-ink-500">
                {paymentMethod === 'EVC_PLUS' ? 'EVC Plus' : 'eDahab'} — ${total.toFixed(2)}
              </p>
              <p className="mt-6 text-xs text-ink-300">
                Enter the PIN on your phone to confirm payment
              </p>
            </>
          )}
          {payError && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              </div>
              <p className="mb-4 text-ink-500">{payError}</p>
              <button
                onClick={() => { setStep('cart'); setPayError(''); setOrderId(null); }}
                className="rounded-xl bg-ink-900 px-6 py-3.5 font-medium text-white transition-all duration-200 hover:bg-ink-800 hover:shadow-elevated active:scale-[0.98]"
              >
                Go Back
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-8">
      <header className="border-b border-surface-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-5 py-4">
          <button onClick={() => router.back()} className="mb-2 flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h1 className="font-display text-xl font-semibold text-ink-900">Your Cart</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-5 py-5">
        {items.map((item) => (
          <div key={item.menuItemId} className="flex items-center justify-between rounded-2xl border border-surface-100 bg-white p-4 shadow-card">
            <div className="flex-1">
              <h3 className="font-medium text-ink-900">{item.name}</h3>
              <p className="text-[13px] text-ink-400">${item.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 text-ink-500 transition-colors hover:bg-surface-200 active:scale-95"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold text-ink-900">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white transition-colors hover:bg-ink-800 active:scale-95"
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.menuItemId)}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}

        <div className="space-y-4 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
          <input
            type="text"
            placeholder="Your name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <input
            type="tel"
            placeholder={isMobileMoney ? 'Phone number *' : 'Phone number (optional)'}
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <textarea
            placeholder="Special instructions (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[80px] resize-none rounded-xl border border-surface-200 bg-white px-4 py-3 text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            rows={2}
          />
        </div>

        <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
          <p className="mb-3 text-sm font-medium text-ink-700">Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            {(['CASH', 'EVC_PLUS', 'EDAHAB', 'SAHAL'] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  paymentMethod === method
                    ? 'border-ink-900 bg-ink-900 text-white shadow-elevated'
                    : 'border-surface-200 text-ink-500 hover:border-surface-300 hover:bg-surface-50'
                }`}
              >
                {method === 'CASH' ? 'Cash' : method === 'EVC_PLUS' ? 'EVC Plus' : method === 'EDAHAB' ? 'eDahab' : 'Sahal'}
              </button>
            ))}
          </div>
          {isMobileMoney && (
            <p className="mt-3 text-xs text-ink-300">
              You will receive a PIN prompt on your phone to confirm payment
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="font-display text-lg text-ink-500">Total</span>
          <span className="font-display text-2xl font-bold text-ink-900">${total.toFixed(2)}</span>
        </div>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <button onClick={handlePlaceOrder} disabled={submitting} className="w-full rounded-xl bg-ink-900 px-6 py-3.5 font-medium text-white transition-all duration-200 hover:bg-ink-800 hover:shadow-elevated active:scale-[0.98] disabled:opacity-40 disabled:hover:shadow-none disabled:active:scale-100">
          {submitting
            ? 'Placing Order...'
            : isMobileMoney
            ? `Pay $${total.toFixed(2)} & Order`
            : 'Place Order'}
        </button>
      </main>
    </div>
  );
}

export default function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
        </div>
      }
    >
      <CartContent params={params} />
    </Suspense>
  );
}
