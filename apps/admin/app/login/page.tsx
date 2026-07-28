'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { LoginResponse } from '@kismayo/shared';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@mecca-hotel.so');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const { createBrowserClient } = await import('@kismayo/shared/supabase');
      const supabase = createBrowserClient();
      await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: '',
      });
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-surface-100 to-surface-50" />
      <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100/30 blur-3xl" />

      <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-900 shadow-elevated">
            <span className="font-display text-lg font-bold text-brand-400">KM</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Welcome Back</h1>
          <p className="mt-1 text-sm text-ink-400">Sign in to your dashboard</p>
        </div>

        <div className="rounded-2xl border border-surface-100 bg-white p-6 shadow-card space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-[11px] text-ink-300">
          Demo: admin@mecca-hotel.so / admin123
        </p>
      </form>
    </div>
  );
}
