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

  @Prop({ default: 0 })
  position: number;

  @Prop({ default: 0 })
  version: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy: Types.ObjectId;

  @Prop()
  processedAt: Date;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);

// Compound index for fast tenant-scoped queries
WaitlistSchema.index({ businessId: 1, status: 1, position: 1 });
WaitlistSchema.index({ businessId: 1, createdAt: -1 });

// Partial unique index: one active entry per customer phone per shop
// Only enforced when status is 'waiting' or 'approved'
WaitlistSchema.index(
  { businessId: 1, customerPhone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['waiting', 'approved'] },
      customerPhone: { $exists: true, $ne: '' },
    },
  },
);
