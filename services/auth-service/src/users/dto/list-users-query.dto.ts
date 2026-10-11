import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { UserRole, UserStatus } from '../user.types';

function toQueryInteger(value: unknown): unknown {
  // Chỉ chuyển chuỗi chứa chữ số; không chấp nhận chuỗi rỗng,
  // số thập phân, ký hiệu khoa học hoặc mảng query bị lặp.
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    return value;
  }

  return Number(value);
}

export class ListUsersQueryDto {
  @Transform(({ value }: { value: unknown }) => toQueryInteger(value))
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(0, { message: 'page phải từ 0 trở lên.' })
  @Max(Number.MAX_SAFE_INTEGER, {
    message: 'page vượt giới hạn số nguyên an toàn.',
  })
  page: number = 0;

  @Transform(({ value }: { value: unknown }) => toQueryInteger(value))
  @IsInt({ message: 'size phải là số nguyên.' })
  @Min(1, { message: 'size phải từ 1 trở lên.' })
  @Max(100, { message: 'size không được vượt quá 100.' })
  size: number = 20;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search phải là chuỗi.' })
  @MaxLength(254, {
    message: 'search không được vượt quá 254 ký tự.',
  })
  search?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'], {
    message: 'role không hợp lệ.',
  })
  role?: UserRole;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], {
    message: 'status phải là ACTIVE hoặc INACTIVE.',
  })
  status?: UserStatus;
}
