import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meal, MealDocument } from './schemas/meal.schema';

@Injectable()
export class MealService {
  constructor(@InjectModel(Meal.name) private mealModel: Model<MealDocument>) {}

  async findAll(businessId: string) {
    return this.mealModel.find({ businessId }).sort({ category: 1, name: 1 });
  }

  async create(businessId: string, data: any) {
    return this.mealModel.create({ ...data, businessId });
  }

  async update(id: string, data: any) {
    const meal = await this.mealModel.findByIdAndUpdate(id, data, { new: true });
    if (!meal) throw new NotFoundException('Meal not found');
    return meal;
  }

  async remove(id: string) {
    return this.mealModel.findByIdAndDelete(id);
  }
}
