import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '../dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(createDto: CreateSubscriptionPlanDto) {
    const plan = this.planRepository.create(createDto);
    return this.planRepository.save(plan);
  }

  async findAll() {
    return this.planRepository.find();
  }

  async findOne(id: string) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async update(id: string, updateDto: UpdateSubscriptionPlanDto) {
    const plan = await this.findOne(id);
    Object.assign(plan, updateDto);
    return this.planRepository.save(plan);
  }
}
