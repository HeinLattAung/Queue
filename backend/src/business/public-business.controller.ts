import { Controller, Get, Param } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('public/business')
export class PublicBusinessController {
  constructor(private businessService: BusinessService) {}

  @Get(':id')
  getBusiness(@Param('id') id: string) {
    return this.businessService.getBusiness(id);
  }

  @Get(':id/hours')
  getOpeningHours(@Param('id') id: string) {
    return this.businessService.getOpeningHours(id);
  }
}
