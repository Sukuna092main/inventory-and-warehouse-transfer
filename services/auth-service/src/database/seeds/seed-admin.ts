import { readLocalEnvironment } from '../../config/local-environment';
import { validateEnvironment } from '../../config/environment';
import { createAuthPrisma } from '../prisma/prisma-client';
import { createInitialAdmin } from './create-initial-admin';
import { readSeedAdminConfig, SeedAdminError } from './seed-admin-config';

async function main(): Promise<void> {
  let prisma: ReturnType<typeof createAuthPrisma> | undefined;
  try {
    const env = readLocalEnvironment();
    readSeedAdminConfig(env); // Fail before connecting when seed inputs are missing.
    prisma = createAuthPrisma(validateEnvironment(env));
    await prisma.$connect();
    const result = await createInitialAdmin(prisma, env);
    console.log(
      result === 'created'
        ? 'Đã tạo Admin đầu tiên và audit. Dùng thông tin SEED_ADMIN_* trong .env để test đăng nhập khi API sẵn sàng.'
        : 'Đã có tài khoản ADMIN. Bỏ qua seed; không thay đổi mật khẩu, trạng thái hoặc tạo thêm audit.',
    );
  } catch (error) {
    // Prisma errors may contain query parameters (including the password hash).
    console.error(
      error instanceof SeedAdminError
        ? error.message
        : 'Chưa xác nhận seed Admin thành công. Kiểm tra cấu hình database, PostgreSQL và migration rồi chạy lại seed.',
    );
    process.exitCode = 1;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

void main();
