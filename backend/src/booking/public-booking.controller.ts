import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { BookingService } from './booking.service';

@Controller('public/bookings')
export class PublicBookingController {
  constructor(private bookingService: BookingService) {}

  @Post()
  create(@Body() data: any) {
    return this.bookingService.create(data.businessId, data);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const booking = await this.bookingService.findOne(id);
    return booking;
  }
}
