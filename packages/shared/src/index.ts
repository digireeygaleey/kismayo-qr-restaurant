export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'PAID'
  | 'CANCELLED';

export type PaymentMethod = 'EVC_PLUS' | 'EDAHAB' | 'SAHAL' | 'CASH' | 'BANK';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';
export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  currency: string;
  language: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isChefSpecial?: boolean;
  tags?: string;
  prepTimeMinutes?: number | null;
  orderCount?: number;
  sortOrder: number;
  category?: Category;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  qrCode?: string | null;
  capacity: number;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string | null;
  menuItem?: MenuItem;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  customerName: string;
  customerPhone?: string | null;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod?: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  prepStartedAt?: string | null;
  prepCompletedAt?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  servedBy?: string | null;
  servedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  table?: Table;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string | null;
}

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  averageOrderValue: number;
  avgPrepTimeMinutes?: number;
}

export interface TableStatus {
  id: string;
  tableNumber: number;
  capacity: number;
  isActive: boolean;
  currentOrder?: {
    id: string;
    status: OrderStatus;
    customerName: string;
    totalAmount: number;
    createdAt: string;
    itemCount: number;
  } | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  restaurant?: Restaurant;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ApiError {
  error: string;
  message?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EVC_PLUS: 'EVC Plus',
  EDAHAB: 'eDahab',
  SAHAL: 'Sahal',
  CASH: 'Cash',
  BANK: 'Bank',
};
