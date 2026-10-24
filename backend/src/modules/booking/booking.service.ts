import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { EventsGateway } from '../events/events.gateway';
import { QrTokenService } from '../qr-token/qr-token.service';
import { nanoid } from 'nanoid';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private eventsGateway: EventsGateway,
    private qrTokenService: QrTokenService,
  ) {}

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
    const booking = await this.bookingModel.findById(id).populate('tableId').populate('mealIds');
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(businessId: string, data: any) {
    const bookingNumber = nanoid(8).toUpperCase();
    const booking = await this.bookingModel.create({
      ...data,
      businessId,
      bookingNumber,
    });

    const accessToken = this.qrTokenService.generateAccessToken(booking._id.toString(), 'booking');
    const qrTicket = this.qrTokenService.generateQrTicket(booking._id.toString());

    booking.accessToken = accessToken;
    booking.qrTicket = qrTicket;
    await booking.save();

    this.eventsGateway.emitToRoom(`business:${businessId}`, 'booking:updated', booking);
    this.eventsGateway.emitToRoom(`business:${businessId}`, 'availability:changed', { businessId });

    return booking;
  }

  async updateStatus(id: string, status: string, businessId: string) {
    const booking = await this.bookingModel.findOneAndUpdate({ _id: id, businessId }, { $set: { status } }, { new: true, runValidators: true });
    if (!booking) throw new NotFoundException('Booking not found');

    this.eventsGateway.emitToRoom(`booking:${id}`, 'booking:updated', booking);
    this.eventsGateway.emitToRoom(`business:${booking.businessId}`, 'booking:updated', booking);

    return booking;
  }

  async update(id: string, data: any, businessId: string) {
    const fields = ['customerName', 'customerEmail', 'customerPhone', 'date', 'time', 'partySize', 'tableId', 'notes', 'bookingType', 'mealIds'];
    const changes = Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(data, key)).map(key => [key, data[key]]));
    const booking = await this.bookingModel.findOneAndUpdate({ _id: id, businessId }, { $set: changes }, { new: true, runValidators: true });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async remove(id: string, businessId: string) {
    const booking = await this.bookingModel.findOneAndDelete({ _id: id, businessId });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
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

  async findStatusWithAccess(id: string, token: string) {
    this.qrTokenService.assertResourceAccess(token, id, 'booking');
    return this.findOne(id);
  }

  async findByAccessToken(token: string) {
    const payload = this.qrTokenService.verifyToken(token);
    if (payload.type !== 'booking') {
      throw new UnauthorizedException('Invalid token type');
    }
    const booking = await this.bookingModel.findById(payload.sub).populate('tableId').populate('mealIds');
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async cancelByCustomer(id: string, token: string) {
    const payload = this.qrTokenService.verifyToken(token);
    if (payload.type !== 'booking' || payload.sub !== id) {
      throw new UnauthorizedException('Token does not match booking');
    }
    const booking = await this.bookingModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
    if (!booking) throw new NotFoundException('Booking not found');

    this.eventsGateway.emitToRoom(`booking:${id}`, 'booking:updated', booking);
    this.eventsGateway.emitToRoom(`business:${booking.businessId}`, 'booking:updated', booking);
    this.eventsGateway.emitToRoom(`business:${booking.businessId}`, 'availability:changed', { businessId: booking.businessId });

    return booking;
  }

  async scanArrival(id: string, qrTicket: string) {
    const payload = this.qrTokenService.verifyToken(qrTicket);
    if (payload.type !== 'qr-ticket' || payload.sub !== id) {
      throw new BadRequestException('Invalid QR ticket');
    }

    // A single conditional write prevents simultaneous scans from consuming a ticket twice.
    const booking = await this.bookingModel.findOneAndUpdate(
      { _id: id, qrTicketUsed: false, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'arrived', qrTicketUsed: true } },
      { new: true, runValidators: true },
    );
    if (!booking) throw new BadRequestException('QR ticket already used or booking is not awaiting arrival');

    this.eventsGateway.emitToRoom(`booking:${id}`, 'booking:updated', booking);
    this.eventsGateway.emitToRoom(`business:${booking.businessId}`, 'booking:updated', booking);

    return booking;
  }

  async findByCustomerEmail(email: string) {
    return this.bookingModel.find({ customerEmail: email })
      .sort({ date: -1, time: -1 })
      .limit(50)
      .populate('tableId')
      .populate('mealIds');
  }

  async findByUserId(userId: string) {
    return this.bookingModel.find({ userId })
      .sort({ date: -1, time: -1 })
      .limit(50)
      .populate('tableId')
      .populate('mealIds');
  }
}
