import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TableDocument = TableEntity & Document;

@Schema({ timestamps: true })
export class TableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  capacity: number;

  @Prop({ enum: ['available', 'occupied', 'reserved'], default: 'available' })
  status: string;
}

export const TableSchema = SchemaFactory.createForClass(TableEntity);
