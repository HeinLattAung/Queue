import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { CustomerModule } from './modules/customer/customer.module';
import { BookingModule } from './modules/booking/booking.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { StaffModule } from './modules/staff/staff.module';
import { TableModule } from './modules/table/table.module';
import { MealModule } from './modules/meal/meal.module';
import { ProfileModule } from './modules/profile/profile.module';
import { StatsModule } from './modules/stats/stats.module';
import { EventsModule } from './modules/events/events.module';
import { QrTokenModule } from './modules/qr-token/qr-token.module';
import { AvailabilityModule } from './modules/availability/availability.module';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        if (process.env.MONGODB_URI) {
          return { uri: process.env.MONGODB_URI };
        }
        if (process.env.NODE_ENV === 'production') {
          throw new Error('MONGODB_URI is required in production');
        }
        // In-memory MongoDB for local development only
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        console.log('Using in-memory MongoDB at:', uri);
        return { uri };
      },
    }),
    AuthModule,
    BusinessModule,
    CustomerModule,
    BookingModule,
    WaitlistModule,
    StaffModule,
    TableModule,
    MealModule,
    ProfileModule,
    StatsModule,
    EventsModule,
    QrTokenModule,
    AvailabilityModule,
  ],
})
export class AppModule {}
