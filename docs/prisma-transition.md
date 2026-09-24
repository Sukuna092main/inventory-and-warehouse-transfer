# Chuyển Auth từ TypeORM sang Prisma

**Ngày:** 2026-09-23

**Trạng thái:** DONE. Kết nối, API đăng nhập, seed Admin, [baseline migration](./prisma-baseline.md) và test setup đã chuyển sang Prisma/baseline SQL. Source, manifest và lockfile không còn TypeORM; build, lint và các bộ test đạt sau khi gỡ dependency.

## Lựa chọn và bước hiện tại

Dùng Prisma ORM 7 cho PostgreSQL local. Prisma 7 vẫn được hỗ trợ; Prisma 8 hiện là release candidate và thay đổi API/CLI, nên chỉ định major 7 khi cài. Xem [trạng thái phát hành chính thức](https://www.prisma.io/docs/orm/release-status) và [yêu cầu hệ thống Prisma 7](https://www.prisma.io/docs/orm/v7/reference/system-requirements).

Tại `services/auth-service`, người dùng đã cài các gói Prisma và xác nhận bản 7.10.0. Các lệnh cài ban đầu là:

```powershell
pnpm add --save-exact --strict-peer-dependencies @prisma/client@7 @prisma/adapter-pg@7
pnpm add -D --save-exact --strict-peer-dependencies prisma@7
```

`@prisma/client` cung cấp phần runtime để truy vấn; `@prisma/adapter-pg` nối Prisma với driver PostgreSQL `pg` đã có; `prisma` là CLI dùng để kiểm tra schema, sinh client và quản lý migration. `--save-exact` lưu phiên bản cụ thể được chọn vào manifest và lockfile. Người dùng đã cài lại theo lockfile và kiểm tra kết nối thành công.

Không chạy lệnh init, db push, migrate dev hoặc reset lên `auth_db`. Mã chạy và test đã bỏ TypeORM; hai dependency cũ đã được người dùng gỡ thủ công.

## Phạm vi chuyển đổi từng bước

| Phần hiện có | Cách chuyển dự kiến |
|---|---|
| Ba entity users, user_permissions, user_audit_logs | Khai báo model trong `schema.prisma`, ánh xạ đúng tên cột/bảng, UUID, timestamptz, JSON, nullability, FK và index đang có |
| TypeOrmModule, DataSource | Server dùng AuthPrismaService với PostgreSQL adapter; mã DataSource TypeORM cũ đã được xóa |
| Truy vấn trong auth.service.ts | Prisma Client với `select` rõ các trường; response đăng nhập không đổi |
| create-initial-admin.ts | Prisma transaction, giữ khóa chống seed đồng thời, tạo user và audit nguyên tử |
| Migration TypeScript hiện tại | Baseline SQL lưu cấu trúc hiện có, gồm CHECK, index DESC, function và trigger audit |
| Các test từng dùng TypeORM | Setup dùng baseline SQL và `pg`; truy vấn ứng dụng dùng Prisma, giữ kiểm tra rollback, seed đồng thời, mật khẩu và JWT |
| Script migration, seed và tài liệu | Cập nhật lệnh sau khi có cấu hình đã kiểm tra; giải thích vai trò từng file |

Controller/DTO đăng nhập, hợp đồng HTTP, hàm băm scrypt và cấu hình JWT giữ nguyên hành vi. Không mở rộng sang service khác trong lần chuyển Auth.

## Giữ dữ liệu và lịch sử migration

- Dùng database hiện có; giữ tài khoản Admin, password hash và audit. Không đổi mật khẩu hoặc seed lại để thay thế dữ liệu khi chuyển ORM.
- Đối chiếu cấu trúc thật trước khi ghi nhận baseline. Với database đã có bảng, baseline được đánh dấu đã áp dụng; không chạy lại SQL CREATE TABLE lên các bảng đang tồn tại. Với database mới, chính baseline đó phải tạo đủ cấu trúc.
- Các CHECK constraint và trigger không được bỏ sót khi xây schema/migration. Prisma schema không thay thế toàn bộ SQL tùy chỉnh; giữ chúng trong migration SQL và kiểm tra trên PostgreSQL thật.
- Bảng `auth_migrations` hiện tại là lịch sử của TypeORM; giữ lại và xử lý rõ trong baseline để Prisma không đề nghị xóa do khác biệt schema. Lịch sử mới sẽ do Prisma Migrate quản lý.
- Chỉ hướng dẫn gỡ dependency TypeORM sau khi runtime, seed, migration và test đã chuyển xong. Các mốc DONE trước đó vẫn phản ánh kết quả của bản TypeORM; chuyển đổi có checklist riêng.

Tham khảo quy trình [baseline database đã có dữ liệu](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining). Lệnh cụ thể sẽ được viết theo phiên bản Prisma 7 đã cài và cấu trúc đã đối chiếu, không yêu cầu người dùng tự suy ra lệnh migration lúc này.

## Điều kiện hoàn thành

- [x] Dependency Prisma đầy đủ; schema validate, generate client, build và truy vấn chỉ đọc trên `auth_db` đều đạt với Prisma 7.10.0.
- [x] Schema và baseline SQL khớp database hiện có; đã so sánh cột/default, constraint, index, sequence, function và trigger trong schema test riêng.
- [x] Login dùng Prisma; 22 ca HTTP trên PostgreSQL thật xác nhận hợp đồng, lỗi an toàn và JWT không chứa password hash.
- [x] Seed dùng Prisma; 8 ca PostgreSQL riêng xác nhận tạo mới, chạy lại không đổi Admin, audit lỗi thì rollback và chạy đồng thời chỉ tạo một Admin.
- [x] Test trên database/schema riêng đạt: 26 unit, 68 database và 1 e2e; không còn import TypeORM trong mã chạy và test hiện hành.
- [x] Người dùng ghi nhận baseline cho database local; truy vấn chỉ đọc xác nhận `0_auth_baseline` đã applied.
- [x] Người dùng đã gỡ `@nestjs/typeorm` và `typeorm` bằng pnpm; manifest/lockfile không còn hai package. Sau đó `pnpm build`, `pnpm lint`, 26 unit, 68 database và 1 e2e đều đạt.

Lệnh người dùng đã chạy tại `services/auth-service`:

```powershell
pnpm remove @nestjs/typeorm typeorm --strict-peer-dependencies
```

Lệnh này chỉ gỡ hai dependency cũ và cập nhật `package.json`/`pnpm-lock.yaml`; không cần chạy lại.

File này theo dõi riêng quá trình đổi ORM; `plan.md` vẫn là kế hoạch và tiến độ toàn dự án.
