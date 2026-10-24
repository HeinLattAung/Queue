import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Booking, BookingDocument } from '../booking/schemas/booking.schema';
import { Waitlist, WaitlistDocument } from '../waitlist/schemas/waitlist.schema';

@Injectable()
export class RoomAccessService {
  constructor(
    private jwt: JwtService,
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectModel(Booking.name) private bookings: Model<BookingDocument>,
    @InjectModel(Waitlist.name) private waitlist: Model<WaitlistDocument>,
  ) {}

  async authorize(room: unknown, token?: unknown): Promise<number | null> {
    if (typeof room !== 'string' || !/^(business|booking|queue|waitlist|availability):[a-f0-9]{24}$/i.test(room)) {
      throw new UnauthorizedException('Invalid subscription');
    }
    const [kind, id] = room.split(':');
    // This public room only receives availability invalidation, never customer records.
    if (kind === 'availability') return null;
    if (typeof token !== 'string' || !token || token.length > 8192) {
      throw new UnauthorizedException('Subscription credential required');
    }
    let payload: any;
    try { payload = this.jwt.verify(token, { algorithms: ['HS256'] }); }
    catch { throw new UnauthorizedException('Invalid or expired subscription credential'); }
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now() || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid or expired subscription credential');
    }
    if (kind === 'business') {
      // Re-read membership: never trust the client room or a role embedded in a token.
      if (payload.type || !payload.email || !payload.role || !/^[a-f0-9]{24}$/i.test(payload.sub)) {
        throw new UnauthorizedException('Restaurant account credential required');
      }
      const user = await this.users.findById(payload.sub).select('role businessId');
      if (!user || !['owner', 'staff'].includes(user.role) || user.businessId?.toString() !== id) {
        throw new UnauthorizedException('Subscription not permitted');
      }
    } else {
      const expectedType = kind === 'booking' ? 'booking' : 'waitlist';
      if (payload.type !== expectedType || payload.sub !== id) {
        throw new UnauthorizedException('Subscription not permitted');
      }
      const model = kind === 'booking' ? this.bookings : this.waitlist;
      if (!await model.exists({ _id: id })) throw new UnauthorizedException('Subscription not permitted');
    }
    return payload.exp * 1000;
  }
}
