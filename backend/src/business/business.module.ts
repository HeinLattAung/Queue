import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessController } from './business.controller';
import { PublicBusinessController } from './public-business.controller';
import { BusinessService } from './business.service';
import { Business, BusinessSchema } from './schemas/business.schema';
import { OpeningHours, OpeningHoursSchema } from './schemas/opening-hours.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: OpeningHours.name, schema: OpeningHoursSchema },
    ]),
    AuthModule,
  ],
  controllers: [BusinessController, PublicBusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
