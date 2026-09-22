# Seed Admin để chuẩn bị test API

**Trạng thái:** Hoàn thành. Người dùng đã chạy seed; kiểm tra chỉ đọc xác nhận 1 Admin ACTIVE và 1 audit SYSTEM / USER_CREATED từ seed. Chưa triển khai API đăng nhập.

## Vai trò các file

| File trong Auth Service | Vai trò |
|---|---|
| `src/database/seeds/seed-admin.ts` | Điểm bắt đầu khi chạy lệnh: đọc cấu hình, mở kết nối database, gọi phần tạo Admin, báo kết quả và đóng kết nối |
| `src/database/seeds/seed-admin-config.ts` | Kiểm tra ba biến SEED_ADMIN_*; chuẩn hóa username/email, giữ nguyên mật khẩu |
| `src/database/seeds/create-initial-admin.ts` | Xử lý tạo Admin: kiểm tra đã tồn tại, khóa để tránh tạo trùng, lưu tài khoản và audit trong cùng transaction |
| `src/auth/password.ts` | Băm mật khẩu trước khi lưu và cung cấp hàm đối chiếu mật khẩu để dùng cho API đăng nhập sau này |
| `src/config/local-environment.ts` | Đọc .env cho các lệnh chạy từ terminal; biến môi trường của tiến trình được ưu tiên nếu trùng tên |
| `src/database/data-source.ts` | Cấu hình kết nối dùng cho TypeORM CLI; được sửa để dùng chung hàm đọc .env |
| `package.json` | Thêm lệnh seed:admin để build và chạy seed bằng một lệnh ngắn |
| `.env.example` | Liệt kê cấu hình mẫu, không chứa mật khẩu thật; người dùng điền giá trị riêng trong .env |
| `src/auth/password.spec.ts` | Kiểm tra mật khẩu đúng/sai, salt ngẫu nhiên, Unicode và định dạng hash |
| `src/database/seeds/seed-admin-config.spec.ts` | Kiểm tra cấu hình thiếu/sai, chuẩn hóa và tránh đưa bí mật vào thông báo lỗi |
| `test/seed-admin.database-spec.ts` | Kiểm tra seed trên PostgreSQL thật: tạo mới, chạy lại, chạy đồng thời và rollback khi audit lỗi |

Luồng chạy: `pnpm seed:admin` → `seed-admin.ts` đọc/kiểm tra cấu hình → `create-initial-admin.ts` gọi hàm băm rồi lưu tài khoản cùng audit → trả kết quả và đóng kết nối. Các file test chỉ phục vụ kiểm thử, không chạy trong lệnh seed thông thường.

## Cấu hình một lần

Trong file `services/auth-service/.env` hiện có, thêm ba dòng sau và điền mật khẩu riêng vào dòng cuối. Không thay các biến kết nối database.

```dotenv
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=
```

Mật khẩu seed cần 15–128 ký tự Unicode, không chỉ có khoảng trắng; có thể dùng một cụm từ dài dễ nhớ. Nếu có dấu `#` hoặc khoảng trắng đầu/cuối, đặt toàn bộ giá trị trong dấu nháy. Seed giữ nguyên mật khẩu, chỉ trim và chuyển chữ thường cho username/email.

Đây là mật khẩu **tài khoản ứng dụng**, khác `DB_PASSWORD` của tài khoản PostgreSQL. Bạn có thể xem lại giá trị đã đặt trong `.env` khi test API. `.env` đã được Git bỏ qua; `.env.example` chỉ ghi tên biến và để trống mật khẩu. Không cần gửi mật khẩu vào hội thoại hoặc thêm nó vào mã nguồn.

## Chạy thủ công

PostgreSQL đang chạy và migration Auth đã hoàn tất. Tại `services/auth-service`, chạy:

```powershell
pnpm seed:admin
```

Lệnh tự build rồi chạy `src/database/seeds/seed-admin.ts` ở bản JavaScript đã biên dịch. Không cần cài dependency mới hoặc chạy HTTP server. Nếu đang chạy `start:dev`, nên dừng trước bằng Ctrl+C vì lệnh seed có build lại thư mục `dist`.

Khi thành công, terminal báo đã tạo Admin đầu tiên và audit. Sau này dùng username hoặc email cùng mật khẩu đã đặt để test API đăng nhập. Không có mật khẩu mặc định trong source.

## Chạy lại sẽ thế nào?

- Chưa có Admin: tạo một tài khoản `ADMIN`, trạng thái `ACTIVE`, không gán kho, không có quyền bổ sung; ghi audit `SYSTEM / USER_CREATED` trong cùng transaction.
- Đã có bất kỳ tài khoản `ADMIN`, kể cả INACTIVE: báo bỏ qua. Không thêm Admin, không sửa password/status và không thêm audit.
- Username hoặc email đang thuộc tài khoản khác: từ chối; không tự nâng quyền tài khoản đó.
- Hai lệnh seed chạy đồng thời: khóa bảng `users` trong transaction để chỉ một lần tạo thành công; lần còn lại thấy Admin và bỏ qua. Khóa có timeout 5 giây.
- Ghi audit thất bại: việc tạo Admin cũng rollback. Lỗi CLI không in SQL, tham số, password hash hoặc mật khẩu.

**Sửa `SEED_ADMIN_PASSWORD` rồi chạy seed lại không đổi mật khẩu đã lưu.** Giữ giá trị khớp với lần tạo đầu tiên; đây là lệnh bootstrap, không phải lệnh reset mật khẩu. Nếu quên sau khi đã đổi cấu hình, xử lý đặt lại mật khẩu ở bước riêng, không xóa database.

## Kiểm tra trong pgAdmin

Chọn `auth_db` và chạy truy vấn chỉ lấy thông tin cần thiết:

```sql
SELECT id, username, email, role, status
FROM public.users WHERE role = 'ADMIN';

SELECT user_id, actor_type, action, created_at
FROM public.user_audit_logs
WHERE actor_type = 'SYSTEM' AND action = 'USER_CREATED';
```

Trên database mới, dự kiến có một Admin và một audit tương ứng. Không cần truy vấn hoặc gửi `password_hash` để kiểm tra.

## Cách băm và kết quả kiểm thử

`src/auth/password.ts` dùng scrypt bất đồng bộ có sẵn trong Node.js: salt ngẫu nhiên 16 byte, N=131072, r=8, p=1; lưu tên thuật toán, tham số, salt và hash để hàm kiểm tra mật khẩu đọc lại. Dùng `timingSafeEqual` so sánh kết quả. Lựa chọn này không thêm dependency; thông số tham khảo [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt) và [Node.js crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

Đã kiểm tra hàm băm/so sánh, chuẩn hóa cấu hình và các tình huống seed trên PostgreSQL thật: tạo mới, chạy lại, Admin INACTIVE, đổi cấu hình sang người khác, trùng username/email với Staff, audit lỗi và hai lệnh đồng thời. Các ca seed dùng schema `seed_test_<UUID>` riêng để thử được hai kết nối đồng thời, rồi xóa đúng schema đó khi kết thúc; không seed vào `public` khi chạy test. Bộ kiểm tra schema cũ vẫn dùng transaction rollback như trước.

Chạy lại kiểm thử bằng `pnpm test --runInBand` và `pnpm test:database`. Việc kiểm tra API đăng nhập sẽ được bổ sung ở bước tiếp theo.
