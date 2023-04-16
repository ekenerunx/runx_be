import { getRandomArrayItems } from '@src/common/utils';
import { AppDataSource } from '@src/db/data-source';
import { ServiceType } from '@src/entities/service-type.entity';
import { User } from '@src/entities/user.entity';
import { Connection } from 'typeorm';
// import { Factory, Seeder } from 'typeorm-seeding';

// export class CreateUsers implements Seeder {
//   public async run(factory: Factory, connection: Connection): Promise<any> {
//     const serviceTypeRepo = await AppDataSource.getRepository(ServiceType);
//     const serviceTypes = serviceTypeRepo.find({});
//     await factory(User)()
//       .map(async (u) => {
//         const userServiceTypes = getRandomArrayItems(serviceTypes);
//         u.service_types = userServiceTypes;
//         return u;
//       })
//       .createMany(200);
//   }
// }
