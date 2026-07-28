const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const supabase = (await import('@kismayo/shared/supabase')).createBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export { API_URL };
