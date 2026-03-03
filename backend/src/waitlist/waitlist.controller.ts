import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('waitlist')
@UseGuards(JwtAuthGuard)
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Get()
  findAll(@CurrentUser('businessId') businessId: string, @Query() query: any) {
    return this.waitlistService.findAll(businessId, query);
  }

  @Get('today')
  getToday(@CurrentUser('businessId') businessId: string) {
    return this.waitlistService.getTodayWaitlist(businessId);
  }

  @Post()
  create(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.waitlistService.create(businessId, data);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.waitlistService.updateStatus(id, status);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string) {
    return this.waitlistService.approve(id);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.waitlistService.reject(id, reason);
  }

  /**
   * PUT /api/waitlist/call-next
   * Call the next person in the queue (optimistic locking).
   */
  @Put('call-next')
  callNext(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.waitlistService.callNext(businessId, adminId);
  }

  /**
   * PUT /api/waitlist/:id/seat
   * Seat an approved entry — move to serving (optimistic locking).
   */
  @Put(':id/seat')
  seat(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.waitlistService.seat(id, businessId, adminId);
  }

  /**
   * PUT /api/waitlist/:id/skip
   * Skip a queue entry (optimistic locking).
   */
  @Put(':id/skip')
  skip(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.waitlistService.skip(id, businessId, adminId);
  }

  /**
   * PUT /api/waitlist/:id/complete
   * Mark a serving entry as completed (optimistic locking).
   */
  @Put(':id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
  ) {
    return this.waitlistService.complete(id, businessId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.waitlistService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waitlistService.remove(id);
  }
}
