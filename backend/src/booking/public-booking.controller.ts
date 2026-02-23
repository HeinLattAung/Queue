import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
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
    return this.bookingService.findOne(id);
  }

  @Get('access/:token')
  async findByAccessToken(@Param('token') token: string) {
    return this.bookingService.findByAccessToken(token);
  }

  @Put(':id/cancel')
  async cancelByCustomer(@Param('id') id: string, @Body('token') token: string) {
    return this.bookingService.cancelByCustomer(id, token);
  }

  @Post(':id/scan')
  async scanArrival(@Param('id') id: string, @Body('qrTicket') qrTicket: string) {
    return this.bookingService.scanArrival(id, qrTicket);
  }
}
