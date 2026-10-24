import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from '../booking/schemas/booking.schema';
import { Waitlist, WaitlistDocument } from '../waitlist/schemas/waitlist.schema';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Waitlist.name) private waitlistModel: Model<WaitlistDocument>,
  ) {}

  async getDashboardStats(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [bookingCount, waitlistCount, servingCount, completedCount] = await Promise.all([
      this.bookingModel.countDocuments({ businessId, date: { $gte: today, $lt: tomorrow }, status: { $in: ['pending', 'confirmed'] } }),
      this.waitlistModel.countDocuments({ businessId, createdAt: { $gte: today, $lt: tomorrow }, status: 'waiting' }),
      this.bookingModel.countDocuments({ businessId, date: { $gte: today, $lt: tomorrow }, status: 'serving' })
        .then(bc => this.waitlistModel.countDocuments({ businessId, createdAt: { $gte: today, $lt: tomorrow }, status: 'serving' }).then(wc => bc + wc)),
      this.bookingModel.countDocuments({ businessId, date: { $gte: today, $lt: tomorrow }, status: 'completed' })
        .then(bc => this.waitlistModel.countDocuments({ businessId, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' }).then(wc => bc + wc)),
    ]);

    return { bookingCount, waitlistCount, servingCount, completedCount };
  }

  async getWeeklyStats(businessId: string) {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const bookings = await this.bookingModel.aggregate([
      { $match: { businessId: { $eq: businessId }, date: { $gte: weekAgo, $lte: now } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return bookings;
  }

  async getPeakHours(businessId: string) {
    const bookings = await this.bookingModel.aggregate([
      { $match: { businessId: { $eq: businessId } } },
      { $group: { _id: '$time', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]);
    return bookings;
  }

  async getMonthlyStats(businessId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [bookings, waitlists] = await Promise.all([
      this.bookingModel.aggregate([
        { $match: { businessId: { $eq: businessId }, date: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 }, partyTotal: { $sum: '$partySize' } } },
        { $sort: { _id: 1 } },
      ]),
      this.waitlistModel.aggregate([
        { $match: { businessId: { $eq: businessId }, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return { bookings, waitlists };
  }
}
