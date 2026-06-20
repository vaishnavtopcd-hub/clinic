import { IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../common/pagination';

// Inherits page/limit/search (with validation) from PaginationQuery so report
// list endpoints paginate the same way as the rest of the API.
export class ReportRangeQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
