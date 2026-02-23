import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WaitlistController } from './waitlist.controller';
import { PublicWaitlistController } from './public-waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistSchema } from './schemas/waitlist.schema';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { QrTokenModule } from '../qr-token/qr-token.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Waitlist.name, schema: WaitlistSchema }]),
    AuthModule,
    EventsModule,
    QrTokenModule,
  ],
  controllers: [WaitlistController, PublicWaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
