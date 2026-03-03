import { Injectable, UnauthorizedException, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class QrTokenService {
  constructor(private jwtService: JwtService) {}

  generateAccessToken(resourceId: string, type: 'booking' | 'waitlist'): string {
    return this.jwtService.sign(
      { sub: resourceId, type },
      { expiresIn: '30d' },
    );
  }

  generateQrTicket(bookingId: string): string {
    return this.jwtService.sign(
      { sub: bookingId, type: 'qr-ticket' },
      { expiresIn: '24h' },
    );
  }

  verifyToken(token: string): { sub: string; type: string } {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Generate a QR entry token signed with the shop's own secret.
   * Payload contains shopId so we can look up the secret during validation.
   */
  generateQrEntryToken(shopId: string, shopSecret: string): string {
    return this.jwtService.sign(
      { sub: shopId, type: 'queue-entry' },
      { secret: shopSecret, expiresIn: '24h' },
    );
  }

  /**
   * Decode the token payload WITHOUT verifying the signature.
   * Used to extract shopId so we can look up the per-shop secret.
   */
  decodeQrEntryToken(token: string): { sub: string; type: string } {
    const payload = this.jwtService.decode(token);
    if (!payload || typeof payload !== 'object' || payload.type !== 'queue-entry') {
      throw new UnauthorizedException('Invalid QR token format');
    }
    return payload as { sub: string; type: string };
  }

  /**
   * Verify the QR entry token signature using the shop's secret.
   * Called after decoding + looking up the shop.
   */
  verifyQrEntryToken(token: string, shopSecret: string): { sub: string; type: string } {
    try {
      return this.jwtService.verify(token, { secret: shopSecret });
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw new GoneException('QR code has expired. Please scan a new one.');
      }
      throw new UnauthorizedException('Invalid QR code');
    }
  }
}
