import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Standard query params for paginated list endpoints. */
export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  search?: string;

  /** Inclusive date-range filter (YYYY-MM-DD). Applied per-list to its date column. */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

/**
 * Apply an inclusive date-range filter to a query builder on the given column.
 * `dateTo` covers the whole day. No-op when neither bound is provided.
 */
export function applyDateRange<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  from?: string,
  to?: string,
): SelectQueryBuilder<T> {
  if (from) qb.andWhere(`${column} >= :_df`, { _df: from });
  if (to) qb.andWhere(`${column} <= :_dt`, { _dt: `${to} 23:59:59` });
  return qb;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
