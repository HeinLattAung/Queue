import {
  Controller,
  Post,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { QrTokenService } from './qr-token.service';
import { BusinessService } from '../business/business.service';

@Controller('public/queue')
export class PublicQueueController {
  constructor(
    private qrTokenService: QrTokenService,
    private businessService: BusinessService,
  ) {}

  /**
   * POST /api/public/queue/validate-token
   *
   * Customer's browser calls this after scanning a QR code.
   * Two-phase validation:
   *   1. Decode token (unsigned) to extract shopId
   *   2. Look up shop to get per-shop secret
   *   3. Verify signature + expiry with that secret
   *
   * Returns shop info needed to render the join-queue form.
   */
  @Post('validate-token')
  async validateToken(@Body('token') token: string) {
    // Phase 1: Decode without verification to get shopId
    const decoded = this.qrTokenService.decodeQrEntryToken(token);
    const shopId = decoded.sub;

    // Phase 2: Look up shop (also confirms it exists)
    let business;
    try {
      business = await this.businessService.getBusiness(shopId);
    } catch {
      throw new NotFoundException('Shop not found');
    }

    // Phase 3: Verify signature with shop's own secret
    this.qrTokenService.verifyQrEntryToken(token, business.qrTokenSecret);

    // Return only what the frontend needs — never expose secrets
    return {
      businessId: business._id,
      businessName: business.name,
      location: business.location,
      geoFenceRadius: business.geoFenceRadius,
      hasGeoLocation: business.geoLocation?.coordinates?.[0] !== 0
        || business.geoLocation?.coordinates?.[1] !== 0,
    };
  }
}
