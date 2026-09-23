import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier: string;

  // Never trim or lowercase passwords.
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
