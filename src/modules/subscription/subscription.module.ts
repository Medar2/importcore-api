import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { User } from '../security/entities/user.entity';
import { SecurityModule } from '../security/security.module';
import { RBacModule } from '../rbac/rbac.module';
import { SubscriptionPlanService } from './services/subscription-plan.service';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionPlanController } from './controllers/subscription-plan.controller';
import { SubscriptionController } from './controllers/subscription.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SubscriptionPlan, User]),
    SecurityModule,
    RBacModule,
  ],
  controllers: [SubscriptionPlanController, SubscriptionController],
  providers: [SubscriptionPlanService, SubscriptionService],
  exports: [SubscriptionPlanService, SubscriptionService, TypeOrmModule],
})
export class SubscriptionModule {}
