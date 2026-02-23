import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Booking, BookingSchema } from '../booking/schemas/booking.schema';
import { Waitlist, WaitlistSchema } from '../waitlist/schemas/waitlist.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Waitlist.name, schema: WaitlistSchema },
    ]),
    AuthModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
