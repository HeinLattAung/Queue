import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop()
  customerEmail: string;

  @Prop()
  customerPhone: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  time: string;

  @Prop({ required: true, default: 1 })
  partySize: number;

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId: Types.ObjectId;

  @Prop({ enum: ['pending', 'confirmed', 'arrived', 'serving', 'completed', 'cancelled'], default: 'pending' })
  status: string;

  @Prop()
  notes: string;

  @Prop({ unique: true, sparse: true })
  bookingNumber: string;

  @Prop({ enum: ['table', 'meal'], default: 'table' })
  bookingType: string;

  @Prop()
  accessToken: string;

  @Prop()
  qrTicket: string;

  @Prop({ default: false })
  qrTicketUsed: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Meal' }] })
  mealIds: Types.ObjectId[];
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
