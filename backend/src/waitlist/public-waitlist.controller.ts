import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

@Controller('public/waitlist')
export class PublicWaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Post()
  create(@Body() data: any) {
    return this.waitlistService.create(data.businessId, data);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const entry = await this.waitlistService.findOne(id);
    return entry;
  }

  @Get('position/:id')
  async getPosition(@Param('id') id: string) {
    return this.waitlistService.getPosition(id);
  }
}
