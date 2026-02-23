import { Controller, Get, Param } from '@nestjs/common';
import { BusinessService } from './business.service';
import { MealService } from '../meal/meal.service';

@Controller('public/business')
export class PublicBusinessController {
  constructor(
    private businessService: BusinessService,
    private mealService: MealService,
  ) {}

  @Get(':id')
  getBusiness(@Param('id') id: string) {
    return this.businessService.getBusiness(id);
  }

  @Get(':id/hours')
  getOpeningHours(@Param('id') id: string) {
    return this.businessService.getOpeningHours(id);
  }

  @Get(':id/meals')
  getMeals(@Param('id') id: string) {
    return this.mealService.findAll(id);
  }
}
