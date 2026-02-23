import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Waitlist, WaitlistDocument } from './schemas/waitlist.schema';

@Injectable()
export class WaitlistService {
  constructor(@InjectModel(Waitlist.name) private waitlistModel: Model<WaitlistDocument>) {}

  async findAll(businessId: string, query: any) {
    const { status, page = 1, limit = 20 } = query;
    const filter: any = { businessId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.waitlistModel.find(filter).skip(skip).limit(+limit).sort({ createdAt: 1 }).populate('tableId'),
      this.waitlistModel.countDocuments(filter),
    ]);
    return { data, total, page: +page, totalPages: Math.ceil(total / +limit) };
  }

  async getTodayWaitlist(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.waitlistModel.find({
      businessId,
      createdAt: { $gte: today, $lt: tomorrow },
    }).sort({ createdAt: 1 }).populate('tableId');
  }

  async findOne(id: string) {
    const entry = await this.waitlistModel.findById(id).populate('tableId');
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  async getPosition(id: string) {
    const entry = await this.waitlistModel.findById(id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ahead = await this.waitlistModel.countDocuments({
      businessId: entry.businessId,
      status: 'waiting',
      createdAt: { $gte: today, $lt: (entry as any).createdAt },
    });

    const totalWaiting = await this.waitlistModel.countDocuments({
      businessId: entry.businessId,
      status: 'waiting',
      createdAt: { $gte: today, $lt: tomorrow },
    });

    return {
      position: entry.status === 'waiting' ? ahead + 1 : 0,
      totalWaiting,
      status: entry.status,
      customerName: entry.customerName,
      partySize: entry.partySize,
      estimatedWait: (ahead + 1) * 5,
    };
  }

  async create(businessId: string, data: any) {
    return this.waitlistModel.create({ ...data, businessId });
  }

  async updateStatus(id: string, status: string) {
    const entry = await this.waitlistModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  async update(id: string, data: any) {
    return this.waitlistModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string) {
    return this.waitlistModel.findByIdAndDelete(id);
  }
}
