# Tạo ba bảng đầu tiên của Auth

**Ngày:** 2026-09-22

**Trạng thái:** Hoàn thành. Người dùng đã chạy migration; kiểm tra chỉ đọc ngày 2026-09-22 xác nhận đủ bốn bảng trong `auth_db.public`, bản ghi `CreateAuthTables1790035200000` và trigger `trg_user_audit_append_only` đang bật.

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

## Bạn thực hiện thủ công

Giữ PostgreSQL đang chạy và dùng `.env` đã cấu hình trong Auth. Không cần cài thêm dependency. Mở terminal tại `services/auth-service`; nếu đang chạy `pnpm start:dev` trong terminal đó, dừng bằng Ctrl+C trước khi chạy lệnh dưới đây.

```powershell
pnpm migration:run
pnpm migration:show
```

Mỗi lệnh tự build trước khi dùng TypeORM CLI. `migration:run` tạo bảng bằng migration `CreateAuthTables1790035200000`, trong transaction. Khi thành công, `migration:show` đánh dấu `[X]` cho migration đó. Chạy lại `migration:run` sẽ bỏ qua migration đã ghi nhận, không tạo bảng trùng hoặc reset dữ liệu.

Lưu ý: bản TypeORM đang dùng có thể tạo bảng kỹ thuật `auth_migrations` ngay cả khi chỉ chạy `migration:show`; lệnh này không tạo ba bảng nghiệp vụ.

Trong pgAdmin, chọn `auth_db` → Schemas → public → Tables → Refresh. Bạn sẽ thấy bốn bảng trên. Có thể mở Query Tool của `auth_db` và chạy:

```sql
SELECT current_database(), current_user;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT id, name FROM public.auth_migrations ORDER BY id;
```

Sau khi kiểm tra xong, chạy lại `pnpm start:dev` nếu đã dừng service. Bước này chưa tạo tài khoản Admin hoặc chức năng đăng nhập.

## File cần đọc

- `services/auth-service/src/users/entities/`: ba entity và kiểu dữ liệu Auth.
- `services/auth-service/src/database/database-options.ts`: cấu hình database dùng chung cho NestJS và CLI.
- `services/auth-service/src/database/data-source.ts`: nạp `.env` cho CLI.
- `services/auth-service/src/database/migrations/1790035200000-CreateAuthTables.ts`: SQL tạo bảng, index, ràng buộc và trigger.

Migration đã chạy phải được giữ nguyên; các thay đổi sau đó cần migration mới. Có lệnh `pnpm migration:revert` để quay lại migration trước, nhưng `down` của migration đầu tiên **xóa ba bảng và dữ liệu trong đó**. Không dùng lệnh này trong quy trình chạy thường ngày hoặc trên dữ liệu cần giữ.

## Kết quả kiểm tra

Ngày 2026-09-22: build, lint, unit test (1 ca), e2e GET `/` (1 ca) và kiểm tra database (39 ca) đều đạt. CLI DataSource đã build nạp được đúng ba entity và một migration.

`pnpm test:database` kiểm tra trực tiếp trên PostgreSQL bằng một schema có tên ngẫu nhiên trong một transaction chưa commit; mỗi ca dùng savepoint. Toàn bộ schema và dữ liệu thử được rollback khi kết thúc, không tạo bảng trong `public`. Trước khi người dùng chạy migration, đã xác nhận sau kiểm tra: `public` không có bảng và không còn schema thử nghiệm. Sau đó người dùng đã chạy migration thành công; bốn bảng trong `public` hiện là kết quả của bước chạy thủ công đó.

Các ca đã kiểm tra: UNIQUE kể cả tài khoản INACTIVE, role/status và kho bắt buộc, chuẩn hóa username/email tại DB, FK và quyền trùng, ánh xạ entity, ẩn password hash trong truy vấn mặc định, tổ hợp actor/action, SQL NULL khác JSON null, bảo vệ audit, rollback thay đổi tài khoản khi audit lỗi, migration chạy lại không lặp và down/up trong schema thử nghiệm. Đây là kiểm tra schema; kiểm thử API, phân quyền và thao tác đồng thời sẽ được bổ sung cùng chức năng tương ứng.

Tham khảo: [TypeORM Entity](https://typeorm.io/docs/entity/entities/).
