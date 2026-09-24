# API tài khoản hiện hành

**Ngày:** 2026-09-24

`GET /api/auth/me` trả tài khoản, role, kho được phân công và quyền bổ sung **đang có trong database**. JWT chỉ chứa `sub`; mỗi request phải xác minh chữ ký, thời hạn, issuer/audience và đọc lại trạng thái/quyền. Tài khoản bị disable hoặc quyền bị thu hồi có hiệu lực ngay với request tiếp theo.

Trước khi có Gateway, gọi trực tiếp Auth local sau khi [đăng nhập](./auth-login.md):

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer <accessToken>
```

Response `200` có dạng:

```json
{
  "id": "<uuid>",
  "username": "admin",
  "email": "admin@example.local",
  "role": "ADMIN",
  "assignedWarehouseId": null,
  "status": "ACTIVE",
  "additionalPermissions": []
}
```

Thiếu/sai/hết hạn token, tài khoản không tồn tại hoặc INACTIVE trả `401 UNAUTHORIZED`. Database không khả dụng trả `503 SERVICE_UNAVAILABLE`. Response có `Cache-Control: no-store`; không chứa password hash. Chi tiết hợp đồng nằm trong [OpenAPI Auth](./auth-login.openapi.json).

| File | Vai trò |
|---|---|
| `services/auth-service/src/auth/current-user.guard.ts` | Bảo vệ route: xác minh Bearer JWT, truy vấn Prisma và đặt dữ liệu tài khoản hiện hành lên request |
| `services/auth-service/src/auth/auth.controller.ts` | Cung cấp `GET /api/auth/me` và trả dữ liệu guard đã kiểm tra |
| `services/auth-service/src/auth/auth.module.ts` | Đăng ký guard để NestJS cấp JwtService và AuthPrismaService |
| `services/auth-service/src/common/api-error.filter.ts` | Giữ mã lỗi `UNAUTHORIZED` riêng cho token, bên cạnh `INVALID_CREDENTIALS` của login |
| `services/auth-service/test/auth-login.database-spec.ts` | Kiểm thử HTTP với PostgreSQL tạm: token, thay đổi role/kho/quyền, disable và lỗi database |
| `docs/auth-login.openapi.json` | Mô tả request/response `/me` cùng cơ chế Bearer JWT cho công cụ API |

`pnpm build` và 77 ca database test đã đạt. FEAT-01 vẫn IN_PROGRESS vì giao diện web/Android và hành vi đăng xuất phía client chưa triển khai. Guard này mới áp dụng cho `/me`; các route được bảo vệ sau này phải gắn guard và kiểm tra quyền nghiệp vụ tương ứng.
