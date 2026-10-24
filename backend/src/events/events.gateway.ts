import { RoomAccessService } from './room-access.service';
import { checkOrigin } from '../common/config/security';
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
    origin: checkOrigin,
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private roomAccess: RoomAccessService) {}

  private expirations = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const timer of this.expirations.get(client.id)?.values() || []) clearTimeout(timer);
    this.expirations.delete(client.id);
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() request: { room?: string; token?: string }) {
    const room = request?.room;
    try {
      const expiresAt = await this.roomAccess.authorize(room, request?.token);
      if (!client.connected) return { ok: false, error: 'Connection closed' };
      // Reserve a timer map only after validation, and bound subscriptions per connection.
      const timers = this.expirations.get(client.id) || new Map();
      if (!client.rooms.has(room) && client.rooms.size >= 33) return { ok: false, error: 'Too many subscriptions' };
      if (expiresAt !== null && expiresAt <= Date.now()) return { ok: false, error: 'Subscription credential expired' };
      this.expirations.set(client.id, timers);
      await client.join(room);
      if (!client.connected) return { ok: false, error: 'Connection closed' };
      clearTimeout(timers.get(room));
      if (expiresAt !== null) {
        // Node timers are limited to 2^31-1 ms; long-lived tokens are checked again at each interval.
        const expire = () => {
          const remaining = expiresAt - Date.now();
          if (remaining > 0) {
            timers.set(room, setTimeout(expire, Math.min(remaining, 2147483647)));
            return;
          }
          client.leave(room);
          timers.delete(room);
          client.emit('subscription:expired', { room });
        };
        timers.set(room, setTimeout(expire, Math.min(expiresAt - Date.now(), 2147483647)));
      }
      this.expirations.set(client.id, timers);
      return { ok: true, room };
    } catch {
      return { ok: false, error: 'Subscription not permitted' };
    }
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    if (typeof room !== 'string' || !/^(business|booking|queue|waitlist|availability):[a-f0-9]{24}$/i.test(room)) return;
    clearTimeout(this.expirations.get(client.id)?.get(room));
    this.expirations.get(client.id)?.delete(room);
    client.leave(room);
  }

  // ── Generic emitters (kept for non-queue modules like booking) ──

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
    if (event === 'availability:changed' && room.startsWith('business:')) {
      const businessId = room.slice('business:'.length);
      this.server.to(`availability:${businessId}`).emit(event, { businessId });
    }
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
