# Chạy và kiểm tra hệ thống local

## 1. Trạng thái triển khai

- Compose hiện chỉ chạy PostgreSQL. Auth, Gateway, web và Android chạy bằng công cụ phát triển trên máy.
- Auth đã có Prisma schema, migration, seed Admin, login và `/api/auth/me`.
- Product, Warehouse, Inventory và Transfer mới có thư mục giữ chỗ.
- Compose đầy đủ, RabbitMQ và APK release là các đầu ra còn phải triển khai.

Không coi `docker compose up -d` hiện tại là lệnh khởi động toàn bộ hệ thống. Tiến độ và bằng chứng kiểm thử nằm trong [kế hoạch](../plan.md).

## 2. Công cụ và dependency

Dùng Node.js 24 và pnpm. Phiên bản dependency nằm trong manifest và lockfile của từng thành phần. Hiện mỗi ứng dụng có lockfile riêng; chưa có cấu hình pnpm workspace ở gốc.

Khi chuẩn bị máy mới, chạy lệnh sau tại từng thư mục `services/auth-service`, `apps/api-gateway`, `apps/web`, `apps/mobile`:

```powershell
pnpm install --frozen-lockfile
```

Không cài đặt ở các service mới chỉ có README. Nếu gặp `ERR_PNPM_IGNORED_BUILDS`, xem package được báo, chạy `pnpm approve-builds`, chọn đúng dependency cần thiết rồi chạy lại lệnh cài. Không bật cho phép toàn bộ build script.

## 3. PostgreSQL và cấu hình Auth

Tại thư mục gốc, cấu hình `POSTGRES_PASSWORD` trong `.env` local rồi chạy:

```powershell
docker compose up -d postgres
docker compose ps
```

PostgreSQL công khai tại `127.0.0.1:5433`; cổng trong container là `5432`. Dữ liệu nằm trong volume `postgres_data`.

Trên máy mới, tạo PostgreSQL login `auth_user` và database `auth_db`, đặt `auth_user` làm owner. Tài khoản này không cần superuser. Compose hiện chưa tự tạo database/user của năm service. pgAdmin là công cụ quản trị PostgreSQL, không phải database riêng.

Cấu hình trong `services/auth-service/.env`:

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng Auth, mặc định `3000` |
| `DB_HOST` | `127.0.0.1` khi Auth chạy trên máy |
| `DB_PORT` | `5433` |
| `DB_NAME` | `auth_db` |
| `DB_USERNAME` | `auth_user` |
| `DB_PASSWORD` | Mật khẩu PostgreSQL của `auth_user` |
| `JWT_SECRET` | Khóa JWT dạng hex gồm 64 ký tự |

Prisma dùng các biến `DB_*`; không cần thêm `DATABASE_URL`. Adapter PostgreSQL có timeout kết nối 5 giây. HTTP server kiểm tra cấu hình khi khởi động; migration và seed không cần khóa JWT.

Khóa JWT, mật khẩu database và mật khẩu ứng dụng là ba thông tin khác nhau. Tạo khóa JWT mới nếu chưa có:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Chỉ lưu khóa trong cấu hình local. Thay khóa làm token ký bằng khóa cũ không còn hợp lệ. Khởi động lại tiến trình sau khi đổi biến môi trường. Không commit `.env` hoặc gửi mật khẩu/khóa vào hội thoại.

## 4. Prisma và migration

Chạy các lệnh dưới đây tại `services/auth-service`.

| File | Vai trò |
|---|---|
| `prisma/schema.prisma` | Model để sinh Prisma Client |
| `prisma/migrations/` | Lịch sử schema bằng SQL |
| `prisma.config.ts` | Cấu hình CLI, schema, migration và kết nối |
| `src/database/prisma/` | Tạo client, cấu hình kết nối và đóng kết nối |
| `src/generated/prisma/` | Client sinh tự động; không sửa tay hoặc commit |
| `scripts/verify-prisma-baseline.mjs` | Đối chiếu baseline trong schema tạm rồi rollback |

