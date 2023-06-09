import { CatchErrorException } from 'src/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from 'src/entities/notification.entity';
import { User } from 'src/entities/user.entity';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { NOTIFICATION_LIST_FIELDS } from './notification.constant';
import { MarkNotificationDto } from './dto/mark-notification.dto';
import { ResponseMessage } from 'src/common/interface/success-message.interface';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async sendNotification(notification: Partial<Notification>) {
    try {
      const __note = this.notificationRepository.create(notification);
      await this.notificationRepository.save(__note);
      return;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async sendNotifications(notifications: Partial<Notification>[]) {
    try {
      // const notes = notifications.map((notification) => {
      //   const note = new Notification();
      //   note.message = notification.message;
      //   note.subject = notification.subject;
      //   return note;
      // });
      // await this.notificationRepository.save(notes);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async markNotification(
    owner: User,
    markNotificationDto: MarkNotificationDto,
  ) {
    try {
      const { is_read, ids } = markNotificationDto;
      await this.notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ is_read })
        .whereInIds(ids)
        .where('owner.id = :id', { id: owner.id })
        .execute();
      return new ResponseMessage(
        `Notification marked as ${is_read ? 'read' : 'not read'}`,
      );
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getNotifications(
    owner: User,
    notificationQueryDto: PaginationQueryDto,
  ) {
    try {
      const { page, limit } = notificationQueryDto;
      const queryBuilder = await this.notificationRepository
        .createQueryBuilder('not')
        .leftJoinAndSelect('not.client', 'client')
        .leftJoinAndSelect('not.service_request', 'sr')
        .leftJoinAndSelect('not.service_provider', 'sp')
        .leftJoinAndSelect('not.owner', 'owner')
        .where('owner.id = :id', { id: owner.id })
        .select(NOTIFICATION_LIST_FIELDS);

      return await paginate<Partial<Notification>>(queryBuilder, {
        page,
        limit,
      });
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
}
