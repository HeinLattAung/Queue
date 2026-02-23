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

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.waitlistService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waitlistService.remove(id);
  }
}
