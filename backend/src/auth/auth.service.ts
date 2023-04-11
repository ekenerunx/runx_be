import { UsersService } from '../users/users.service';
import { Injectable } from '@nestjs/common';
import { Hash } from 'src/common/utils/hash.util';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/entities/user.entity';
import { jwtConstants } from './auth.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findUserByEmail(email);
    if (user) {
      const isMatch = await Hash.compare(password, user.password);
      if (isMatch) {
        const { password, trnx_pin, ...rest } = user;
        return rest;
      } else {
        return null;
      }
    }
  }

  async login(user: User) {
    const payload = { username: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: jwtConstants.secret,
      }),
    };
  }
}
