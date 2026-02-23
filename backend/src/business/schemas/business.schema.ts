import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessDocument = Business & Document;

@Schema({ timestamps: true })
export class Business {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  logo: string;

  @Prop({ default: '' })
  description: string;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
