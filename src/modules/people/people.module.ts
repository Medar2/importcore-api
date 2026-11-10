import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { Address } from './entities/address.entity';
import { Bank } from './entities/bank.entity';
import { PersonBankAccount } from './entities/person-bank-account.entity';
import { SystemConfig } from '../config/entities/system-config.entity';
import { PeopleService } from './services/people.service';
import { PeopleController } from './controllers/people.controller';
import { BanksService } from './services/banks.service';
import { BanksController } from './controllers/banks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Person,
      Address,
      Bank,
      PersonBankAccount,
      SystemConfig,
    ]),
  ],
  controllers: [PeopleController, BanksController],
  providers: [PeopleService, BanksService],
  exports: [TypeOrmModule, PeopleService, BanksService],
})
export class PeopleModule {}

