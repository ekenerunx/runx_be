import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';

export class UserCreateSeed implements Seeder {
  async run(dataSource: DataSource) {
    console.log('we are here now');
  }
}
