import { Controller, Post, UseGuards } from '@nestjs/common';
import { QrTokenService } from './qr-token.service';
import { BusinessService } from '../business/business.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('qr-token')
@UseGuards(JwtAuthGuard)
export class QrTokenController {
  constructor(
    private qrTokenService: QrTokenService,
    private businessService: BusinessService,
  ) {}

  /**
   * POST /api/qr-token/generate
   *
   * Admin generates a signed QR entry token for their shop.
   * Returns the token and the full URL to encode into a QR image.
   */
  @Post('generate')
  async generateQrToken(@CurrentUser('businessId') businessId: string) {
    const business = await this.businessService.getBusiness(businessId);

    const token = this.qrTokenService.generateQrEntryToken(
      businessId,
      business.qrTokenSecret,
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const bookingUrl = `${frontendUrl}/join?token=${token}`;

    return {
      token,
      bookingUrl,
      expiresIn: '24h',
      shopName: business.name,
    };
  }
}