Prisma schema không biểu diễn đầy đủ CHECK constraint và trigger bảo vệ audit. Phải giữ chúng trong migration SQL. `auth_migrations` lưu lịch sử TypeORM cũ; Prisma quản lý lịch sử mới trong `_prisma_migrations`. Không xóa lịch sử cũ khi đổi ORM.

### Database mới, chưa có bảng

Sau khi kiểm tra đúng database đích:

```powershell
pnpm prisma:validate
pnpm migration:deploy
pnpm migration:status
pnpm prisma:check
```

`migration:deploy` áp dụng migration chưa chạy, bao gồm baseline trên database trống. `prisma:check` sinh client, build rồi đọc database trong transaction chỉ đọc; cần các bảng Auth đã tồn tại. Lệnh không in password hash, token hoặc chuỗi kết nối.

### Database local đã baseline

Database Auth hiện có đã ghi nhận `0_auth_baseline`. Không chạy lại lệnh đánh dấu baseline. Kiểm tra bằng:

```powershell
pnpm migration:status
pnpm prisma:check
```

Khi có migration mới đã được xem xét, dùng `pnpm migration:deploy` để áp dụng phần còn thiếu. Không sửa migration đã áp dụng. HTTP server không tự tạo bảng hoặc chạy migration.

### Database cũ có bảng nhưng chưa được Prisma quản lý

Đây là quy trình chuyển đổi, không phải bước khởi động thông thường:

1. Sao lưu và xác nhận đúng database.
2. Đối chiếu cấu trúc với baseline: bảng, cột/default, constraint, index, sequence, function và trigger.
3. Chỉ khi cấu trúc khớp và baseline chưa được ghi nhận, chạy:

```powershell
pnpm exec prisma migrate resolve --applied 0_auth_baseline --config prisma.config.ts
pnpm migration:status
```

`resolve --applied` chỉ ghi lịch sử, không tạo bảng. Không dùng trên database trống. Không dùng reset, xóa volume hoặc `db push` để chữa lỗi baseline trên database có dữ liệu.

Baseline giữ tên bảng/cột, UUID, timestamptz(6), JSONB, nullable, index và FK nội bộ. Role/status dùng varchar với CHECK. UUID và `updated_at` do nghiệp vụ cập nhật; không tự thêm `@updatedAt` hoặc đổi sang enum database để làm thay đổi hành vi.

## 5. Seed Admin

Cấu hình trong `services/auth-service/.env`:

```dotenv
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=
```

Điền mật khẩu riêng, dài 8–128 ký tự Unicode, không chỉ gồm khoảng trắng. Username/email được trim và chuyển chữ thường; mật khẩu giữ nguyên. Với ký tự `#` hoặc khoảng trắng đầu/cuối, đặt giá trị trong dấu nháy.

Chạy sau migration:

```powershell
pnpm seed:admin
```

Lệnh sinh client và build trước khi seed; nên dừng Auth đang chạy watch vì thư mục `dist` được build lại.

- Chưa có Admin: tạo `ADMIN`/`ACTIVE`, không gán kho, không có quyền bổ sung; ghi audit `SYSTEM / USER_CREATED` trong cùng transaction.
- Đã có bất kỳ Admin nào, kể cả INACTIVE: bỏ qua, không đổi mật khẩu/trạng thái hoặc thêm audit.
- Username/email đã thuộc tài khoản khác: từ chối, không tự nâng quyền.
- Hai tiến trình đồng thời được tuần tự hóa bằng khóa bảng `users` trong transaction; timeout khóa 5 giây.
- Audit thất bại thì tạo Admin cũng rollback. CLI không in SQL, tham số hay thông tin bí mật.

**Đổi `SEED_ADMIN_PASSWORD` rồi chạy lại không đổi mật khẩu Admin đã có.** Đây là bootstrap, không phải reset mật khẩu.

Seed và login dùng chung scrypt: salt ngẫu nhiên 16 byte, N=131072, r=8, p=1; so sánh bằng `timingSafeEqual`. Không trả password hash qua API hoặc ghi vào audit.

Vai trò mã nguồn: `src/database/seeds/seed-admin.ts` điều phối CLI; `seed-admin-config.ts` kiểm tra cấu hình; `create-initial-admin.ts` xử lý transaction; `src/auth/password.ts` băm và kiểm tra mật khẩu.

