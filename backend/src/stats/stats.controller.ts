import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('dashboard')
  getDashboardStats(@CurrentUser('businessId') businessId: string) {
    return this.statsService.getDashboardStats(businessId);
  }

  @Get('weekly')
  getWeeklyStats(@CurrentUser('businessId') businessId: string) {
    return this.statsService.getWeeklyStats(businessId);
  }

  @Get('peak-hours')
  getPeakHours(@CurrentUser('businessId') businessId: string) {
    return this.statsService.getPeakHours(businessId);
  }

  @Get('monthly')
  getMonthlyStats(
    @CurrentUser('businessId') businessId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.statsService.getMonthlyStats(businessId, +year, +month);
  }
}
