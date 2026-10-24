import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('public/availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get('tables')
  getAvailableTables(
    @Query('businessId') businessId: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('partySize') partySize: string,
  ) {
    return this.availabilityService.getAvailableTables(businessId, date, time, +partySize || 1);
  }

  @Get('slots')
  getAvailableTimeSlots(
    @Query('businessId') businessId: string,
    @Query('date') date: string,
  ) {
    return this.availabilityService.getAvailableTimeSlots(businessId, date);
  }
}
