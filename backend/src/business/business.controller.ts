import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('business')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get()
  getBusiness(@CurrentUser('businessId') businessId: string) {
    return this.businessService.getBusiness(businessId);
  }

  @Put()
  updateBusiness(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.businessService.updateBusiness(businessId, data);
  }

  @Get('hours')
  getOpeningHours(@CurrentUser('businessId') businessId: string) {
    return this.businessService.getOpeningHours(businessId);
  }

  @Post('hours')
  setOpeningHours(@CurrentUser('businessId') businessId: string, @Body('hours') hours: any[]) {
    return this.businessService.setOpeningHours(businessId, hours);
  }
}
