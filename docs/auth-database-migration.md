# Tạo ba bảng đầu tiên của Auth

**Ngày:** 2026-09-22

**Trạng thái:** Tài liệu lịch sử cho migration TypeORM đầu tiên đã chạy ngày 2026-09-22. Auth hiện dùng [baseline Prisma](./prisma-baseline.md); các lệnh và file TypeORM trong tài liệu này đã được thay thế. Bốn bảng, lịch sử `auth_migrations` và trigger audit vẫn được giữ trong database.

## Phần vừa thực hiện

Entity là lớp TypeScript ánh xạ dữ liệu trong bảng. Migration là một lần thay đổi cấu trúc database được lưu trong mã nguồn và có lịch sử thực thi. Thêm entity không tự tạo bảng vì dự án giữ `synchronize: false`.

| Bảng | Nội dung |
|---|---|
| `users` | Tài khoản, password hash, role, kho phụ trách, trạng thái |
| `user_permissions` | Quyền bổ sung, người cấp và thời điểm cấp |
| `user_audit_logs` | Người thực hiện, bản chụp trước/sau và thời điểm thay đổi tài khoản |
| `auth_migrations` | Bảng kỹ thuật do TypeORM tạo để ghi migration đã chạy |

Ba bảng nghiệp vụ có PRIMARY KEY, UNIQUE, CHECK và FK nội bộ theo [thiết kế Auth](./auth-database-design.md). UUID do backend sinh; `assigned_warehouse_id` là tham chiếu logic, không có FK liên database. Audit có trigger từ chối UPDATE, DELETE và TRUNCATE; chủ sở hữu database vẫn có thể thay đổi schema/trigger.

Chưa triển khai API hoặc bước tạo tài khoản thật. Việc chuẩn hóa đầu vào, kiểm tra email, kho đang hoạt động, quyền phù hợp role, actor đã xác thực, chọn đúng sáu trường trong bản chụp audit và cập nhật `updated_at` cùng transaction sẽ được thực hiện ở bước nghiệp vụ. Kiểu TypeScript không thay thế kiểm tra dữ liệu lúc chạy. `passwordHash` có `select: false` để tránh lấy trong truy vấn thông thường; API sau này vẫn phải dùng DTO chỉ chứa trường được phép trả về.

## Cách đã chạy trước đây

Người dùng đã chạy migration `CreateAuthTables1790035200000` bằng TypeORM CLI và xác nhận bảng kỹ thuật `auth_migrations` có bản ghi tương ứng. Những lệnh CLI đó đã được gỡ khỏi `package.json`. Trên database hiện có, Prisma baseline `0_auth_baseline` đã được đánh dấu applied; không chạy lại SQL tạo bảng. Với database Auth mới trong tương lai, dùng Prisma Migrate theo [hướng dẫn baseline](./prisma-baseline.md).

Trong pgAdmin, chọn `auth_db` → Schemas → public → Tables → Refresh. Bạn sẽ thấy bốn bảng trên. Có thể mở Query Tool của `auth_db` và chạy:

```sql
SELECT current_database(), current_user;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT id, name FROM public.auth_migrations ORDER BY id;
```

Phần hướng dẫn này ghi lại kết quả ban đầu. Auth hiện đã có Admin và API đăng nhập; xem [hướng dẫn seed](./seed-admin.md) và [API đăng nhập](./auth-login.md).

## File hiện hành cần đọc

- `services/auth-service/prisma/schema.prisma`: model Auth cho Prisma Client.
- `services/auth-service/prisma/migrations/0_auth_baseline/migration.sql`: SQL tạo bảng, index, ràng buộc và trigger trên database mới.
- `services/auth-service/prisma.config.ts`: cấu hình CLI Prisma Migrate và kết nối local.

Lịch sử migration TypeORM vẫn còn trong bảng `auth_migrations`; file TypeScript cũ đã được gỡ sau khi baseline Prisma được kiểm chứng. Các thay đổi schema sau này cần migration Prisma mới. Không dùng reset để xử lý database có dữ liệu.

## Kết quả kiểm tra

Ngày 2026-09-22: build, lint, unit test (1 ca), e2e GET `/` (1 ca) và kiểm tra database (39 ca) đều đạt. CLI DataSource đã build nạp được đúng ba entity và một migration.

`pnpm test:database` kiểm tra trực tiếp trên PostgreSQL bằng một schema có tên ngẫu nhiên trong một transaction chưa commit; mỗi ca dùng savepoint. Toàn bộ schema và dữ liệu thử được rollback khi kết thúc, không tạo bảng trong `public`. Trước khi người dùng chạy migration, đã xác nhận sau kiểm tra: `public` không có bảng và không còn schema thử nghiệm. Sau đó người dùng đã chạy migration thành công; bốn bảng trong `public` hiện là kết quả của bước chạy thủ công đó.

Các ca đã kiểm tra: UNIQUE kể cả tài khoản INACTIVE, role/status và kho bắt buộc, chuẩn hóa username/email tại DB, FK và quyền trùng, ánh xạ entity, ẩn password hash trong truy vấn mặc định, tổ hợp actor/action, SQL NULL khác JSON null, bảo vệ audit, rollback thay đổi tài khoản khi audit lỗi, migration chạy lại không lặp và down/up trong schema thử nghiệm. Đây là kiểm tra schema; kiểm thử API, phân quyền và thao tác đồng thời sẽ được bổ sung cùng chức năng tương ứng.

Tham khảo: [TypeORM Entity](https://typeorm.io/docs/entity/entities/).
