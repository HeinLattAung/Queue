import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  findAll(@CurrentUser('businessId') businessId: string, @Query() query: any) {
    return this.customerService.findAll(businessId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Post()
  create(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.customerService.create(businessId, data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.customerService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerService.remove(id);
  }
}
