import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  const origins = [
    process.env.CUSTOMER_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3001',
    process.env.KITCHEN_URL || 'http://localhost:3002',
  ];

  io = new Server(server, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-restaurant', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
    });

    socket.on('join-kitchen', (restaurantId: string) => {
      socket.join(`kitchen:${restaurantId}`);
    });
  });

  return io;
}

export function emitNewOrder(restaurantId: string, order: unknown) {
  io?.to(`kitchen:${restaurantId}`).emit('new-order', order);
  io?.to(`restaurant:${restaurantId}`).emit('new-order', order);
}

export function emitOrderUpdate(restaurantId: string, order: unknown) {
  io?.to(`restaurant:${restaurantId}`).emit('order-update', order);
  io?.to(`kitchen:${restaurantId}`).emit('order-update', order);
}

export function getIO() {
  return io;
}
