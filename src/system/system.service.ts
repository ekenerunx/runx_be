import { ServiceType } from './../entities/service-type.entity';
import { UsersService } from 'src/users/users.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Hash } from 'src/common/utils/hash.util';
import { User } from 'src/entities/user.entity';
import { RegisterUserDto } from 'src/users/dto/register-user.dto';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { getRandomEnumValue } from 'src/common/utils/random-enum.util';
import { Gender } from 'src/users/interfaces/user.interface';
import * as _ from 'lodash';
import { COUNTRIES } from 'src/constant/countries.constant';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ServiceType)
    private readonly stRepo: Repository<ServiceType>,
    private readonly userService: UsersService,
  ) {}
  async seedUser(registerUserDto: RegisterUserDto) {
    const __serviceTypes = await this.stRepo.find({});
    const shuffledServiceTypes = _.shuffle(__serviceTypes);
    const serviceTypes = shuffledServiceTypes.slice(0, 5);
    const hashedPassword = await Hash.encrypt('Password@1234');
    const uniqueId = await this.userService.generateUserCode();
    const email = `theo4biz2012+sp+${uniqueId}@gmail.com`;
    const location = COUNTRIES.nigeria.find((r) =>
      r.state.toLowerCase().includes('lagos'),
    );
    // const location = _.sample(COUNTRIES.nigeria);
    const state = location.state;
    const lga = _.sample(location.lgas);

    const newUser: Partial<User> = {
      password: hashedPassword,
      email,
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      gender: getRandomEnumValue(Gender),
      is_client: true,
      is_sp: true,
      unique_id: uniqueId,
      service_types: serviceTypes,
      loc_country: 'NIGERIA',
      loc_state: state,
      loc_lga: lga,
    };
    return await this.userRepo.create(newUser);
  }
}
