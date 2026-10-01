# API Gateway

**Trạng thái:** Đã triển khai proxy login/me, JWT sơ bộ, CORS và correlation ID. Người dùng đã chạy 5/5 test đạt và kiểm tra qua Auth thật. Gateway chưa định tuyến các service khác hoặc phục vụ web.

Gateway là điểm vào chung của web/Android tại `http://localhost:8080`. Bước này chỉ định tuyến hai route Auth tới Auth Service; `/me` được xác minh JWT sơ bộ tại Gateway, rồi Auth xác minh lại và đọc quyền hiện hành từ database. Gateway không có database và không tin role/quyền do client gửi.

## Vai trò các file

| File | Vai trò |
|---|---|
| `package.json` | Khai báo NestJS, lệnh build/chạy/test; phiên bản được lưu cùng lockfile |
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

## Chạy và kiểm tra

Xem [hướng dẫn local](../../docs/local-development.md) để cấu hình Gateway cùng Auth, chạy và kiểm thử.

Gateway không có database nghiệp vụ. JWT được xác minh sơ bộ tại Gateway; Auth xác minh lại và đọc quyền hiện hành.

Hợp đồng tích hợp: [API Guide](../../docs/api-guide.md) và [OpenAPI Auth](../../docs/api/auth.openapi.json).

Các route nghiệp vụ còn lại và phục vụ web được theo dõi trong [kế hoạch](../../plan.md).
