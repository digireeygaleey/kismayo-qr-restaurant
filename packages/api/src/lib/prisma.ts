import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function decimalToNumber(value: { toNumber?: () => number } | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return value.toNumber?.() ?? Number(value);
}

export function serializeOrder<T extends Record<string, unknown>>(order: T) {
  return {
    ...order,
    totalAmount: decimalToNumber(order.totalAmount as never),
    items: Array.isArray(order.items)
      ? order.items.map((item: Record<string, unknown>) => ({
          ...item,
          unitPrice: decimalToNumber(item.unitPrice as never),
          subtotal: decimalToNumber(item.subtotal as never),
          menuItem: item.menuItem
            ? {
                ...(item.menuItem as Record<string, unknown>),
                price: decimalToNumber((item.menuItem as Record<string, unknown>).price as never),
              }
            : undefined,
        }))
      : order.items,
  };
}

export function serializeMenuItem<T extends Record<string, unknown>>(item: T) {
  return {
    ...item,
    price: decimalToNumber(item.price as never),
  };
}
