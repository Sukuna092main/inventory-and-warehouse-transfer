# Kết nối Prisma với các bảng Auth hiện có

**Ngày:** 2026-09-23

**Trạng thái:** DONE — người dùng đã validate schema, generate client, build và đọc database Auth bằng Prisma thành công. Sau bước kết nối này, API và seed đã được chuyển sang Prisma.

## Phần đã đối chiếu

Đã đọc metadata PostgreSQL bằng truy vấn chỉ đọc và ánh xạ các bảng `users`, `user_permissions`, `user_audit_logs`, `auth_migrations`. Schema Prisma giữ tên cột/bảng, độ dài varchar, timestamptz(6), UUID, JSONB, nullable, tên khóa chính/khóa ngoại và các index DESC hiện có. FK giữ `ON UPDATE NO ACTION`, `ON DELETE RESTRICT`.

Role/status vẫn là varchar được CHECK tại PostgreSQL; không tự đổi sang enum database. UUID và `updated_at` vẫn do nghiệp vụ cập nhật, không thêm `@updatedAt` làm thay đổi hành vi. CHECK constraint và trigger audit hiện hữu chưa được chuyển sang migration Prisma; chúng vẫn nằm trong database và sẽ được đưa vào baseline SQL ở bước tiếp theo.

Ba gói được chốt cùng phiên bản 7.10.0 trong manifest/lockfile và đã duyệt build script. Lần thử đầu gặp thiếu dependency; người dùng cài lại theo lockfile thành công, không tải thêm gói mới. Thông báo có Prisma 8 release candidate là gợi ý cập nhật phiên bản, không ảnh hưởng kết quả của Prisma 7.10.0.

Đã kiểm tra riêng việc tạo URL kết nối giữ đúng mật khẩu có ký tự đặc biệt bằng dữ liệu giả; không in URL hoặc mật khẩu thật. Người dùng chạy `pnpm prisma:validate` và `pnpm prisma:check` thành công. Lệnh thứ hai generate Prisma Client 7.10.0, build rồi đọc `auth_db` bằng `auth_user`: 1 Admin ACTIVE, 1 audit seed, 0 quyền bổ sung và migration `CreateAuthTables1790035200000`. Chưa chạy migrate, db push, reset hoặc thay dữ liệu.

## Lệnh đã kiểm chứng

Người dùng đã chạy tại `services/auth-service`:

```powershell
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm prisma:validate
pnpm prisma:check
```

`prisma:validate` kiểm tra cú pháp schema. `prisma:check` tự sinh Prisma Client, build rồi chạy truy vấn trong transaction READ ONLY; không tạo/sửa bảng hoặc tài khoản. Kết quả đã xác nhận database `auth_db`, user `auth_user` và các số đếm ở trên. Không xuất password hash, token hoặc thông tin đăng nhập.

Không cần thêm DATABASE_URL vào .env: code dùng lại các biến DB_* đã có và mã hóa ký tự đặc biệt khi ghép URL cho CLI. JWT_SECRET không cần cho lệnh kiểm tra này.

## Vai trò từng file

Các đường dẫn tính từ thư mục Auth trừ dòng ghi rõ ở gốc repository.

| File | Vai trò |
|---|---|
| `prisma/schema.prisma` | Bản mô tả bảng/cột/quan hệ để Prisma sinh client có kiểu dữ liệu; chỉ khai báo, không tự thay database |
| `prisma.config.ts` | Cho Prisma CLI biết schema nằm đâu và lấy kết nối từ cấu hình DB_* local |
| `src/database/prisma/connection-options.ts` | Chuyển cấu hình đã kiểm tra thành tham số PostgreSQL adapter và URL cho CLI |
| `src/database/prisma/prisma-client.ts` | Tạo Prisma Client với adapter PostgreSQL; mặc định bỏ passwordHash khỏi kết quả User, tắt log query |
| `src/database/prisma/check-connection.ts` | Kết nối, đếm dữ liệu bằng Prisma trong transaction chỉ đọc rồi đóng kết nối |
| `src/generated/prisma/` | Client đã được sinh từ schema để code truy vấn database; không sửa tay hoặc commit thư mục này |
| `package.json` | Thêm lệnh validate/generate/check; build sinh client trước khi biên dịch NestJS; chốt ba gói Prisma 7.10.0 |
| `pnpm-lock.yaml` | Đồng bộ specifier chính xác; giữ nguyên các phiên bản dependency đã được giải quyết |
| `.gitignore` ở gốc repository | Bỏ qua Prisma Client tự sinh |
| `.oxlintrc.json`, `.prettierignore`, `jest.config.ts` | Bỏ qua mã Prisma tự sinh khi lint, format và đo coverage; tập trung kiểm tra mã của dự án |

Luồng kiểm tra: schema → generate client → đọc DB_* → PostgreSQL adapter → Prisma Client → transaction chỉ đọc → in kết quả đếm → ngắt kết nối.

Bước tiếp theo là chuyển truy vấn đăng nhập sang Prisma và kiểm tra lại hành vi. Seed và baseline migration được thực hiện ở các bước riêng để giữ nguyên database đã có dữ liệu.
