import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
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
    return this.waitlistService.findOne(id);
  }

  @Get('position/:id')
  async getPosition(@Param('id') id: string) {
    return this.waitlistService.getPosition(id);
  }

  @Get('access/:token')
  async findByAccessToken(@Param('token') token: string) {
    return this.waitlistService.findByAccessToken(token);
  }

  @Put(':id/cancel')
  async cancelByCustomer(@Param('id') id: string, @Body('token') token: string) {
    return this.waitlistService.cancelByCustomer(id, token);
  }
}
