import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MealService } from './meal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealController {
  constructor(private mealService: MealService) {}

  @Get()
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.mealService.findAll(businessId);
  }

  @Post()
  create(@CurrentUser('businessId') businessId: string, @Body() data: any) {
    return this.mealService.create(businessId, data);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/meals',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
  }))
  uploadImage(@UploadedFile() file: any) {
    return { url: `/uploads/meals/${file.filename}` };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.mealService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mealService.remove(id);
  }
}
