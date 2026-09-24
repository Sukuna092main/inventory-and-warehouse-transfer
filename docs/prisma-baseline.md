# Baseline migration Prisma cho Auth

**Ngày:** 2026-09-23

**Trạng thái:** DONE — file migration đã kiểm tra trên schema PostgreSQL tạm. Người dùng đã ghi nhận `0_auth_baseline`; truy vấn chỉ đọc ngày 2026-09-24 xác nhận dòng migration `applied=true`, `rolled_back=false` trong `auth_db.public._prisma_migrations`.

## Baseline là gì?

`auth_db.public` đã có bốn bảng và tài khoản Admin từ migration TypeORM. Baseline ghi toàn bộ cấu trúc đó thành migration đầu tiên của Prisma. Với database mới, Prisma sẽ chạy SQL để tạo bảng. Với database hiện có, Prisma chỉ cần ghi nhận migration này **đã áp dụng**; chạy lại SQL tạo bảng sẽ báo trùng và có thể làm gián đoạn việc chuyển đổi. Quy trình này theo [hướng dẫn baselining của Prisma](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).

File SQL gồm `users`, `user_permissions`, `user_audit_logs`, bảng lịch sử TypeORM `auth_migrations` và sequence ID của bảng đó. Nó giữ nguyên tên khóa, index, kiểu dữ liệu, giá trị mặc định, CHECK constraint, FK cùng function/trigger chặn sửa audit. Prisma schema không biểu diễn đủ các thành phần SQL này, nên phải giữ chúng trong migration; xem [hướng dẫn của Prisma về thành phần không được hỗ trợ](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features).

## Kết quả kiểm tra

Đã chạy `node scripts/verify-prisma-baseline.mjs` tại `services/auth-service`. Script bắt đầu transaction, tạo schema có tên ngẫu nhiên, áp dụng baseline tại đó và so sánh catalog với `public`: bốn bảng, từng cột/default, constraint, index, sequence, function và trigger đều khớp. Nó còn xác nhận CHECK role từ chối giá trị sai và trigger audit từ chối UPDATE. Cuối cùng toàn bộ transaction được rollback, nên không để lại schema test và không ghi vào `public`.

Prisma CLI trong môi trường trợ lý báo `spawn EPERM` khi yêu cầu engine tạo SQL. Vì vậy SQL được dựng từ migration TypeORM đã áp dụng rồi kiểm chứng bằng PostgreSQL thật. Người dùng đã chạy `prisma migrate resolve --applied 0_auth_baseline`; không chạy `migrate deploy`, `migrate dev`, `db push` hoặc `reset` trên database hiện có.

## Cách đã ghi nhận trên database local có Admin

Tại `services/auth-service`, người dùng đã xác nhận kết nối tới `auth_db` bằng lệnh:

```powershell
pnpm prisma:check
```

Sau khi kết quả là database `auth_db`, user `auth_user` và Admin hiện có, đã chạy **một lần**:

```powershell
pnpm exec prisma migrate resolve --applied 0_auth_baseline --config prisma.config.ts
pnpm exec prisma migrate status --config prisma.config.ts
```

`resolve --applied` tạo/cập nhật bảng lịch sử `_prisma_migrations` và đánh dấu baseline đã chạy; nó không thực thi `migration.sql` lên các bảng hiện có. Truy vấn chỉ đọc đã xác nhận dòng migration được đánh dấu applied. Không lặp lại lệnh resolve trên database này; không dùng `migrate deploy`, `migrate dev`, `db push` hoặc `reset` để xử lý lỗi baseline.

Việc ghi nhận này không đổi Admin, password hash, audit hay lịch sử `auth_migrations`. Với một database Auth trống trong tương lai, dùng Prisma Migrate để áp dụng migration thay vì `resolve --applied`, vì database mới thực sự cần các bảng được tạo.

## Vai trò từng file

Các đường dẫn sau tính từ `services/auth-service`, trừ file kế hoạch ở gốc repository.

| File | Vai trò |
|---|---|
| `prisma/migrations/0_auth_baseline/migration.sql` | Dựng đầy đủ cấu trúc Auth từ database trống; giữ CHECK và trigger không thể khai báo hết trong Prisma schema |
| `prisma/migrations/migration_lock.toml` | Ghi provider PostgreSQL cho lịch sử Prisma Migrate |
| `prisma.config.ts` | Chỉ rõ thư mục chứa các migration và datasource dùng DB_* local |
| `scripts/verify-prisma-baseline.mjs` | So sánh migration với cấu trúc `public` trong schema tạm rồi rollback; không in dữ liệu tài khoản |
| `package.json` | Thêm lệnh `pnpm prisma:verify-baseline` để chạy kiểm tra lặp lại |
| `plan.md` ở gốc | Theo dõi trạng thái bước chuyển ORM và phần còn chờ người dùng chạy |

Test setup đã chuyển sang baseline SQL, các file TypeORM cũ trong source đã được dọn và dependency TypeORM đã được gỡ khỏi `package.json`/lockfile. Bảng `auth_migrations` trong database được giữ để bảo toàn lịch sử cũ.
