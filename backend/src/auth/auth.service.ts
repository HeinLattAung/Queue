import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { SignUpDto, LoginDto } from './dto/auth.dto';
import { Business, BusinessDocument } from '../business/schemas/business.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    private jwtService: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const business = await this.businessModel.create({
      name: dto.restaurantName,
      location: dto.location || '',
    });

    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone || '',
      role: 'owner',
      businessId: business._id,
    });

    const token = this.generateToken(user);
    return {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, businessId: business._id },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken(user);
    return {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, businessId: user.businessId },
    };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).select('-password').populate('businessId');
    return user;
  }

  private generateToken(user: UserDocument) {
    return this.jwtService.sign({ sub: user._id, email: user.email, role: user.role });
  }
}
