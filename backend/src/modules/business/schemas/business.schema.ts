import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomBytes } from 'crypto';

export type BusinessDocument = Business & Document;

@Schema({ _id: false })
export class GeoLocation {
  @Prop({ enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], default: [0, 0] })
  coordinates: number[]; // [longitude, latitude]
}

@Schema({ timestamps: true })
export class Business {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ type: GeoLocation, default: () => ({ type: 'Point', coordinates: [0, 0] }) })
  geoLocation: GeoLocation;

  @Prop({ default: 100, min: 10, max: 5000 })
  geoFenceRadius: number; // meters

  @Prop({ default: '' })
  logo: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: () => randomBytes(32).toString('hex') })
  qrTokenSecret: string;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

BusinessSchema.index({ geoLocation: '2dsphere' });
