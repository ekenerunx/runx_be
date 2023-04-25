import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagination, paginate } from 'nestjs-typeorm-paginate';
import { Proposal } from 'src/entities/proposal.entity';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { SPJobQueryDto } from 'src/service-request/dto/sp-job.query.dto';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { Repository } from 'typeorm';
import { stripJob } from './service-provider.util';

@Injectable()
export class ServiceProviderService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
  ) {}
  async getJobs(user: User, query: SPJobQueryDto): Promise<Pagination<any>> {
    const { status, page, limit, start_date, end_date, date, service_type } =
      query;
    const qb = await this.proposalRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.service_request', 'sr')
      .leftJoinAndSelect('p.service_provider', 'sp')
      .leftJoinAndSelect('sr.service_types', 'st')
      .leftJoinAndSelect('sr.created_by', 'client')
      .where('sp.id = :id', { id: user.id });
    if (status) {
      qb.andWhere('p.status = :status', { status });
    }
    if (service_type) {
      qb.andWhere(`st.id = :serviceTypeId`, { serviceTypeId: service_type });
    }

    if (start_date && end_date) {
      qb.andWhere(`sr.start_date BETWEEN :startDate AND :endDate`, {
        start_date,
        end_date,
      });
    } else if (date) {
      qb.andWhere(`DATE(sr.start_date) = :date`, { date });
    }
    const res = await paginate<Proposal>(qb, {
      page,
      limit,
    });
    return {
      ...res,
      items: res.items.map((p) => ({
        id: p.id,
        service_request_id: p.service_request.id,
        amount: p.proposal_amount,
        description: p.service_request.description,
        start_add: p.service_request.start_add,
        start_date: p.service_request.start_date,
        status: p.status,
        created_at: p.created_at,
        service_request_types: p.service_request.service_types.map((i) => ({
          name: i.name,
          id: i.id,
        })),
        created_by: {
          first_name: p.service_request.created_by.first_name,
          last_name: p.service_request.created_by.last_name,
          id: p.service_request.created_by.id,
        },
      })),
    };
  }

  async getStats(user: User) {
    try {
      const validStatuses = Object.values(ServiceRequestStatus);
      const queryBuilder = this.proposalRepo.createQueryBuilder('p');
      const result = await queryBuilder
        .leftJoin('p.service_provider', 'sp')
        .leftJoin('p.service_request', 'sr')
        .where('sp.id = :id', { id: user.id })
        .andWhere(`p.status IN (:...statuses)`, { statuses: validStatuses })
        .groupBy('p.status')
        .select('p.status as status')
        .addSelect('COUNT(sr.id) as count')
        .getRawMany();

      // return result;
      const groupedRequests = {
        completed: 0,
        inProgress: 0,
        declined: 0,
        pending: 0,
      };
      // return groupedRequests;

      for (const item of result) {
        const status = item.status.toLowerCase();
        groupedRequests[status] = item.count;
      }

      return groupedRequests;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
  async jobOverview(currentUser: User) {
    try {
      const queryBuilder = this.proposalRepo.createQueryBuilder('p');
      const qb = await queryBuilder
        .leftJoinAndSelect('p.service_provider', 'sp')
        .leftJoinAndSelect('p.service_request', 'sr')
        .leftJoinAndSelect('sr.created_by', 'created_by')
        .where('sp.id = :id', { id: currentUser.id });

      const inProgress = await qb
        .andWhere(`p.status = :status`, {
          status: ServiceRequestStatus.IN_PROGRESS,
        })
        .getManyAndCount();
      const pending = await qb
        .andWhere(`p.status = :status`, {
          status: ServiceRequestStatus.PENDING,
        })
        .getManyAndCount();
      const invited = await qb
        .andWhere(`p.status = :status`, {
          status: ServiceRequestStatus.INVITED,
        })
        .getManyAndCount();

      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const todaySchedule = await qb
        .where(`p.proposal_date BETWEEN :start AND :end`, {
          start: todayStart,
          end: todayEnd,
        })
        .getManyAndCount();

      return {
        todaySchedule: {
          count: todaySchedule[1],
          data: todaySchedule[0]?.map((i) => stripJob(i)) || [],
        },
        inProgress: {
          count: inProgress[1],
          data: inProgress[0]?.map((i) => stripJob(i)) || [],
        },
        invited: {
          count: invited[1],
          data: invited[0]?.map((i) => stripJob(i)) || [],
        },
        pending: {
          count: pending[1],
          data: pending[0]?.map((i) => stripJob(i)) || [],
        },
      };
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
}
