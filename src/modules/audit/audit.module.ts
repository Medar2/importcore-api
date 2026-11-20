import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Session } from '../security/entities/session.entity';
import { AuditService } from './services/audit.service';
import { SessionAuditService } from './services/session-audit.service';
import { AuditController } from './controllers/audit.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Session])],
  controllers: [AuditController],
  providers: [AuditService, SessionAuditService],
  exports: [AuditService],
})
export class AuditModule {}
