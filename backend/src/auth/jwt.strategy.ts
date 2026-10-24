import { getJwtSecret } from '../common/config/security';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email || !payload.role || payload.type) throw new UnauthorizedException();
    const user = await this.userModel.findById(payload.sub).select('-password');
    if (!user) throw new UnauthorizedException();
    return { userId: user._id.toString(), email: user.email, role: user.role, businessId: user.businessId?.toString() };
  }
}
