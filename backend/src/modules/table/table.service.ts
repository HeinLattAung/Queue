import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TableEntity, TableDocument } from './schemas/table.schema';

@Injectable()
export class TableService {
  constructor(@InjectModel(TableEntity.name) private tableModel: Model<TableDocument>) {}

  async findAll(businessId: string) {
    return this.tableModel.find({ businessId }).sort({ name: 1 });
  }

  async create(businessId: string, data: any) {
    return this.tableModel.create({ ...data, businessId });
  }

  async update(id: string, data: any) {
    const table = await this.tableModel.findByIdAndUpdate(id, data, { new: true });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async remove(id: string) {
    return this.tableModel.findByIdAndDelete(id);
  }
}
