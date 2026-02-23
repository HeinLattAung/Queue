import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get()
  findAll(@CurrentUser('businessId') businessId: string, @Query() query: any) {
    return this.bookingService.findAll(businessId, query);
  }

  @Get('today')
  getToday(@CurrentUser('businessId') businessId: string) {
    return this.bookingService.getTodayBookings(businessId);
  }

  @Get('range')
  getByRange(
    @CurrentUser('businessId') businessId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingService.findByDateRange(businessId, start, end);
  }

  @Post()
  create(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.bookingService.create(businessId, data);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.bookingService.updateStatus(id, status);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.bookingService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
}
