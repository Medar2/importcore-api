import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityNotification } from './entities/security-notification.entity';
import { User } from '../security/entities/user.entity';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { NotificationController } from './controllers/notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityNotification, User])],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}
