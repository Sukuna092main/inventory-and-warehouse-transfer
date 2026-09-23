# API đăng nhập — bước đầu của Auth

**Ngày:** 2026-09-23

**Trạng thái:** API đăng nhập đã chuyển truy vấn sang Prisma và kiểm thử; kiểm tra thủ công bằng Admin đã seed tùy theo cấu hình JWT local. Chưa làm `/api/auth/me`, guard cho API cần xác thực hoặc giao diện đăng nhập.

## 1. Chuẩn bị khóa ký JWT

Trong terminal tại `services/auth-service`, chạy:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Chép chuỗi vừa sinh vào một dòng mới trong `.env` của Auth:

```dotenv
JWT_SECRET=chuoi_64_ky_tu_hex_vua_sinh
```

Thay toàn bộ phần sau dấu `=` bằng chuỗi thật. Đây là khóa ký token của server, khác mật khẩu Admin và mật khẩu database. Giữ khóa trong `.env`; không gửi vào hội thoại. HTTP server từ chối khởi động nếu khóa thiếu hoặc sai định dạng. Migration và seed vẫn chạy được mà không cần khóa JWT.

Sau đó chạy `pnpm start:dev` tại thư mục Auth. Nếu đang có phiên watch, dừng bằng Ctrl+C và khởi động lại để đọc `.env` mới. Thay khóa sau này sẽ khiến token ký bằng khóa cũ không còn hợp lệ khi xác minh.

## 2. Gọi API

