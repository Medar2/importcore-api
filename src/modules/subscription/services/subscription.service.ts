import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { User } from '../../security/entities/user.entity';
import { AppModulesService } from '../../app-modules/services/app-modules.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from '../dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly appModulesService: AppModulesService,
  ) {}

  async create(createDto: CreateSubscriptionDto) {
    const subscription = this.subscriptionRepository.create({
      ...createDto,
      startDate: createDto.startDate || new Date(),
      status: createDto.status || 'active',
    });
    const saved = await this.subscriptionRepository.save(subscription);
    await this.syncModulesForSubscription(saved.id);
    return saved;
  }

  async findAll() {
    return this.subscriptionRepository.find({ relations: ['user', 'plan'] });
  }

  async findByUserId(userId: string) {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['plan'],
    });
  }

  async findOne(id: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['user', 'plan'],
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async update(id: string, updateDto: UpdateSubscriptionDto) {
    const subscription = await this.findOne(id);
    Object.assign(subscription, updateDto);
    const saved = await this.subscriptionRepository.save(subscription);
    // Re-sincronizar módulos cuando cambia el plan o el estado de la suscripción
    if (updateDto.planId || updateDto.status) {
      await this.syncModulesForSubscription(saved.id);
    }
    return saved;
  }

  async getActiveSubscription(userId: string) {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: 'active',
      },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Materializa los módulos del plan como overrides en organization_app_module
   * para la organización del usuario suscriptor.
   */
  private async syncModulesForSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan', 'user'],
    });

    if (!subscription || subscription.status !== 'active') return;

    const moduleCodes = subscription.plan?.modules;
    if (!Array.isArray(moduleCodes) || moduleCodes.length === 0) return;

    const organizationId = subscription.user?.organizationId;
    if (!organizationId) return;

    await this.appModulesService.syncModulesFromPlan(
      moduleCodes,
      organizationId,
      subscription.userId,
    );
  }
}
