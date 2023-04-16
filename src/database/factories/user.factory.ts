import { User } from '@src/entities/user.entity';
import { faker } from '@faker-js/faker';
// import { define } from 'typeorm-seeding';
import { Gender } from '@src/users/interfaces/user.interface';
import { getRandomEnumValue } from '@src/common/utils/random-enum.util';
import { getRandomNumberInRange } from '@src/common/utils';
import { COUNTRIES } from '@src/constant/countries.constant';

// define(User, () => {
//   const location =
//     COUNTRIES.nigeria[getRandomNumberInRange(0, COUNTRIES.nigeria.length)];
//   const locationState = location.state;
//   const locationLga =
//     location.lgas[getRandomNumberInRange(0, location.lgas.length)];
//   const user = new User();
//   user.first_name = faker.name.firstName();
//   user.last_name = faker.name.lastName();
//   user.gender = getRandomEnumValue(Gender);
//   user.bio = faker.random.words(10);
//   user.avai_status = true;
//   user.loc_country = 'Nigeria';
//   user.loc_state = locationState;
//   user.loc_lga = locationLga;
//   user.amount_per_hour = parseFloat(faker.random.numeric(4));
//   user.photo_uri = '8ef0160d-a870-4ccf-ba94-f5d8006fe719-avatar-1.jpg';
//   user.service_types = [];
//   user.created_at = new Date();
//   user.email = faker.internet.email();
//   user.password = 'Password1234';
//   user.is_verified = true;
//   user.is_sp = true;
//   user.is_client = true;
//   return user;
// });