Ở bước phát triển này gọi trực tiếp Auth tại cổng 3000. Khi Gateway được triển khai, hai client sẽ truy cập qua Gateway.

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "admin",
  "password": "MAT_KHAU_BAN_DA_SEED"
}
```

Thay hai giá trị bằng thông tin seed của bạn. `identifier` nhận username hoặc email; được trim và chuyển chữ thường. `password` được giữ nguyên, kể cả khoảng trắng. Body không được có trường khác như role, actor hoặc quyền. Có thể nhập request vào công cụ test API bạn đang dùng; hợp đồng OpenAPI riêng endpoint này nằm ở [auth-login.openapi.json](./auth-login.openapi.json).

Nếu dùng PowerShell, bạn có thể gọi mà không ghi mật khẩu vào lịch sử lệnh:

```powershell
$loginIdentifier = Read-Host 'Username hoac email'
$loginPassword = Read-Host 'Mat khau Admin' -AsSecureString
$loginBody = @{
  identifier = $loginIdentifier
  password = [System.Net.NetworkCredential]::new('', $loginPassword).Password
} | ConvertTo-Json
$loginResult = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/login' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($loginBody))
$loginResult | Select-Object tokenType, expiresIn
Remove-Variable loginPassword, loginBody
```

Token nằm trong `$loginResult.accessToken`; chưa cần gửi token hoặc mật khẩu cho trợ lý. Response thành công có HTTP 200, header `Cache-Control: no-store` và dạng:

```json
{
  "accessToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

JWT có `sub` là ID người dùng, thời điểm phát hành/hết hạn, issuer `inventory-auth`, audience `inventory-api`; được ký HS256 và có hạn 30 phút. Không chứa mật khẩu, hash, role hoặc danh sách quyền. Các API được bảo vệ ở bước tiếp theo sẽ phải xác thực token rồi lấy trạng thái/quyền hiện hành từ Auth.

## 3. Các kết quả cần thử

| Trường hợp | Kết quả |
|---|---|
| Username đúng + mật khẩu đúng | 200 và JWT |
| Email đúng + mật khẩu đúng | 200 và JWT |
| Username/email viết hoa hoặc thêm khoảng trắng đầu/cuối | Được chuẩn hóa trước khi tra cứu |
| Sai mật khẩu, không có tài khoản hoặc tài khoản INACTIVE | Cùng lỗi 401 INVALID_CREDENTIALS |
| Thiếu trường, sai kiểu, identifier quá 254 ký tự, password quá 128 ký tự hoặc có trường thừa | 400 VALIDATION_ERROR |
| Database lỗi khi tra cứu tài khoản | 503 SERVICE_UNAVAILABLE, không trả SQL hoặc tham số |
| Vượt hai lượt đăng nhập đang xử lý trong cùng tiến trình | 429 TOO_MANY_REQUESTS, có Retry-After |

Response lỗi có `code`, `message`, `correlationId`; lỗi validation có thể có thêm `details`. Header `X-Correlation-ID` hợp lệ được giữ lại, nếu thiếu hoặc sai định dạng thì server sinh UUID. Không ghi lần đăng nhập vào bảng audit thay đổi tài khoản.

Giới hạn hai lượt xử lý cùng lúc nhằm giới hạn bộ nhớ dùng cho scrypt; chưa phải giới hạn số lần thử theo IP/tài khoản. Cơ chế giới hạn tần suất ở Gateway sẽ được làm khi triển khai Gateway. Không tự disable Admin thật chỉ để thử lỗi INACTIVE; ca này đã có trong test dùng dữ liệu riêng.

## 4. Vai trò từng file

Các đường dẫn dưới đây tính từ `services/auth-service`.

| File tạo/sửa | Vai trò |
|---|---|
| `src/auth/dto/login.dto.ts` | Mô tả body được phép nhận; chuẩn hóa identifier và kiểm tra kiểu/độ dài |
| `src/auth/auth.controller.ts` | Nhận POST /api/auth/login, chuyển dữ liệu cho service và trả HTTP 200 khi thành công |
| `src/auth/auth.service.ts` | Tìm người dùng bằng Prisma với `select` rõ ba trường cần thiết, kiểm tra mật khẩu/trạng thái, giới hạn số lượt đang xử lý và yêu cầu ký token |
| `src/auth/auth.module.ts` | Kết nối controller, service, AuthPrismaService và JwtModule để NestJS cấp các thành phần cần dùng |
| `src/database/prisma/auth-prisma.service.ts` | Tạo Prisma Client từ cấu hình DB_* khi NestJS khởi động và đóng kết nối khi ứng dụng dừng |
| `src/database/prisma/prisma-client.ts` | Tạo client với PostgreSQL adapter; mặc định bỏ password hash khỏi kết quả, chỉ truy vấn đăng nhập chọn nó một cách tường minh |
| `src/database/prisma/connection-options.ts` | Ánh xạ cấu hình DB_* thành tham số kết nối; cho phép test dùng schema riêng |
| `src/auth/jwt.config.ts` | Kiểm tra khóa ký, chọn HS256, issuer/audience và hạn 30 phút; dùng chung khi ký và xác minh token |
| `src/common/api-error.filter.ts` | Chuyển lỗi thành response theo SRS, gắn correlationId và che lỗi nội bộ |
| `src/configure-app.ts` | Bật validation và error filter; dùng chung khi chạy server và khi test HTTP |
| `src/app.module.ts` | Đăng ký AuthModule vào ứng dụng chính |
| `src/main.ts` | Gọi configureApp trước khi server nhận request |
| `.env.example` | Thêm tên biến JWT_SECRET để biết cấu hình cần bổ sung; không sinh khóa thật |
| `src/auth/jwt.config.spec.ts` | Kiểm tra chữ ký, thời hạn, issuer/audience và thuật toán JWT |
| `src/auth/auth.service.spec.ts` | Kiểm tra giới hạn số lượt đang xử lý và việc giải phóng lượt sau khi lỗi |
| `test/auth-login.database-spec.ts` | Gọi HTTP thật vào Nest với Prisma kết nối tới schema PostgreSQL riêng; TypeORM hiện chỉ chuẩn bị và dọn dữ liệu thử |
| `jest.config.ts`, `test/jest-database.json`, `test/jest-e2e.json` | Giúp Jest tìm các file TypeScript mà Prisma Client sinh ra dù import có đuôi `.js` |
| `test/app.e2e-spec.ts` | Giữ kiểm tra GET /, thêm khóa ký ngẫu nhiên chỉ dùng trong test và dùng cùng cấu hình HTTP |
| `src/database/seeds/seed-admin-config.spec.ts` | Sửa dữ liệu ca “mật khẩu quá ngắn” cho khớp mức tối thiểu 8 ký tự bạn đã chọn |

Luồng: request → DTO/validation → controller → service → Prisma đọc database → hàm `verifyPassword` có sẵn → JwtService ký token → response. Lỗi ở validation hoặc xử lý được error filter chuyển thành cấu trúc chung. Tài liệu này hướng dẫn thao tác; `plan.md` theo dõi tiến độ và file OpenAPI mô tả hợp đồng request/response cho công cụ API.

## 5. Kiểm thử

Sau khi chuyển truy vấn sang Prisma, đã đạt 26 unit test, 69 ca database (gồm 22 ca HTTP đăng nhập) và 1 e2e GET `/`. Các ca HTTP đăng nhập chạy trong schema `login_test_<UUID>` có dữ liệu và khóa JWT thử riêng; dọn schema khi kết thúc, không thay đổi Admin đã seed trong `public`. Kiểm tra kiểu, Nest build và lint đạt. Lệnh `pnpm build` bị đứng ở bước gọi Prisma CLI trong môi trường trợ lý nên phần generate+build qua lệnh đó chưa được xác nhận lại; người dùng đã generate client ở bước kết nối trước đó.

Chạy lại bằng `pnpm test --runInBand`, `pnpm test:database` và `pnpm test:e2e --runInBand`. Tests tự cấp khóa thử nên không thay `.env` thật. Phần đăng nhập đầy đủ trên web/Android và kiểm tra quyền hiện hành chưa được đánh dấu hoàn thành.
