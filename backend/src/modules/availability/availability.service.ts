import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from '../booking/schemas/booking.schema';
import { TableEntity, TableDocument } from '../table/schemas/table.schema';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(TableEntity.name) private tableModel: Model<TableDocument>,
  ) {}

  async getAvailableTables(businessId: string, date: string, time: string, partySize: number) {
    const allTables = await this.tableModel.find({
      businessId,
      capacity: { $gte: partySize },
    }).sort({ capacity: 1 });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookedTableIds = await this.bookingModel.distinct('tableId', {
      businessId,
      date: { $gte: dayStart, $lte: dayEnd },
      time,
      status: { $nin: ['cancelled'] },
    });

    const bookedIds = bookedTableIds.map(id => id.toString());
    return allTables.filter(t => !bookedIds.includes(t._id.toString()));
  }

  async getAvailableTimeSlots(businessId: string, date: string) {
    const totalTables = await this.tableModel.countDocuments({ businessId });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookingsOnDay = await this.bookingModel.find({
      businessId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled'] },
    });

    const slots: string[] = [];
    for (let h = 9; h <= 21; h++) {
      for (const m of ['00', '30']) {
        slots.push(`${String(h).padStart(2, '0')}:${m}`);
      }
    }

    return slots.map(time => {
      const booked = bookingsOnDay.filter(b => b.time === time).length;
      return {
        time,
        available: totalTables - booked,
        total: totalTables,
      };
    });
  }
}
