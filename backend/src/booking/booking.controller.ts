import { BusinessGuard } from '../common/guards/business.guard';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get('my')
  findMyBookings(@CurrentUser('userId') userId: string, @CurrentUser('email') email: string) {
    return this.bookingService.findByUserId(userId);
  }

  @Get()
  @UseGuards(BusinessGuard)
  findAll(@CurrentUser('businessId') businessId: string, @Query() query: any) {
    return this.bookingService.findAll(businessId, query);
  }

  @Get('today')
  @UseGuards(BusinessGuard)
  getToday(@CurrentUser('businessId') businessId: string) {
    return this.bookingService.getTodayBookings(businessId);
  }

  @Get('range')
  @UseGuards(BusinessGuard)
  getByRange(
    @CurrentUser('businessId') businessId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingService.findByDateRange(businessId, start, end);
  }

  @Post()
  @UseGuards(BusinessGuard)
  create(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.bookingService.create(businessId, data);
  }

  @Put(':id/status')
  @UseGuards(BusinessGuard)
  updateStatus(@CurrentUser('businessId') businessId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.bookingService.updateStatus(id, status, businessId);
  }

  @Put(':id')
  @UseGuards(BusinessGuard)
  update(@CurrentUser('businessId') businessId: string, @Param('id') id: string, @Body() data: any) {
    return this.bookingService.update(id, data, businessId);
  }

  @Delete(':id')
  @UseGuards(BusinessGuard)
  remove(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    return this.bookingService.remove(id, businessId);
  }
}
