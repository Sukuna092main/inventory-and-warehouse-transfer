# Hướng dẫn API

## 1. Phạm vi và địa chỉ

Hợp đồng đã triển khai: [OpenAPI Auth](./api/auth.openapi.json).

Các API khác trong SRS là yêu cầu cần triển khai, chưa mặc nhiên khả dụng. Web/Android gọi qua Gateway: `http://localhost:8080` trên máy phát triển, `http://<IP-LAN>:8080` trên điện thoại thật, hoặc `http://10.0.2.2:8080` trên Android Studio Emulator mặc định. Auth trực tiếp tại cổng `3000` chỉ dùng kiểm tra nội bộ khi phát triển.

## 2. Danh mục API toàn hệ thống

**Đối chiếu ngày 2026-10-05:** 39 cặp method/endpoint theo [SRS 1.2, mục 11](../SRS_Inventory_Warehouse_Transfer_System_VI.md#11-api-đề-xuất). Quyền lấy từ [ma trận mục 2.4](../SRS_Inventory_Warehouse_Transfer_System_VI.md#24-ma-trận-quyền-và-phạm-vi-kho-trong-mvp) và yêu cầu nghiệp vụ liên quan. Request/response chi tiết được chốt khi triển khai từng chức năng.

| Service | Số endpoint | DONE | TODO |
|---|---:|---:|---:|
| Auth/User | 8 | 2 | 6 |
| Product | 6 | 0 | 6 |
| Warehouse | 6 | 0 | 6 |
| Inventory | 7 | 0 | 7 |
| Transfer | 12 | 0 | 12 |
| **Tổng** | **39** | **2** | **37** |

`DONE` trong danh mục chỉ xác nhận API đã triển khai tại service/Gateway và có bằng chứng kiểm tra được ghi trong kế hoạch. `TODO` là API trong phạm vi cần làm. Trạng thái này không thay thế ma trận Backend/Web/Android/Kiểm thử trong [plan.md](../plan.md#52-theo-dõi-triển-khai-theo-chức-năng); FEAT-01 vẫn IN_PROGRESS.

Trong bảng: Admin = `ADMIN`, Manager = `WAREHOUSE_MANAGER`, Staff = `WAREHOUSE_STAFF`. Ngoại trừ login, các API yêu cầu tài khoản ACTIVE, token hợp lệ và quyền hiện hành. Server kiểm tra quyền và phạm vi kho; client không được tự khai báo role/actor để được cấp quyền.

### 2.1. Auth/User — 8 endpoint

| Method | Endpoint | Chức năng | Quyền/phạm vi kho | Trạng thái | Tham chiếu SRS |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | Đăng nhập bằng username/email | Chưa cần token; xác thực tài khoản ACTIVE | DONE | FR-AUTH-01; 11.1 |
| GET | `/api/auth/me` | Tài khoản và quyền hiện hành | Mọi vai trò; chỉ tài khoản đang xác thực | DONE | FR-AUTH-01/02; 11.1 |
| POST | `/api/users` | Tạo người dùng | Admin; toàn hệ thống | TODO | FR-AUTH-03; 2.4; 11.1 |
| GET | `/api/users` | Danh sách/tìm kiếm người dùng | Admin; toàn hệ thống | TODO | FR-AUTH-03; 2.4; 11.1 |
| GET | `/api/users/{id}` | Chi tiết người dùng | Admin; toàn hệ thống | TODO | FR-AUTH-03; 2.4; 11.1 |
| PUT | `/api/users/{id}` | Cập nhật tài khoản, role, kho và quyền bổ sung | Admin; gán kho/quyền theo điều kiện SRS | TODO | FR-AUTH-03; 2.4; 11.1 |
| PATCH | `/api/users/{id}/status` | Đổi trạng thái tài khoản | Admin; toàn hệ thống | TODO | FR-AUTH-03; 2.4; 11.1 |
| GET | `/api/users/audit` | Lịch sử thay đổi tài khoản/quyền | Admin; toàn hệ thống | TODO | 9.10; 11.1; NFR-06 |

### 2.2. Product — 6 endpoint

| Method | Endpoint | Chức năng | Quyền/phạm vi kho | Trạng thái | Tham chiếu SRS |
|---|---|---|---|---|---|
| POST | `/api/products` | Tạo sản phẩm | Admin; toàn hệ thống | TODO | FR-PRODUCT-01/02; 2.4; 11.2 |
| GET | `/api/products` | Danh sách/tìm kiếm sản phẩm | Admin, Manager, Staff | TODO | FR-PRODUCT-04; 2.4; 11.2 |
| GET | `/api/products/{id}` | Chi tiết sản phẩm | Admin, Manager, Staff | TODO | 2.4; 11.2 |
| PUT | `/api/products/{id}` | Cập nhật thông tin sản phẩm | Admin; tuân theo ràng buộc SKU/đơn vị tính | TODO | FR-PRODUCT-02/03; 11.2 |
| PATCH | `/api/products/{id}/status` | Đổi trạng thái sản phẩm | Admin; kiểm tra điều kiện vô hiệu hóa | TODO | FR-PRODUCT-03; BR-16; 11.2 |
| GET | `/api/products/audit` | Lịch sử thay đổi sản phẩm | Admin; toàn hệ thống | TODO | 9.10; 11.2; NFR-06 |

### 2.3. Warehouse — 6 endpoint

| Method | Endpoint | Chức năng | Quyền/phạm vi kho | Trạng thái | Tham chiếu SRS |
|---|---|---|---|---|---|
| POST | `/api/warehouses` | Tạo kho | Admin; toàn hệ thống | TODO | FR-WH-01; BR-15; 11.3 |
| GET | `/api/warehouses` | Danh sách/tìm kiếm kho | Admin; Manager/Staff xem kho hoạt động | TODO | FR-WH-03; 2.4; 11.3 |
| GET | `/api/warehouses/{id}` | Chi tiết kho | Admin; Manager/Staff xem kho hoạt động | TODO | 2.4; 11.3 |
| PUT | `/api/warehouses/{id}` | Cập nhật thông tin kho | Admin; toàn hệ thống | TODO | FR-WH-02; 2.4; 11.3 |
| PATCH | `/api/warehouses/{id}/status` | Đổi trạng thái kho | Admin; kiểm tra điều kiện vô hiệu hóa | TODO | FR-WH-02; BR-16; 11.3 |
| GET | `/api/warehouses/audit` | Lịch sử thay đổi kho | Admin; toàn hệ thống | TODO | 9.10; 11.3; NFR-06 |

### 2.4. Inventory — 7 endpoint

| Method | Endpoint | Chức năng | Quyền/phạm vi kho | Trạng thái | Tham chiếu SRS |
|---|---|---|---|---|---|
| GET | `/api/inventory` | Danh sách tồn thực tế, giữ chỗ, khả dụng | Admin mọi kho; Manager/Staff kho phụ trách, thêm kho khác khi có `VIEW_OTHER_INVENTORY` | TODO | FR-INV-01/02; 2.4; 11.4 |
| GET | `/api/inventory/warehouses/{warehouseId}` | Tồn kho của một kho | Admin; Manager/Staff kho phụ trách hoặc có `VIEW_OTHER_INVENTORY` | TODO | FR-INV-01/02; 2.4; 11.4 |
| GET | `/api/inventory/warehouses/{warehouseId}/products/{productId}` | Tồn của một sản phẩm tại kho | Admin; Manager/Staff kho phụ trách hoặc có `VIEW_OTHER_INVENTORY` | TODO | FR-INV-01–03; 2.4; 11.4 |
| GET | `/api/inventory/movements` | Lịch sử biến động tồn/giữ chỗ | Admin mọi kho; Manager kho phụ trách; Staff không có quyền | TODO | FR-INV-11; 2.4; 11.4 |
| GET | `/api/inventory/in-transit` | Hàng đang vận chuyển theo transfer | **Cần chốt khi thiết kế chức năng**; SRS chưa quy định quyền riêng cho endpoint này | TODO | FR-INV-11; 11.4; AC-25 |
| POST | `/api/inventory/initial-balances` | Khởi tạo tồn cho cặp kho–sản phẩm | Admin mọi kho; Manager kho phụ trách và có `ADJUST_INVENTORY`; Staff không có quyền | TODO | FR-INV-09; 2.4; 11.4 |
| POST | `/api/inventory/adjustments` | Điều chỉnh tồn có lý do | Admin mọi kho; Manager kho phụ trách và có `ADJUST_INVENTORY`; Staff không có quyền | TODO | FR-INV-10; 2.4; 11.4 |

`VIEW_OTHER_INVENTORY` chỉ mở rộng quyền xem tồn kho, không cấp quyền xem phiếu, lịch sử biến động hoặc sửa tồn tại kho khác.

### 2.5. Transfer — 12 endpoint

| Method | Endpoint | Chức năng | Quyền/phạm vi kho | Trạng thái | Tham chiếu SRS |
|---|---|---|---|---|---|
| POST | `/api/transfers` | Tạo phiếu DRAFT nhiều sản phẩm | Admin mọi kho; Manager có kho nguồn hoặc đích là kho phụ trách; Staff không có quyền | TODO | FR-TR-01–03/12; 2.4; 11.5 |
| GET | `/api/transfers` | Danh sách/lọc phiếu | Admin mọi phiếu; Manager/Staff phiếu liên quan kho phụ trách | TODO | FR-TR-11; 2.4; 11.5 |
| GET | `/api/transfers/{id}` | Chi tiết phiếu | Admin mọi phiếu; Manager/Staff phiếu liên quan kho phụ trách | TODO | 2.4; 11.5 |
| PUT | `/api/transfers/{id}` | Sửa nội dung nháp | Chỉ DRAFT; Admin hoặc Manager có kho nguồn/đích là kho phụ trách; Staff không có quyền | TODO | FR-TR-12; 2.4; 11.5 |
| GET | `/api/transfers/{id}/history` | Lịch sử trạng thái phiếu | Admin mọi phiếu; Manager/Staff phiếu liên quan kho phụ trách | TODO | FR-TR-10; 2.4; 11.5 |
| POST | `/api/transfers/{id}/submit` | Gửi phiếu DRAFT → PENDING | Admin hoặc Manager có kho nguồn/đích là kho phụ trách; Staff không có quyền | TODO | FR-TR-04/12; 2.4; 11.5 |
| POST | `/api/transfers/{id}/approve` | Tiếp nhận duyệt và reserve toàn bộ dòng | Chỉ PENDING; Admin hoặc Manager phụ trách kho nguồn; không có thao tác tồn kho đang xử lý/phục hồi | TODO | FR-TR-06/13; FR-INV-04; 2.4; 11.5 |
| POST | `/api/transfers/{id}/cancel` | Hủy phiếu kèm lý do | DRAFT/PENDING: Admin hoặc Manager là người tạo và vẫn thuộc kho nguồn/đích; APPROVED: Admin hoặc Manager kho nguồn; Staff không có quyền | TODO | FR-TR-05/12/13; FR-INV-05; 2.4; 11.5 |
| POST | `/api/transfers/{id}/ship` | Tiếp nhận xuất đủ hàng | Chỉ APPROVED; Admin, Manager kho nguồn, hoặc Staff kho nguồn có `SHIP_TRANSFER` | TODO | FR-TR-07/13; FR-INV-06; 2.4; 11.5 |
| POST | `/api/transfers/{id}/receive` | Xác nhận nhận đủ hàng và cộng tồn kho đích | Chỉ SHIPPED; Admin, Manager kho đích, hoặc Staff kho đích có `RECEIVE_TRANSFER` | TODO | FR-TR-08/09/13; FR-INV-07; 2.4; 11.5 |
| GET | `/api/transfers/{id}/operations/{operationId}` | Tra trạng thái/kết quả operation | Theo quyền xem phiếu: Admin mọi phiếu; Manager/Staff phiếu liên quan kho phụ trách | TODO | FR-TR-13; 11.5/11.6 |
| POST | `/api/transfers/{id}/operations/{operationId}/recover` | Yêu cầu phục hồi cùng operation | Chỉ Admin; theo quy trình đối soát/phục hồi | TODO | FR-TR-13; 2.4; 7.3; 11.5 |

Sửa/tạo/submit phải kiểm tra kho và sản phẩm theo SRS. Manager có thể tự duyệt phiếu mình tạo khi có quyền kho nguồn. Backend chặn thao tác xung đột với operation PROCESSING/RECOVERY_REQUIRED; phiếu đã SHIPPED không được cancel trực tiếp. Receive phục hồi trên cùng operation khi chưa cộng hàng xong.

### 2.6. Quy ước khi thiết kế chi tiết

- Tạo transfer, submit, approve, cancel, ship, receive, khởi tạo và điều chỉnh tồn bắt buộc có `Idempotency-Key`; thử lại cùng thao tác giữ nguyên khóa. Xem [SRS mục 8](../SRS_Inventory_Warehouse_Transfer_System_VI.md#8-idempotency).
- Approve, cancel APPROVED, ship và receive trả `202 + operationId` sau khi lưu bền vững thao tác/outbox; 202 chưa xác nhận hoàn tất nghiệp vụ. Tra operation theo quyền xem phiếu, polling khi PROCESSING; xem [SRS 11.6](../SRS_Inventory_Warehouse_Transfer_System_VI.md#116-hợp-đồng-xử-lý-bất-đồng-bộ). Cancel DRAFT/PENDING xử lý đồng bộ.
- Danh sách transfer lọc theo trạng thái phiếu, kho nguồn/đích, ngày, sản phẩm và trạng thái operation. API danh sách dùng `page` từ 0, `size` mặc định 20/tối đa 100 và thứ tự ổn định; lọc theo quyền trước phân trang/tính tổng. Xem [SRS 11.7](../SRS_Inventory_Warehouse_Transfer_System_VI.md#117-quy-ước-api-chung).
- Logout là thao tác client; không bổ sung endpoint logout/refresh trong MVP. COMPLETED do Transfer tự chuyển sau result nhận hàng thành công, không có API complete thủ công.
- Reserve/release/ship/receive **stock** là command nội bộ từ Transfer đến Inventory qua RabbitMQ; API ship/receive trong bảng là hành động người dùng trên phiếu. Không expose API sửa stock nội bộ cho web/Android; xem [SRS mục 7](../SRS_Inventory_Warehouse_Transfer_System_VI.md#7-event-driven-communication).
- Chi tiết request/response, lỗi và message được bổ sung khi triển khai từng chức năng. OpenAPI Auth hiện chỉ chứa login và `/me`; danh mục này không khẳng định 37 endpoint TODO đã gọi được qua Gateway.

## 3. Đăng nhập

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

## 4. Tài khoản hiện hành

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

Response `200` gồm `id`, `username`, `email`, `role`, `assignedWarehouseId` (có thể null), `status` và `additionalPermissions`.

Gateway xác minh JWT sơ bộ; Auth xác minh lại và đọc trạng thái/quyền từ database. `/me` không trả password hash và có `Cache-Control: no-store`. Quyền bổ sung rỗng không làm mất quyền mặc định theo role.

## 5. Lỗi

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

## 6. Phiên và client

Yêu cầu MVP:

- Web giữ token trong bộ nhớ; tải lại trang cần đăng nhập.
- Android lưu token bằng SecureStore, không lưu mật khẩu.
- Logout xóa token/cache phía client; hiện không có endpoint logout/thu hồi token.
- `/me` trả 401: xóa phiên và yêu cầu đăng nhập lại.
- Lỗi mạng/server: giữ token, ghi rõ chưa xác nhận lại dữ liệu và cho thử lại.
- Android quay lại foreground phải tải lại `/me`; phản hồi đến muộn sau logout không được khôi phục tài khoản.
- Đổi tài khoản không hiển thị cache người dùng trước.

Phần cập nhật phiên theo vòng đời app đang triển khai; tiến độ nằm trong [kế hoạch](../plan.md).

## 7. Kiểm tra

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
