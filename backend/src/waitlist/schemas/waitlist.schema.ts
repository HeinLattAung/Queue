import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WaitlistDocument = Waitlist & Document;

@Schema({ timestamps: true })
export class Waitlist {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop()
  customerPhone: string;

  @Prop()
  customerEmail: string;

  @Prop({ required: true, default: 1 })
  partySize: number;

  @Prop({ enum: ['waiting', 'approved', 'rejected', 'serving', 'completed', 'cancelled'], default: 'waiting' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId: Types.ObjectId;

  @Prop()
  notes: string;

  @Prop()
  estimatedWait: number;

  @Prop()
  accessToken: string;

  @Prop()
  approvedAt: Date;

  @Prop()
  rejectedReason: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
