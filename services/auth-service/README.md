# Auth Service

Service NestJS quản lý tài khoản và đăng nhập của Inventory & Warehouse Transfer System. PostgreSQL được truy cập qua Prisma 7. Giao diện web và Android sẽ gọi API này qua Gateway khi Gateway được triển khai.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `src/auth/` | API đăng nhập, kiểm tra mật khẩu, ký JWT và xác thực `/api/auth/me` |
| `src/auth/current-user.guard.ts` | Xác minh JWT rồi đọc lại trạng thái, role, kho và quyền hiện hành từ PostgreSQL cho request được bảo vệ |
| `src/database/prisma/` | Tạo và đóng Prisma Client, cấu hình PostgreSQL adapter |
| `src/database/seeds/` | Seed Admin đầu tiên, không sửa Admin đã có |
| `src/users/user.types.ts` | Kiểu role, trạng thái, quyền và bản chụp audit dùng cho nghiệp vụ Auth |
| `prisma/schema.prisma` | Model dùng để sinh Prisma Client |
| `prisma/migrations/` | Migration SQL do Prisma Migrate quản lý, gồm baseline Auth |
| `test/postgres-test.ts` | Dựng/dọn schema PostgreSQL riêng cho test từ baseline SQL |

Không còn mã TypeORM trong `src/` hoặc `test/`. Bảng `auth_migrations` trong database là lịch sử đã có từ trước và được baseline Prisma giữ lại.

## Chạy local

PostgreSQL chạy theo `compose.yaml` ở thư mục gốc. Tạo `services/auth-service/.env` dựa trên `.env.example` và điền thông tin local; không commit file `.env` hoặc gửi mật khẩu/khóa JWT. Xem [hướng dẫn kết nối](../../docs/auth-database-connection.md), [seed Admin](../../docs/seed-admin.md), [API đăng nhập](../../docs/auth-login.md) và [API tài khoản hiện hành](../../docs/auth-me.md).

Tại thư mục `services/auth-service`:

```powershell
pnpm start:dev
```

Các lệnh kiểm tra:

```powershell
pnpm prisma:validate
pnpm prisma:check
pnpm prisma:verify-baseline
pnpm migration:status
pnpm test --runInBand
pnpm test:database
pnpm test:e2e --runInBand
```

`pnpm migration:deploy` dành cho database mới hoặc migration tiếp theo sau baseline; không dùng nó để ghi nhận baseline trên database đã có bảng. Baseline `0_auth_baseline` đã được đánh dấu applied trên `auth_db` local. Xem [quy trình baseline](../../docs/prisma-baseline.md) và [trạng thái chuyển ORM](../../docs/prisma-transition.md).
