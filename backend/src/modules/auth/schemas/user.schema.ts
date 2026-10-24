import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop()
  avatar: string;

  @Prop({ enum: ['owner', 'staff', 'customer'], default: 'owner' })
  role: string;

  @Prop({ type: Types.ObjectId, ref: 'Business' })
  businessId: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
