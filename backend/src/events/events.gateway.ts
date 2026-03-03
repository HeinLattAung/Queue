import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
    console.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.leave(room);
    console.log(`Client ${client.id} left room: ${room}`);
  }

  // ── Generic emitters (kept for non-queue modules like booking) ──

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // ── Queue lifecycle emitters ──
  // Single source of truth for event names and payload contracts.

  /** New customer joined the queue */
  emitQueueNew(businessId: string, entry: any, totalWaiting: number) {
    this.server
      .to(`business:${businessId}`)
      .emit('queue:new', { entry, totalWaiting });
  }

  /** Customer's queue entry was joined — send them their position */
  emitQueueJoined(entryId: string, position: number, estimatedWait: number) {
    this.server
      .to(`queue:${entryId}`)
      .emit('queue:joined', { position, estimatedWait });
  }

  /** Queue entry status changed (called, approved, rejected, skipped) */
  emitQueueUpdate(businessId: string, entry: any, action: string) {
    this.server
      .to(`business:${businessId}`)
      .emit('queue:update', { entry, action });
  }

  /** Customer's table is ready */
  emitQueueCalled(entryId: string, entry: any) {
    this.server
      .to(`queue:${entryId}`)
      .emit('queue:called', { entry, message: 'Your table is ready!' });
  }

  /** Customer's entry was approved */
  emitQueueApproved(entryId: string, entry: any) {
    this.server
      .to(`queue:${entryId}`)
      .emit('queue:approved', { entry });
  }

  /** Customer's entry was rejected */
  emitQueueRejected(entryId: string, entry: any, reason: string) {
    this.server
      .to(`queue:${entryId}`)
      .emit('queue:rejected', { entry, reason });
  }

  /** Customer's entry was skipped */
  emitQueueSkipped(entryId: string, entry: any, reason: string) {
    this.server
      .to(`queue:${entryId}`)
      .emit('queue:skipped', { entry, reason });
  }

  /** Queue entry completed or removed */
  emitQueueRemove(businessId: string, entryId: string) {
    this.server
      .to(`business:${businessId}`)
      .emit('queue:remove', { entryId });

    this.server
      .to(`queue:${entryId}`)
      .emit('queue:completed', { entryId });
  }

  /** Notify a single customer of their updated position */
  emitQueuePositionUpdate(entryId: string, position: number, estimatedWait: number) {
    this.server
      .to(`queue:${entryId}`)
      .emit('queue:position-update', { position, estimatedWait });
  }

  /** Notify admin dashboard that positions shifted after a queue mutation */
  emitQueuePositionsShifted(
    businessId: string,
    entries: Array<{ _id: string; position: number; customerName: string }>,
  ) {
    this.server
      .to(`business:${businessId}`)
      .emit('queue:positions-shifted', { entries });
  }

  /** Customer cancelled their own entry */
  emitQueueCancelled(businessId: string, entryId: string, entry: any) {
    this.server
      .to(`business:${businessId}`)
      .emit('queue:update', { entry, action: 'cancelled' });

    this.server
      .to(`queue:${entryId}`)
      .emit('queue:cancelled', { entry });
  }
}
