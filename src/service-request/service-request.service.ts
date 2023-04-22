import { ServiceRequest } from '../entities/service-request.entity';
import { SendInvitesDto } from '../invite/dto/send-invites.dto';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { SRSPQueryDto } from './dto/sr-sp.dto';
import { ServiceTypesService } from 'src/services-types/service-types.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { User } from 'src/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { CatchErrorException } from 'src/exceptions';
import { ClientServiceRequestQueryDto } from './dto/client-service-request.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { GET_SERVICE_REQUEST_BY_ID_FIELDS } from './service-request.constant';
import { PatchServiceRequestDto } from './dto/patch-service-request.dto';
import { Rating } from 'src/entities/rating.entity';

@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,
    @InjectRepository(Rating) private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private serviceTypesService: ServiceTypesService,
    private readonly userService: UsersService,
  ) {}

  async create(createServiceRequestDto: CreateServiceRequestDto, user: User) {
    try {
      const { service_types } = createServiceRequestDto;
      const serviceTypes = await this.serviceTypesService.getServiceTypesByIds(
        service_types,
      );
      if (!serviceTypes.length) {
        throw new HttpException('Invalid service type', HttpStatus.BAD_REQUEST);
      }
      const request = await this.serviceRequestRepository.save({
        status: ServiceRequestStatus.NEW,
        ...createServiceRequestDto,
        service_types: serviceTypes,
        created_by: user,
      });
      return await this.getServiceRequestById(request.id);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async patchServiceRequest(
    id: string,
    patchServiceRequestDto: PatchServiceRequestDto,
  ) {
    try {
      const request = await this.getServiceRequestById(id);
      const { service_types, ...__patchServiceRequestDto } =
        patchServiceRequestDto;
      if (service_types.length) {
        const serviceTypes =
          await this.serviceTypesService.getServiceTypesByIds(service_types);
        request.service_types = serviceTypes;
      }
      await this.serviceRequestRepository.save({
        ...request,
        ...__patchServiceRequestDto,
      });
      return await this.getServiceRequestById(request.id);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getServiceRequestById(id: string, isThrowError = true) {
    try {
      const serviceRequest = await this.serviceRequestRepository
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.created_by', 'user')
        .leftJoinAndSelect('r.service_types', 'st')
        .where('r.id = :id', { id })
        .select(GET_SERVICE_REQUEST_BY_ID_FIELDS)
        .getOne();
      if (!serviceRequest && isThrowError) {
        throw new NotFoundException('Service Request not found');
      }
      return serviceRequest;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getSRServiceProviders(
    serviceRequestId: string,
    query: SRSPQueryDto,
  ): Promise<Pagination<Partial<User>>> {
    const {
      state,
      city,
      price_from,
      price_to,
      rating,
      gender,
      profile_pic,
      page,
      limit,
    } = query;
    const request = await this.getServiceRequestById(serviceRequestId);
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.service_types', 'st')
      .where('user.is_sp = true')
      .andWhere('user.is_verified = true')
      // .andWhere('user.loc_state = :state', { state: request.start_state })
      // .andWhere('user.loc_city = :city', { city: request.start_city })
      .andWhere('st.id IN (:...serviceTypeIds)', {
        serviceTypeIds: request.service_types.map((st) => st.id),
      })
      .select([
        'user.id',
        'user.last_name',
        'user.first_name',
        'st.name',
        'user.email',
        'user.loc_state',
        'user.loc_city',
        'user.gender',
        'user.amount_per_hour',
        'st.id',
      ]);

    if (state) {
      queryBuilder.andWhere('user.loc_state = :state', { state: state });
    }

    if (city) {
      queryBuilder.andWhere('user.loc_city = :city', { city: city });
    }

    if (price_from) {
      queryBuilder.andWhere('user.amount_per_hour >= :price_from', {
        price_from: price_from,
      });
    }

    if (price_to) {
      queryBuilder.andWhere('user.amount_per_hour <= :price_to', {
        price_to: price_to,
      });
    }
    if (gender) {
      queryBuilder.andWhere('user.gender = :gender', { gender: gender });
    }

    // if (rating {
    //   queryBuilder.andWhere('sp.average_rating = :rating', { rating: rating });
    // }

    if (profile_pic) {
      queryBuilder.andWhere('user.photo_uri');
    }

    return await paginate<Partial<User>>(queryBuilder, { page, limit });
  }

  async getClientStats(user: User) {
    const validStatuses = Object.values(ServiceRequestStatus);
    const queryBuilder = this.serviceRequestRepository.createQueryBuilder('sr');
    const result = await queryBuilder
      .where('sr.created_by.id = :id', { id: user.id })
      .andWhere(`sr.status IN (:...statuses)`, { statuses: validStatuses })
      .groupBy('sr.status')
      .select('sr.status as status')
      .addSelect('COUNT(sr.id) as count')
      .getRawMany();
    // return validStatuses;
    const groupedRequests = {
      ...validStatuses.reduce((prev, item) => {
        return { ...prev, [item.toLowerCase()]: 0 };
      }, {}),
    };

    for (const item of result) {
      const status = item.status ? item.status.toLowerCase() : 'unknown';
      groupedRequests[status] = item.count || 10;
    }

    return groupedRequests;
  }

  async findServiceRequestsByUserAndStatus(
    user: User,
    query: ClientServiceRequestQueryDto,
  ): Promise<Pagination<ServiceRequest>> {
    const { status, page, limit } = query;
    const queryBuilder = this.serviceRequestRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.service_types', 'st')
      .leftJoin('sr.created_by', 'created_by')
      .where('created_by.id = :id', { id: user.id });
    if (status) {
      queryBuilder.andWhere('sr.status = :status', { status });
    }
    return await paginate<ServiceRequest>(queryBuilder, { page, limit });
  }
}
