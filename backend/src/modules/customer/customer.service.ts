import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomerService {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  async findAll(businessId: string, query: any) {
    const { search, status, page = 1, limit = 10 } = query;
    const filter: any = { businessId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.customerModel.find(filter).skip(skip).limit(+limit).sort({ createdAt: -1 }),
      this.customerModel.countDocuments(filter),
    ]);

    return { data, total, page: +page, totalPages: Math.ceil(total / +limit) };
  }

  async findOne(id: string) {
    const customer = await this.customerModel.findById(id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(businessId: string, data: any) {
    return this.customerModel.create({ ...data, businessId });
  }

  async update(id: string, data: any) {
    return this.customerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string) {
    return this.customerModel.findByIdAndDelete(id);
  }
}
