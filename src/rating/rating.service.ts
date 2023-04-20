import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ResponseMessage } from 'src/common/interface/success-message.interface';
import { CatchErrorException } from 'src/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Rating } from 'src/entities/rating.entity';
import { Repository } from 'typeorm';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { Reviewer } from './rating.interface';
import { User } from 'src/entities/user.entity';
import { GetRatingQueryDto } from './dto/get-rating-query.dto';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationResponse } from 'src/common/interface';
import { ProposalService } from 'src/proposal/proposal.service';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating) private readonly ratingRepo: Repository<Rating>,
    private readonly proposalService: ProposalService,
  ) {}
  async createRating(currentUser: User, createRatingDto: CreateRatingDto) {
    try {
      const {
        service_provider_id,
        service_request_id,
        star,
        review,
        reviewer,
      } = createRatingDto;

      const proposal = await this.proposalService.getProposalBySRSP(
        service_request_id,
        service_provider_id,
      );
      const existingRating = await this.ratingRepo
        .createQueryBuilder('rating')
        .leftJoinAndSelect('rating.created_by', 'user')
        .leftJoinAndSelect('rating.proposal', 'proposal')
        .where('proposal.id = :proposalId', {
          proposalId: proposal.id,
        })
        .getMany();
      if (existingRating.some((r) => r.reviewer === reviewer)) {
        throw new HttpException(
          'Rating already exist for reviewer',
          HttpStatus.CONFLICT,
        );
      }
      if (!proposal) {
        throw new NotFoundException('Service request not found');
      }
      if (proposal.status !== ServiceRequestStatus.COMPLETED) {
        throw new HttpException(
          'You can only rating a completed service',
          HttpStatus.CONFLICT,
        );
      }
      if (
        reviewer === Reviewer.SERVICE_PROVIDER &&
        proposal.service_provider.id !== currentUser.id
      ) {
        throw new HttpException(
          'You are not the service provider',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        reviewer === Reviewer.CLIENT &&
        proposal.service_request.created_by.id == currentUser.id
      ) {
        throw new HttpException(
          'You are not the service provider',
          HttpStatus.BAD_REQUEST,
        );
      }
      const rating = await this.ratingRepo.create({
        proposal,
        star,
        review,
        reviewer,
        created_by:
          reviewer === Reviewer.CLIENT
            ? proposal.service_request.created_by
            : proposal.service_provider,
      });

      await this.ratingRepo.save(rating);
      return new ResponseMessage('Service provider successfully reviewed');
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getRating(
    currentUser: User,
    getRatingQueryDto: GetRatingQueryDto,
  ): PaginationResponse<Rating> {
    try {
      const { limit, page, reviewer } = getRatingQueryDto;
      const qb = await this.ratingRepo
        .createQueryBuilder('rating')
        .leftJoin('rating.created_by', 'user')
        .where('user.id = :id AND rating.reviewer = :reviewer', {
          id: currentUser.id,
          reviewer,
        })
        .select([
          'rating.id',
          'rating.review',
          'rating.star',
          'rating.created_at',
        ]);
      return paginate(qb, { limit, page });
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
}
