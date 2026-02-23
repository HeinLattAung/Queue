import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';

@Injectable()
export class BookingService {
  constructor(@InjectModel(Booking.name) private bookingModel: Model<BookingDocument>) {}

  async findAll(businessId: string, query: any) {
    const { date, status, page = 1, limit = 20 } = query;
    const filter: any = { businessId };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.bookingModel.find(filter).skip(skip).limit(+limit).sort({ date: 1, time: 1 }).populate('tableId'),
      this.bookingModel.countDocuments(filter),
    ]);
    return { data, total, page: +page, totalPages: Math.ceil(total / +limit) };
  }

  async findByDateRange(businessId: string, startDate: string, endDate: string) {
    return this.bookingModel.find({
      businessId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).sort({ date: 1, time: 1 });
  }

  async findOne(id: string) {
    const booking = await this.bookingModel.findById(id).populate('tableId');
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(businessId: string, data: any) {
    return this.bookingModel.create({ ...data, businessId });
  }

  async updateStatus(id: string, status: string) {
    const booking = await this.bookingModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: string, data: any) {
    return this.bookingModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string) {
    return this.bookingModel.findByIdAndDelete(id);
  }

  async getTodayBookings(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.bookingModel.find({
      businessId,
      date: { $gte: today, $lt: tomorrow },
    }).sort({ time: 1 }).populate('tableId');
  }
}
