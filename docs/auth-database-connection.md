# Kết nối Auth Service với PostgreSQL local

**Ngày:** 2026-09-22  
**Phạm vi:** kết nối database và kiểm tra cấu hình. Entity/migration đã bổ sung ở bước sau; xem [hướng dẫn tạo bảng](./auth-database-migration.md). Chưa triển khai API đăng nhập.

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

Chỉ chạy một phiên Auth trên cổng 3000. Nếu đang có phiên watch thì lưu mã nguồn sẽ kích hoạt khởi động lại. Khi có log `Nest application successfully started`, mở `http://localhost:3000` để kiểm tra phản hồi `Hello World!`. Service chờ kết nối database thành công trước khi nhận HTTP request.

Nếu không kết nối được, kiểm tra PostgreSQL, cổng 5433 và mật khẩu `auth_user` trong `.env`; không gửi mật khẩu vào hội thoại. Kết nối có timeout 5 giây và tối đa 3 lần thử khi khởi động.

## Cách hoạt động và kiểm tra

- `src/config/environment.ts`: kiểm tra và chuyển kiểu cấu hình.
- `src/app.module.ts`: nạp cấu hình và tạo kết nối TypeORM.
- `src/main.ts`: dùng cổng đã kiểm tra và đóng kết nối khi ứng dụng dừng qua shutdown hook.
- `synchronize`, `migrationsRun`, `dropSchema`, `installExtensions` đều là `false`; đã đăng ký ba entity Auth. Chạy service không tự tạo bảng hoặc chạy migration.

Đã kiểm tra ngày 2026-09-22: build, unit test (1 ca), e2e (1 ca GET `/` trả HTTP 200 và `Hello World!` với database thật), lint và định dạng mã nguồn đạt. Kiểm tra qua Nest application context và chính TypeORM DataSource của ứng dụng trả về `auth_db` / `auth_user`. Trước khi người dùng chạy migration, số bảng trong schema `public` là 0. Kết quả kiểm tra schema và các lệnh migration nằm trong [hướng dẫn tạo bảng](./auth-database-migration.md).
