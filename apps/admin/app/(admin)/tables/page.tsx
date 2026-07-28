'use client';

import { useEffect, useState } from 'react';
import { Table, AuthUser } from '@kismayo/shared';
import { api } from '@/lib/api';

export default function TablesPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;
    api<Table[]>(`/api/restaurants/${user.restaurantId}/tables`).then(setTables);
  }, [user]);

  const refresh = () => {
    if (!user) return;
    api<Table[]>(`/api/restaurants/${user.restaurantId}/tables`).then(setTables);
  };

  const addTable = async () => {
    if (!user || !newTableNumber) return;
    await api(`/api/restaurants/${user.restaurantId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ tableNumber: parseInt(newTableNumber), capacity: 4 }),
    });
    setNewTableNumber('');
    refresh();
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    await api(`/api/tables/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Table Management</h1>
        <p className="mt-1 text-sm text-ink-400">{tables.length} tables configured</p>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-card">
        <h2 className="mb-3 text-sm font-medium text-ink-700">Add Table</h2>
        <div className="flex gap-2">
          <input
            type="number"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            placeholder="Table number"
            className="input flex-1"
          />
          <button onClick={addTable} className="btn-primary">Add Table</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <div key={table.id} className="rounded-2xl border border-surface-100 bg-white p-5 shadow-card text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
              <span className="font-display text-xl font-bold text-ink-700">{table.tableNumber}</span>
            </div>
            <p className="text-sm font-medium text-ink-900">Table {table.tableNumber}</p>
            <p className="text-xs text-ink-400">Seats {table.capacity}</p>
            <div className="mt-3 flex flex-col gap-2">
              {table.qrCode && (
                <button
                  onClick={() => setSelectedQr(selectedQr === table.qrCode ? null : table.qrCode!)}
                  className="rounded-lg bg-surface-100 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-surface-200"
                >
                  {selectedQr === table.qrCode ? 'Hide QR' : 'Show QR Code'}
                </button>
              )}
              <button
                onClick={() => deleteTable(table.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            {selectedQr === table.qrCode && table.qrCode && (
              <div className="mt-4 rounded-xl bg-surface-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={table.qrCode} alt={`QR Table ${table.tableNumber}`} className="mx-auto h-40 w-40" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
