import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { getJwtSecret } from '../common/config/security';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Booking, BookingSchema } from '../booking/schemas/booking.schema';
import { Waitlist, WaitlistSchema } from '../waitlist/schemas/waitlist.schema';
import { RoomAccessService } from './room-access.service';
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    JwtModule.register({ secret: getJwtSecret() }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Waitlist.name, schema: WaitlistSchema },
    ]),
  ],
  providers: [EventsGateway, RoomAccessService],
  exports: [EventsGateway],
})
export class EventsModule {}
