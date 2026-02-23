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

  async updateStatus(id: string, status: string) {
    const booking = await this.bookingModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) throw new NotFoundException('Booking not found');

    this.eventsGateway.emitToRoom(`booking:${id}`, 'booking:updated', booking);
    this.eventsGateway.emitToRoom(`business:${booking.businessId}`, 'booking:updated', booking);

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
    if (payload.sub !== id) {
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

    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.qrTicketUsed) throw new BadRequestException('QR ticket already used');

    booking.status = 'arrived';
    booking.qrTicketUsed = true;
    await booking.save();

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
