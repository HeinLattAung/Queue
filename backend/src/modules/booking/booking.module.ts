import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingController } from './booking.controller';
import { PublicBookingController } from './public-booking.controller';
import { BookingService } from './booking.service';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { QrTokenModule } from '../qr-token/qr-token.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    AuthModule,
    EventsModule,
    QrTokenModule,
  ],
  controllers: [BookingController, PublicBookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
