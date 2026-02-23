import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Staff, StaffDocument } from './schemas/staff.schema';

@Injectable()
export class StaffService {
  constructor(@InjectModel(Staff.name) private staffModel: Model<StaffDocument>) {}

  async findAll(businessId: string) {
    return this.staffModel.find({ businessId }).sort({ name: 1 });
  }

  async create(businessId: string, data: any) {
    return this.staffModel.create({ ...data, businessId });
  }

  async update(id: string, data: any) {
    const staff = await this.staffModel.findByIdAndUpdate(id, data, { new: true });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async remove(id: string) {
    return this.staffModel.findByIdAndDelete(id);
  }
}
