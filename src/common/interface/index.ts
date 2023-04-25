import { Pagination, IPaginationMeta } from 'nestjs-typeorm-paginate';

export type PaginationResponse<T> = Promise<
  Pagination<Partial<T>, IPaginationMeta>
>;

export enum OrderBy {
  'DESC' = 'DESC',
  'ASC' = 'ASC',
}
