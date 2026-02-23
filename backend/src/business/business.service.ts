import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from './schemas/business.schema';
import { OpeningHours, OpeningHoursDocument } from './schemas/opening-hours.schema';

@Injectable()
export class BusinessService {
  constructor(
    @InjectModel(Business.name) private businessModel: Model<BusinessDocument>,
    @InjectModel(OpeningHours.name) private openingHoursModel: Model<OpeningHoursDocument>,
  ) {}

  async getBusiness(businessId: string) {
    const business = await this.businessModel.findById(businessId);
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateBusiness(businessId: string, data: Partial<Business>) {
    return this.businessModel.findByIdAndUpdate(businessId, data, { new: true });
  }

  async getOpeningHours(businessId: string) {
    return this.openingHoursModel.find({ businessId }).sort('day');
  }

  async setOpeningHours(businessId: string, hours: any[]) {
    await this.openingHoursModel.deleteMany({ businessId });
    const docs = hours.map(h => ({ ...h, businessId }));
    return this.openingHoursModel.insertMany(docs);
  }
}
