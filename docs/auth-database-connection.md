# Kết nối Auth Service với PostgreSQL local

**Ngày:** 2026-09-22  
**Phạm vi:** ghi lại bước kết nối database ban đầu. Auth hiện dùng Prisma; xem [bước chuyển ORM](./prisma-transition.md). Khi chạy HTTP server cần thêm JWT_SECRET theo [hướng dẫn đăng nhập](./auth-login.md).

## Cấu hình

Auth đọc file `services/auth-service/.env`. File này được Git bỏ qua; `.env.example` trong cùng thư mục chỉ chứa giá trị mẫu. Giữ mật khẩu thật trong `.env` của máy bạn.

| Biến | Giá trị local |
|---|---|
| `PORT` | `3000` (mặc định nếu không khai báo) |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `5433` |
| `DB_NAME` | `auth_db` |
| `DB_USERNAME` | `auth_user` |
| `DB_PASSWORD` | Mật khẩu của `auth_user` do bạn quản lý |

Service kiểm tra biến bắt buộc và cổng từ 1 đến 65535 khi khởi động. Lỗi cấu hình chỉ nêu tên biến, không in giá trị mật khẩu. Đây là cấu hình cho Auth chạy trực tiếp trên máy; khi đưa Auth vào Compose sẽ dùng hostname/cổng nội bộ riêng.

## Chạy thủ công

PostgreSQL cần đang chạy. Nếu chưa chạy, tại thư mục gốc dự án dùng:

```powershell
docker compose up -d postgres
```

Sau đó mở terminal tại `services/auth-service`:

```powershell
pnpm start:dev
```

Chỉ chạy một phiên Auth trên cổng 3000. Nếu đang có phiên watch thì lưu mã nguồn sẽ kích hoạt khởi động lại. Khi có log `Nest application successfully started`, mở `http://localhost:3000` để kiểm tra phản hồi `Hello World!`. Prisma mở kết nối khi có truy vấn; dùng `pnpm prisma:check` để kiểm tra database riêng.

Nếu không kết nối được, kiểm tra PostgreSQL, cổng 5433 và mật khẩu `auth_user` trong `.env`; không gửi mật khẩu vào hội thoại. Adapter PostgreSQL có timeout kết nối 5 giây.

## Cách hoạt động và kiểm tra

- `src/config/environment.ts`: kiểm tra và chuyển kiểu cấu hình.
- `src/app.module.ts`: nạp cấu hình cho ứng dụng NestJS và AuthModule.
- `src/database/prisma/auth-prisma.service.ts`: tạo Prisma Client cho Auth và đóng kết nối khi ứng dụng dừng.
- `src/main.ts`: dùng cổng đã kiểm tra và đóng kết nối khi ứng dụng dừng qua shutdown hook.
- Chạy service không tự tạo bảng hoặc chạy migration; cấu trúc được quản lý bởi Prisma Migrate.

Kết quả lịch sử ngày 2026-09-22: build, unit test, e2e và lint đạt; lúc đó TypeORM DataSource trả về `auth_db` / `auth_user`. Sau khi chuyển ORM, `pnpm prisma:check` đã xác nhận cùng database và tài khoản kết nối. Lịch sử tạo bảng ban đầu ở [tài liệu cũ](./auth-database-migration.md); migration hiện hành ở [baseline Prisma](./prisma-baseline.md).