Trong pgAdmin, có thể kiểm tra mà không đọc password hash:

```sql
SELECT id, username, email, role, status
FROM public.users WHERE role = 'ADMIN';

SELECT user_id, actor_type, action, created_at
FROM public.user_audit_logs
WHERE actor_type = 'SYSTEM' AND action = 'USER_CREATED';
```

## 6. Khởi động ứng dụng

Mỗi ứng dụng chạy trong terminal riêng tại thư mục tương ứng:

| Thành phần | Thư mục | Lệnh |
|---|---|---|
| Auth | `services/auth-service` | `pnpm start:dev` |
| Gateway | `apps/api-gateway` | `pnpm start:dev` |
| Web | `apps/web` | `pnpm dev` |
| Android qua Expo | `apps/mobile` | `pnpm start` |

Gateway cần cấu hình local:

| Biến | Giá trị khi chạy trên máy |
|---|---|
| `PORT` | `8080` |
| `AUTH_SERVICE_URL` | `http://127.0.0.1:3000` |
| `WEB_ORIGIN` | `http://localhost:5173` |
| `JWT_SECRET` | Cùng khóa với Auth |

Web chạy cổng `5173`; Vite proxy `/api` tới Gateway `8080`.

Android dùng `EXPO_PUBLIC_API_BASE_URL` trong cấu hình local của mobile:

- Điện thoại thật: `http://<IP-LAN-máy-tính>:8080`.
- Android Studio Emulator mặc định: `http://10.0.2.2:8080`.

Không thêm `/api` vào base URL vì client đã thêm đường dẫn này. Cổng `8081` của Metro phục vụ Expo, không phải API.

Điện thoại và máy tính cần kết nối mạng phù hợp; firewall cho phép cổng Gateway trên mạng nội bộ. `localhost` trên điện thoại là điện thoại. APK không chứa mật khẩu database hoặc khóa JWT.

Khi chuyển sang Compose đầy đủ, dùng hostname/cổng nội bộ Docker; loopback trong một container không trỏ tới container khác. APK demo local cho phép HTTP nội bộ theo cấu hình riêng; APK bàn giao phải chạy khi Metro đã tắt.

## 7. Kiểm tra

### Auth

```powershell
pnpm prisma:validate
pnpm build
pnpm lint
pnpm test --runInBand
pnpm test:database
pnpm test:e2e --runInBand
```

Database test cần PostgreSQL thật, dùng schema riêng và rollback/dọn dữ liệu kiểm thử. Không thay bằng test trên database ứng dụng thật.

`pnpm prisma:verify-baseline` đối chiếu cấu trúc với baseline ban đầu trong schema tạm rồi rollback; không coi là phép so sánh bắt buộc sau mọi migration mới.

### Gateway

```powershell
pnpm test
```

Lệnh tự build, chạy HTTP test với Auth giả và khóa JWT riêng trong tiến trình test.

### Web

```powershell
pnpm build
pnpm lint
```

### Android

```powershell
pnpm exec tsc --noEmit
pnpm lint
```

Các lệnh này không thay thế kiểm thử trên điện thoại/APK. Ghi kết quả, ngày chạy và giới hạn trong [kế hoạch](../plan.md).

## 8. Tra lỗi thường gặp

| Hiện tượng | Kiểm tra |
|---|---|
| Auth không kết nối database | PostgreSQL, cổng `5433`, database/user và `DB_PASSWORD` |
| Auth/Gateway lỗi cấu hình JWT | Khóa hex 64 ký tự, cùng giá trị ở hai nơi |
| Gateway trả 503 | Auth đang chạy và `AUTH_SERVICE_URL` đúng |
| Android không kết nối Gateway | IP LAN, cổng `8080`, Wi-Fi và firewall |
| Response không phải JSON | Có gọi nhầm Metro/web thay vì Gateway không |
| Seed bỏ qua | Đã có Admin; đây là hành vi thiết kế |
| pnpm chặn build script | Duyệt đúng dependency được báo rồi cài lại |

Xem [API Guide](./api-guide.md) để gọi login và `/me`.
