import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CustomerModule } from './customer/customer.module';
import { BookingModule } from './booking/booking.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { StaffModule } from './staff/staff.module';
import { TableModule } from './table/table.module';
import { MealModule } from './meal/meal.module';
import { ProfileModule } from './profile/profile.module';
import { StatsModule } from './stats/stats.module';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoUri: string;

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        if (process.env.MONGODB_URI) {
          mongoUri = process.env.MONGODB_URI;
        } else {
          const mongod = await MongoMemoryServer.create();
          mongoUri = mongod.getUri();
          console.log('Using in-memory MongoDB at:', mongoUri);
        }
        return { uri: mongoUri };
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
  ],
})
export class AppModule {}
