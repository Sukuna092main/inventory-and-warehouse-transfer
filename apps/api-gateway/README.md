# API Gateway — bước Auth đầu tiên

**Trạng thái:** Đã chuẩn bị mã cho `POST /api/auth/login` và `GET /api/auth/me`; kiểm tra kiểu và 5 ca HTTP với các package NestJS sẵn có trong Auth đã đạt. Chờ cài dependency thủ công, tạo `.env` local và chạy lại build/test trong Gateway. Gateway chưa định tuyến các service khác hoặc phục vụ web.

Gateway là điểm vào chung của web/Android tại `http://localhost:8080`. Bước này chỉ định tuyến hai route Auth tới Auth Service; `/me` được xác minh JWT sơ bộ tại Gateway, rồi Auth xác minh lại và đọc quyền hiện hành từ database. Gateway không có database và không tin role/quyền do client gửi.

## Vai trò các file

| File | Vai trò |
|---|---|
| `package.json` | Khai báo NestJS, lệnh build/chạy/test; `pnpm install` sẽ tạo lockfile |
| `nest-cli.json`, `tsconfig.json` | Cấu hình biên dịch NestJS/TypeScript strict |
| `.env.example` | Liệt kê cấu hình local cần điền, không chứa khóa thật |
| `src/gateway.config.ts` | Kiểm tra cổng, URL Auth, origin web và khóa JWT; cấu hình xác minh JWT giống Auth |
| `src/correlation-id.ts` | Chọn/sinh correlation ID và log phương thức, đường dẫn, status, thời gian; không log body/token |
| `src/configure-app.ts` | Bật correlation ID và CORS cho web local |
| `src/gateway-error.filter.ts` | Trả lỗi phát sinh tại Gateway theo `code/message/correlationId`, không lộ nội dung request |
| `src/app.module.ts` | Đăng ký ConfigModule, JwtModule và controller Auth |
| `src/auth-proxy.controller.ts` | Chuyển tiếp hai route tới Auth, xác minh token sơ bộ cho `/me`, trả 503 nếu Auth không khả dụng |
| `src/main.ts` | Khởi động Gateway trên cổng 8080 |
| `test/gateway.test.cjs` | Test HTTP với Auth giả trong bộ nhớ: proxy, JWT, CORS, correlation ID và lỗi 503 |

## Chuẩn bị thủ công

Auth Service cần chạy trên máy tại cổng 3000. Tại `apps/api-gateway`, chạy:

```powershell
pnpm install --strict-peer-dependencies
Copy-Item .env.example .env
```

Trong `.env`, chép **cùng giá trị `JWT_SECRET`** đang dùng tại `services/auth-service/.env` vào dòng `JWT_SECRET=`. Không gửi khóa cho trợ lý hoặc đưa `.env` vào Git. `AUTH_SERVICE_URL` mẫu là `http://127.0.0.1:3000`; `WEB_ORIGIN` là origin dự kiến của Vite. Nếu pnpm báo `ERR_PNPM_IGNORED_BUILDS`, chạy `pnpm approve-builds` và chọn build script cần thiết, rồi chạy lại `pnpm install --strict-peer-dependencies`.

Sau khi cài và điền cấu hình:

```powershell
pnpm build
pnpm test
pnpm start:dev
```

`pnpm test` dựng Gateway và Auth giả ở cổng tạm, không đụng `auth_db` hoặc tài khoản Admin. Nó dùng khóa JWT ngẫu nhiên chỉ trong tiến trình test. Khi Gateway chạy, gửi request đăng nhập tới `http://localhost:8080/api/auth/login` thay vì cổng 3000; dùng token nhận được để gọi `http://localhost:8080/api/auth/me`. Gateway chuyển tiếp status/body Auth, giữ correlation ID và không lưu token.

Khi chuyển sang Compose, `AUTH_SERVICE_URL` sẽ là địa chỉ nội bộ của Auth container; không dùng `127.0.0.1` trong Gateway container. Hướng dẫn Compose đầy đủ sẽ được bổ sung khi kết nối các service tiếp theo.
