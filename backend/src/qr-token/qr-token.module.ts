import { getJwtSecret } from '../common/config/security';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QrTokenService } from './qr-token.service';
import { QrTokenController } from './qr-token.controller';
import { PublicQueueController } from './public-queue.controller';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '30d' },
    }),
    BusinessModule,
  ],
  controllers: [QrTokenController, PublicQueueController],
  providers: [QrTokenService],
  exports: [QrTokenService],
})
export class QrTokenModule {}
