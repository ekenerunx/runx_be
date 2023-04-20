import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagination, paginate } from 'nestjs-typeorm-paginate';
import { ServiceRequestProposal } from 'src/entities/service-request-proposal.entity';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { SPJobQueryDto } from 'src/service-requests/dto/sp-job.query.dto';
import { ServiceRequestStatus } from 'src/service-requests/interfaces/service-requests.interface';
import { Repository } from 'typeorm';

@Injectable()
export class ServiceProviderService {
  constructor(
    @InjectRepository(ServiceRequestProposal)
    private readonly proposalRepo: Repository<ServiceRequestProposal>,
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
    const res = await paginate<ServiceRequestProposal>(qb, {
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
    const overview = {
      today: {
        data: [],
        count: 0,
      },
    };
    return overview;
  }
}
