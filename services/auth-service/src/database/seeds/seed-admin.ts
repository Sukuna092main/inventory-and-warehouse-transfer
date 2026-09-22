import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readLocalEnvironment } from '../../config/local-environment';
import { validateEnvironment } from '../../config/environment';
import { authDatabaseOptions } from '../database-options';
import { createInitialAdmin } from './create-initial-admin';
import { readSeedAdminConfig, SeedAdminError } from './seed-admin-config';

async function main(): Promise<void> {
  let dataSource: DataSource | undefined;
  try {
    const env = readLocalEnvironment();
    readSeedAdminConfig(env); // Fail before connecting when seed inputs are missing.
    dataSource = new DataSource({
      ...authDatabaseOptions(validateEnvironment(env)),
      logging: false,
    });
    await dataSource.initialize();
    const result = await createInitialAdmin(dataSource.manager, env);
    console.log(
      result === 'created'
        ? 'Đã tạo Admin đầu tiên và audit. Dùng thông tin SEED_ADMIN_* trong .env để test đăng nhập khi API sẵn sàng.'
        : 'Đã có tài khoản ADMIN. Bỏ qua seed; không thay đổi mật khẩu, trạng thái hoặc tạo thêm audit.',
    );
  } catch (error) {
    // TypeORM errors may contain query parameters (including the password hash).
    console.error(
      error instanceof SeedAdminError
        ? error.message
        : 'Chưa xác nhận seed Admin thành công. Kiểm tra cấu hình database, PostgreSQL và migration rồi chạy lại seed.',
    );
    process.exitCode = 1;
  } finally {
    if (dataSource?.isInitialized) await dataSource.destroy();
  }
}

void main();
