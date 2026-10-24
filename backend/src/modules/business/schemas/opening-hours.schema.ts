import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OpeningHoursDocument = OpeningHours & Document;

@Schema({ timestamps: true })
export class OpeningHours {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ required: true, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] })
  day: string;

  @Prop({ required: true })
  openTime: string;

  @Prop({ required: true })
  closeTime: string;

  @Prop({ default: false })
  isClosed: boolean;
}

export const OpeningHoursSchema = SchemaFactory.createForClass(OpeningHours);
