import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StaffDocument = Staff & Document;

@Schema({ timestamps: true })
export class Staff {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop({ enum: ['waiter', 'host', 'manager', 'chef'], default: 'waiter' })
  role: string;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: string;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);
