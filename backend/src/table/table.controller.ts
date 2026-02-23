import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TableService } from './table.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TableController {
  constructor(private tableService: TableService) {}

  @Get()
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.tableService.findAll(businessId);
  }

  @Post()
  create(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.tableService.create(businessId, data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.tableService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tableService.remove(id);
  }
}
