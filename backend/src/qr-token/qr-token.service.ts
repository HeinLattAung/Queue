import { Injectable, UnauthorizedException } from '@nestjs/common';
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
}
