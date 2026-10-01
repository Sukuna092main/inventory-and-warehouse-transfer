# Hướng dẫn API

## 1. Phạm vi và địa chỉ

Hợp đồng đã triển khai: [OpenAPI Auth](./api/auth.openapi.json).

| Endpoint | Chức năng |
|---|---|
| `POST /api/auth/login` | Đăng nhập |
| `GET /api/auth/me` | Tài khoản và quyền hiện hành |

Các API khác trong SRS là yêu cầu cần triển khai, chưa mặc nhiên khả dụng. Web/Android gọi qua Gateway: `http://localhost:8080` trên máy phát triển, `http://<IP-LAN>:8080` trên điện thoại thật, hoặc `http://10.0.2.2:8080` trên Android Studio Emulator mặc định. Auth trực tiếp tại cổng `3000` chỉ dùng kiểm tra nội bộ khi phát triển.

## 2. Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "admin",
  "password": "<mat-khau-da-seed>"
}
```

`identifier` nhận username hoặc email, được trim và chuyển chữ thường. Mật khẩu giữ nguyên. Không gửi thêm role, quyền hoặc actor.

Response `200`:

```json
{
  "accessToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

JWT ký HS256, issuer `inventory-auth`, audience `inventory-api`, có hạn 30 phút. Token chứa định danh tài khoản và claim xác thực, không chứa role/danh sách quyền. Response có `Cache-Control: no-store`. MVP chưa có refresh token.

## 3. Tài khoản hiện hành

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

Response `200` gồm `id`, `username`, `email`, `role`, `assignedWarehouseId` (có thể null), `status` và `additionalPermissions`.

Gateway xác minh JWT sơ bộ; Auth xác minh lại và đọc trạng thái/quyền từ database. `/me` không trả password hash và có `Cache-Control: no-store`. Quyền bổ sung rỗng không làm mất quyền mặc định theo role.

## 4. Lỗi

Response lỗi có `code`, `message`, `correlationId`; validation có thể có `details`.

| Trường hợp | Kết quả |
|---|---|
| Login thiếu/sai kiểu/thừa trường hoặc vượt độ dài | `400 VALIDATION_ERROR` |
| Sai mật khẩu, không có tài khoản hoặc INACTIVE khi login | `401 INVALID_CREDENTIALS` |
| `/me` thiếu/sai/hết hạn token, tài khoản không tồn tại hoặc INACTIVE | `401 UNAUTHORIZED` |
| Vượt số lượt login đang xử lý đồng thời | `429 TOO_MANY_REQUESTS` |
| Database hoặc Auth không khả dụng | `503 SERVICE_UNAVAILABLE` |

Auth giới hạn hai lượt login xử lý đồng thời để kiểm soát tài nguyên scrypt; chưa phải giới hạn số lần thử theo IP/tài khoản. Response 429 có `Retry-After: 1`. Gateway hiện chưa triển khai giới hạn tần suất theo IP/tài khoản.

Correlation ID hợp lệ được giữ lại, nếu thiếu/sai thì server sinh ID. Dùng ID đối chiếu log; không ghi token, password hoặc SQL chứa dữ liệu nhạy cảm. Login không được ghi thành audit thay đổi tài khoản.

## 5. Phiên và client

Yêu cầu MVP:

- Web giữ token trong bộ nhớ; tải lại trang cần đăng nhập.
- Android lưu token bằng SecureStore, không lưu mật khẩu.
- Logout xóa token/cache phía client; hiện không có endpoint logout/thu hồi token.
- `/me` trả 401: xóa phiên và yêu cầu đăng nhập lại.
- Lỗi mạng/server: giữ token, ghi rõ chưa xác nhận lại dữ liệu và cho thử lại.
- Android quay lại foreground phải tải lại `/me`; phản hồi đến muộn sau logout không được khôi phục tài khoản.
- Đổi tài khoản không hiển thị cache người dùng trước.

Phần cập nhật phiên theo vòng đời app đang triển khai; tiến độ nằm trong [kế hoạch](../plan.md).

## 6. Kiểm tra

Nhập OpenAPI vào công cụ hỗ trợ hoặc tạo request trong Bruno. Bộ request Bruno đầy đủ vẫn là đầu ra cần bổ sung.

Các ca chính:

1. Login bằng username/email, kể cả chữ hoa hoặc khoảng trắng đầu/cuối identifier.
2. Sai mật khẩu, body sai định dạng, thiếu/thừa trường hoặc quá độ dài.
3. `/me` với token hợp lệ, thiếu token, token sai/hết hạn.
4. Thay trạng thái/quyền bằng fixture kiểm thử rồi gọi lại `/me`.
5. Gateway giữ response Auth và correlation ID; CORS theo origin cấu hình.
6. Auth không khả dụng: Gateway trả 503.
7. Logout/đổi tài khoản không giữ dữ liệu tài khoản trước.

Không disable Admin thật để thử lỗi. Dùng bộ test với dữ liệu riêng cho các ca thay trạng thái/quyền. Lệnh và cấu hình nằm trong [hướng dẫn local](./local-development.md); bằng chứng đã chạy nằm trong [kế hoạch](../plan.md).
