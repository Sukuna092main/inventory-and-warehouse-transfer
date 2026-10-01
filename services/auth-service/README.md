# Auth Service

Service NestJS quản lý tài khoản và đăng nhập của Inventory & Warehouse Transfer System. PostgreSQL được truy cập qua Prisma 7. Web và Android gọi login và `/me` qua Gateway.

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

## Chạy và kiểm tra

Xem [hướng dẫn local](../../docs/local-development.md) để cấu hình PostgreSQL/JWT, chạy migration, seed Admin và kiểm thử.

Hợp đồng tích hợp: [API Guide](../../docs/api-guide.md) và [OpenAPI Auth](../../docs/api/auth.openapi.json).

Auth hiện có seed Admin, login và `/me`. API quản trị người dùng/quyền chưa triển khai. Tiến độ và kết quả kiểm thử nằm trong [kế hoạch](../../plan.md).
