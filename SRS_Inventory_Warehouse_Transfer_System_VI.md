# SRS – Inventory & Warehouse Transfer System
## Hệ thống Quản lý Tồn kho và Điều chuyển Hàng hóa giữa các Kho

**Phiên bản:** 1.1  
**Ngày cập nhật:** 2026-09-17  
**Ngôn ngữ tài liệu:** Tiếng Việt  
**Kiến trúc dự kiến:** Microservices  
**Số lượng service chính:** 5  
**API Gateway:** Có  
**Môi trường triển khai:** Local / Docker Compose  
**Chi phí dịch vụ bên thứ ba:** Không bắt buộc  

**Thay đổi phiên bản 1.1:** Làm rõ phân quyền theo kho, tồn kho ban đầu và điều chỉnh tồn, tính nguyên tử khi giữ chỗ, thao tác bất đồng bộ, phục hồi lỗi và tiêu chí nghiệm thu. Các quy tắc được chốt trong tài liệu này là phạm vi MVP; các lựa chọn triển khai không làm thay đổi quy tắc nghiệp vụ.

---

# 1. Giới thiệu

## 1.1. Mục đích tài liệu

Tài liệu Software Requirements Specification (SRS) này mô tả các yêu cầu chức năng và phi chức năng của hệ thống **Inventory & Warehouse Transfer System**.

Hệ thống được xây dựng nhằm hỗ trợ một doanh nghiệp có nhiều kho hàng trong việc:

- Quản lý danh mục sản phẩm.
- Quản lý thông tin các kho.
- Theo dõi số lượng tồn kho của từng sản phẩm tại từng kho.
- Tạo và xử lý yêu cầu điều chuyển hàng hóa giữa các kho.
- Kiểm soát số lượng hàng khả dụng và hàng đang được giữ chỗ.
- Theo dõi trạng thái của các phiếu chuyển kho.
- Quản lý quyền truy cập của người dùng.
- Ghi nhận lịch sử các thao tác quan trọng.

Hệ thống được thiết kế theo kiến trúc **Microservices** nhằm tách biệt các nghiệp vụ chính và hỗ trợ khả năng mở rộng độc lập.

---

## 1.2. Phạm vi hệ thống

Hệ thống phục vụ cho các doanh nghiệp có từ hai kho hàng trở lên.

Ví dụ:

- Kho TP.HCM.
- Kho Hà Nội.
- Kho Đà Nẵng.

Mỗi kho có thể lưu nhiều sản phẩm khác nhau với số lượng tồn kho riêng.

Khi một kho thiếu hàng, người dùng có quyền có thể tạo yêu cầu chuyển một số lượng sản phẩm từ kho khác sang kho cần bổ sung.

Hệ thống hỗ trợ quy trình:

```text
DRAFT
  ↓
PENDING
  ↓
APPROVED
  ↓
SHIPPED
  ↓
RECEIVED
  ↓
COMPLETED
```

Yêu cầu chuyển kho có thể bị hủy ở một số trạng thái hợp lệ:

```text
DRAFT / PENDING / APPROVED
            ↓
        CANCELLED
```

---

## 1.3. Mục tiêu của hệ thống

Hệ thống cần giải quyết các vấn đề sau:

1. Xác định chính xác sản phẩm đang nằm ở kho nào.
2. Xác định số lượng tồn kho thực tế.
3. Tránh điều chuyển số lượng hàng lớn hơn số lượng thực tế có thể sử dụng.
4. Tránh việc nhiều yêu cầu cùng sử dụng một lượng tồn kho.
5. Theo dõi đầy đủ quá trình chuyển hàng giữa các kho.
6. Phân quyền người dùng theo vai trò.
7. Đảm bảo dữ liệu giữa các microservice có thể đồng bộ theo cơ chế event-driven.
8. Cho phép frontend chỉ giao tiếp thông qua một API Gateway duy nhất.

---

# 2. Đối tượng sử dụng

## 2.1. Admin

Admin có quyền quản trị toàn hệ thống.

Chức năng chính:

- Quản lý tài khoản người dùng.
- Gán vai trò và quyền bổ sung cho người dùng.
- Quản lý sản phẩm.
- Quản lý kho.
- Xem toàn bộ tồn kho.
- Xem toàn bộ phiếu chuyển kho.
- Xem lịch sử hoạt động.

---

## 2.2. Warehouse Manager

Warehouse Manager là người quản lý kho.

Chức năng chính:

- Xem tồn kho của kho được phân công.
- Xem tồn kho của các kho khác nếu được cấp quyền.
- Tạo yêu cầu chuyển kho.
- Phê duyệt yêu cầu chuyển kho.
- Cập nhật trạng thái xuất hàng.
- Xác nhận nhận hàng.
- Xem lịch sử chuyển kho.

---

## 2.3. Warehouse Staff

Warehouse Staff là nhân viên kho.

Chức năng chính:

- Xem danh sách sản phẩm.
- Xem tồn kho.
- Xem phiếu chuyển kho liên quan đến kho của mình.
- Xác nhận xuất hàng nếu được phân quyền; MVP không có bước đóng gói riêng.
- Xác nhận nhận hàng nếu được phân quyền.

---

## 2.4. Ma trận quyền và phạm vi kho trong MVP

Mỗi Manager hoặc Staff được phân công đúng một kho đang hoạt động. Admin không bắt buộc có kho phụ trách. Quyền được kiểm tra tại service sở hữu nghiệp vụ, bao gồm cả vai trò, quyền bổ sung và kho liên quan; không chỉ kiểm tra tại Gateway hoặc frontend.

| Thao tác | Admin | Warehouse Manager | Warehouse Staff |
|---|---|---|---|
| Quản lý tài khoản, sản phẩm, kho | Toàn hệ thống | Không | Không |
| Xem sản phẩm, danh sách kho hoạt động | Có | Có | Có |
| Xem tồn kho | Toàn hệ thống | Kho được phân công; kho khác khi có `VIEW_OTHER_INVENTORY` | Kho được phân công; kho khác khi có `VIEW_OTHER_INVENTORY` |
| Tạo, sửa nháp, submit transfer | Mọi kho | Phiếu có kho nguồn hoặc đích là kho được phân công | Không |
| Approve transfer | Mọi kho | Kho nguồn là kho được phân công | Không |
| Cancel DRAFT/PENDING | Mọi phiếu | Người tạo phiếu và vẫn thuộc kho nguồn hoặc đích | Không |
| Cancel APPROVED | Mọi phiếu | Kho nguồn là kho được phân công | Không |
| Ship transfer | Mọi kho | Kho nguồn là kho được phân công | Kho nguồn là kho được phân công và có `SHIP_TRANSFER` |
| Receive transfer | Mọi kho | Kho đích là kho được phân công | Kho đích là kho được phân công và có `RECEIVE_TRANSFER` |
| Xem phiếu và lịch sử phiếu | Toàn hệ thống | Phiếu liên quan đến kho được phân công | Phiếu liên quan đến kho được phân công |
| Khởi tạo/điều chỉnh tồn kho | Mọi kho | Kho được phân công và có `ADJUST_INVENTORY` | Không |
| Xem lịch sử biến động tồn kho | Toàn hệ thống | Kho được phân công | Không |
| Kiểm tra và yêu cầu phục hồi thao tác lỗi | Có | Không | Không |

Admin quản lý các quyền bổ sung. Quyền xem tồn kho khác không tự cấp quyền xem phiếu hoặc thay đổi tồn kho của kho khác. MVP cho phép Manager tự duyệt phiếu mình tạo nếu có quyền tại kho nguồn; chưa áp dụng quy tắc bắt buộc hai người độc lập.

---

# 3. Kiến trúc tổng quan

## 3.1. Kiến trúc đề xuất

```text
                     Frontend
                        │
                        ▼
                  API Gateway
                        │
        ┌───────────────┼─────────────────┐
        │               │                 │
        ▼               ▼                 ▼
   Auth Service    Product Service   Warehouse Service
        │               │                 │
        └───────────────┐│┌────────────────┘
                        ▼▼
                Inventory Service
                        │
                        │ Commands / Results / Events
                        ▼
                    RabbitMQ
                        ▲
                        │
                 Transfer Service
```

Trong thực tế, các service có thể trao đổi dữ liệu bằng cả:

- REST API đồng bộ.
- Message Broker bất đồng bộ.

Gateway định tuyến tới cả năm service. Sơ đồ trên không biểu diễn đầy đủ các route. Trong MVP, các thao tác tồn kho của transfer sử dụng command/result qua RabbitMQ theo mục 7; REST phục vụ truy vấn, quản lý danh mục và tiếp nhận yêu cầu từ người dùng.

---

## 3.2. Danh sách Microservice

### 3.2.1. Auth/User Service

Trách nhiệm:

- Đăng nhập.
- Quản lý người dùng.
- Gán role và quyền bổ sung.
- Sinh JWT Access Token.
- Xác thực và phân quyền.

---

### 3.2.2. Product Service

Trách nhiệm:

- Quản lý sản phẩm.
- Quản lý SKU.
- Quản lý category.
- Quản lý đơn vị tính.
- Quản lý trạng thái hoạt động của sản phẩm.

---

### 3.2.3. Warehouse Service

Trách nhiệm:

- Quản lý kho.
- Quản lý tên kho.
- Quản lý vị trí kho.
- Quản lý trạng thái hoạt động của kho.

---

### 3.2.4. Inventory Service

Trách nhiệm:

- Theo dõi số lượng sản phẩm tại từng kho.
- Theo dõi số lượng đã được giữ chỗ.
- Tính số lượng khả dụng.
- Reserve stock khi transfer được duyệt.
- Release stock nếu transfer bị hủy.
- Trừ tồn kho kho nguồn khi hàng được xác nhận xuất.
- Cộng tồn kho kho đích khi hàng được xác nhận nhận.

---

### 3.2.5. Transfer Service

Trách nhiệm:

- Tạo phiếu chuyển kho.
- Quản lý các sản phẩm trong phiếu chuyển.
- Quản lý workflow trạng thái.
- Gửi event liên quan đến chuyển kho.
- Theo dõi lịch sử trạng thái của transfer.

---

# 4. API Gateway

## 4.1. Vai trò

Frontend không gọi trực tiếp từng microservice.

Frontend chỉ giao tiếp với:

```text
http://localhost:8080
```

API Gateway chịu trách nhiệm:

- Routing request.
- Authentication.
- Authorization sơ bộ.
- CORS.
- Logging.
- Rate limiting nếu cần.
- Ẩn địa chỉ nội bộ của từng service.

---

## 4.2. Ví dụ routing

```text
/api/auth/**
→ Auth Service

/api/users/**
→ Auth Service

/api/products/**
→ Product Service

/api/warehouses/**
→ Warehouse Service

/api/inventory/**
→ Inventory Service

/api/transfers/**
→ Transfer Service
```

---

# 5. Yêu cầu chức năng

# 5.1. Auth/User Service

## FR-AUTH-01 – Đăng nhập

Người dùng phải có thể đăng nhập bằng:

- Username hoặc email.
- Password.

Sau khi đăng nhập thành công, hệ thống trả về JWT Access Token.

---

## FR-AUTH-02 – Phân quyền

Hệ thống phải hỗ trợ tối thiểu các role:

- ADMIN.
- WAREHOUSE_MANAGER.
- WAREHOUSE_STAFF.

MVP sử dụng cố định ba role trên, mỗi tài khoản có một role; không có chức năng tạo role tùy biến. Quyền bổ sung được gán theo danh sách tại mục 2.4.

---

## FR-AUTH-03 – Quản lý người dùng

Admin có thể:

- Tạo người dùng.
- Cập nhật người dùng.
- Disable người dùng.
- Gán role.
- Gán kho phụ trách.
- Gán hoặc thu hồi các quyền bổ sung trong mục 2.4.

Tài khoản bị disable không được đăng nhập hoặc tiếp tục thực hiện thao tác nghiệp vụ. Service phải kiểm tra trạng thái và quyền hiện hành của người dùng khi tiếp nhận thao tác; không chỉ dựa vào quyền cũ trong JWT. Mỗi bản cài đặt phải có cách khởi tạo Admin đầu tiên từ cấu hình local, không hardcode mật khẩu trong mã nguồn.

---

# 5.2. Product Service

## FR-PRODUCT-01 – Tạo sản phẩm

Admin có thể tạo sản phẩm mới.

Thông tin tối thiểu:

- Product ID.
- SKU.
- Name.
- Category.
- Unit.
- Description.
- Status.

---

## FR-PRODUCT-02 – SKU duy nhất

Mỗi sản phẩm phải có một SKU duy nhất.

Ví dụ:

```text
LAP-DELL-001
KEY-LOGI-001
MOUSE-LOGI-002
```

---

## FR-PRODUCT-03 – Cập nhật sản phẩm

Admin có thể chỉnh sửa:

- Tên.
- Category.
- Unit.
- Description.
- Status.

SKU không được thay đổi trong MVP. SKU được trim và chuẩn hóa thành chữ hoa trước khi kiểm tra duy nhất. Đơn vị tính không được thay đổi sau khi đã có bản ghi tồn kho hoặc giao dịch. Category và Unit là thuộc tính danh mục trong MVP, chưa yêu cầu module CRUD riêng.

---

## FR-PRODUCT-04 – Tìm kiếm sản phẩm

Người dùng có thể tìm kiếm theo:

- SKU.
- Tên.
- Category.

---

# 5.3. Warehouse Service

## FR-WH-01 – Tạo kho

Admin có thể tạo kho mới.

Thông tin:

- Warehouse ID.
- Warehouse Code.
- Name.
- Address.
- Status.

---

## FR-WH-02 – Cập nhật kho

Admin có thể:

- Cập nhật tên.
- Cập nhật địa chỉ.
- Disable kho.

Kho đã phát sinh giao dịch không được xóa vật lý khỏi hệ thống.

Warehouse Code là duy nhất, được trim và chuẩn hóa thành chữ hoa; không được thay đổi trong MVP. Các quy tắc vô hiệu hóa kho và sản phẩm được mô tả tại BR-16.

---

## FR-WH-03 – Xem danh sách kho

Người dùng có quyền có thể xem danh sách kho đang hoạt động.

---

# 5.4. Inventory Service

## FR-INV-01 – Quản lý tồn kho

Hệ thống phải lưu số lượng sản phẩm tại từng kho.

Một bản ghi tồn kho gồm:

- warehouse_id.
- product_id.
- quantity.
- reserved_quantity.

---

## FR-INV-02 – Tính available quantity

Hệ thống phải tính:

```text
available_quantity = quantity - reserved_quantity
```

Ví dụ:

```text
quantity = 100
reserved_quantity = 30

available_quantity = 70
```

---

## FR-INV-03 – Kiểm tra tồn kho

Trước khi approve transfer, hệ thống phải đảm bảo:

```text
available_quantity >= requested_quantity
```

Nếu không đủ hàng, yêu cầu approve phải thất bại.

---

## FR-INV-04 – Reserve stock

Khi một transfer được duyệt, Inventory Service phải giữ chỗ số lượng hàng tương ứng.

Ví dụ:

```text
quantity = 100
reserved = 0

Approve transfer 40

quantity = 100
reserved = 40
available = 60
```

---

## FR-INV-05 – Release stock

Nếu transfer bị hủy trước khi xuất hàng, lượng hàng đã reserve phải được trả lại.

Ví dụ:

```text
quantity = 100
reserved = 40
```

Sau cancel:

```text
quantity = 100
reserved = 0
```

---

## FR-INV-06 – Cập nhật khi xuất kho

Khi transfer chuyển sang trạng thái SHIPPED:

```text
source.quantity -= transfer_quantity
source.reserved_quantity -= transfer_quantity
```

---

## FR-INV-07 – Cập nhật khi nhận hàng

Sau khi transfer được xác nhận RECEIVED, Inventory xử lý command ReceiveStock để cộng kho đích:

```text
destination.quantity += transfer_quantity
```

Việc cộng kho thực hiện bất đồng bộ và phải hoàn tất trước khi Transfer chuyển COMPLETED.

---

## FR-INV-08 – Low stock

Hệ thống có thể hỗ trợ ngưỡng tồn kho tối thiểu:

```text
minimum_stock_level
```

Nếu:

```text
available_quantity < minimum_stock_level
```

sản phẩm được đánh dấu là LOW STOCK.

Đây là chức năng tùy chọn trong phiên bản đầu.

---

## FR-INV-09 – Khởi tạo tồn kho

Người dùng có quyền theo mục 2.4 có thể khởi tạo tồn kho cho một cặp kho–sản phẩm đang hoạt động chưa có bản ghi Inventory.

- Số lượng ban đầu là số nguyên không âm; `reserved_quantity = 0`.
- Bắt buộc ghi lý do, người thao tác và thời gian; số lượng ban đầu được ghi vào lịch sử biến động.
- Nếu bản ghi đã tồn tại, trả `409 INVENTORY_ALREADY_EXISTS`; không ghi đè số dư.
- Cặp kho–sản phẩm chưa có bản ghi được hiểu là tồn bằng 0 khi kiểm tra khả dụng. Inventory tự tạo bản ghi khi nhận hàng lần đầu, bảo đảm ràng buộc duy nhất khi có thao tác đồng thời.

## FR-INV-10 – Điều chỉnh tồn kho

Người dùng có quyền có thể tạo điều chỉnh bằng `delta`, là số nguyên khác 0, kèm lý do bắt buộc. Điều chỉnh chỉ áp dụng cho bản ghi Inventory đã tồn tại tại kho và sản phẩm đang hoạt động.

- Số dư sau điều chỉnh phải không âm và không nhỏ hơn số lượng đã giữ chỗ.
- Điều chỉnh không được trực tiếp sửa `reserved_quantity`.
- Cập nhật số dư và ghi lịch sử phải nằm trong cùng một transaction của Inventory Service.
- Nhập ban đầu và điều chỉnh phải hỗ trợ idempotency theo mục 8.
- MVP chưa hỗ trợ quy trình phê duyệt điều chỉnh hoặc nghiệp vụ mua hàng.

## FR-INV-11 – Lịch sử biến động và hàng đang vận chuyển

Mọi thay đổi tồn kho/giữ chỗ phải có bản ghi bất biến, chứa kho, sản phẩm, loại nghiệp vụ, mức tăng/giảm `quantity` và `reserved_quantity`, số dư trước/sau, tham chiếu transfer hoặc adjustment, người thao tác và thời gian. Không cho sửa/xóa lịch sử qua API nghiệp vụ.

Hệ thống phải hiển thị lượng hàng đang vận chuyển theo transfer: hàng đã trừ khỏi kho nguồn nhưng chưa được ghi nhận vào kho đích. Số liệu này dựa trên kết quả xử lý stock của Inventory, không chỉ dựa trên trạng thái transfer có thể đang đồng bộ chậm. Chuyển kho không làm thay đổi tổng `tồn tại các kho + hàng đang vận chuyển`; nhập ban đầu và điều chỉnh được tính riêng.

---

# 5.5. Transfer Service

## FR-TR-01 – Tạo transfer

Người dùng có quyền có thể tạo phiếu chuyển kho.

Thông tin:

- Source Warehouse.
- Destination Warehouse.
- Danh sách sản phẩm.
- Quantity của từng sản phẩm.
- Note.

---

## FR-TR-02 – Kho nguồn và kho đích khác nhau

Không được phép tạo transfer nếu:

```text
source_warehouse_id == destination_warehouse_id
```

---

## FR-TR-03 – Một transfer có nhiều sản phẩm

Một phiếu chuyển có thể chứa nhiều sản phẩm.

Ví dụ:

```text
TR-2026-0001

HCM → Hanoi

Laptop × 10
Keyboard × 20
Mouse × 50
```

---

## FR-TR-04 – Workflow trạng thái

Transfer phải tuân theo workflow:

```text
DRAFT
  ↓
PENDING
  ↓
APPROVED
  ↓
SHIPPED
  ↓
RECEIVED
  ↓
COMPLETED
```

---

## FR-TR-05 – Hủy transfer

Transfer chỉ được hủy khi đang ở một trong các trạng thái:

- DRAFT.
- PENDING.
- APPROVED.

Transfer đã SHIPPED không được phép cancel trực tiếp.

---

## FR-TR-06 – Approve transfer

Chỉ chấp nhận approve khi phiếu ở PENDING và không có thao tác tồn kho đang chờ xử lý/phục hồi.

1. Transfer Service lưu thao tác approve và command giữ chỗ trong cùng transaction với outbox.
2. Inventory Service kiểm tra và reserve toàn bộ các dòng trong một transaction cục bộ.
3. Chỉ sau khi nhận kết quả reserve thành công, Transfer Service chuyển phiếu sang APPROVED.
4. Nếu thiếu hàng ở bất kỳ dòng nào, không reserve dòng nào; phiếu vẫn PENDING và thao tác trả kết quả `FAILED / INSUFFICIENT_INVENTORY`.

Trong thời gian chờ kết quả, phiếu vẫn PENDING và có thông tin thao tác `PROCESSING`. Hợp đồng API bất đồng bộ được mô tả tại mục 11.6.

---

## FR-TR-07 – Ship transfer

Chỉ transfer ở trạng thái APPROVED mới có thể chuyển sang SHIPPED.

Transfer Service gửi command xuất hàng. Chỉ chuyển sang SHIPPED sau khi Inventory xác nhận xử lý thành công. Khi đó:

- Kho nguồn giảm stock.
- Reserved stock giảm tương ứng.

---

## FR-TR-08 – Receive transfer

Chỉ transfer ở trạng thái SHIPPED mới có thể chuyển sang RECEIVED.

Khi tiếp nhận xác nhận nhận hàng hợp lệ, Transfer Service ghi trạng thái RECEIVED, lịch sử và command nhận hàng vào outbox trong cùng transaction. RECEIVED có nghĩa là người dùng đã xác nhận nhận đủ hàng; việc cộng kho đích có thể đang chờ xử lý.

Inventory Service xử lý command để cộng toàn bộ số lượng vào kho đích một lần. MVP chỉ hỗ trợ xuất đủ và nhận đủ toàn bộ phiếu, không hỗ trợ chia chuyến hoặc nhận thiếu/hỏng.

---

## FR-TR-09 – Complete transfer

Sau khi nhận kết quả cộng tồn kho đích thành công, Transfer Service tự chuyển RECEIVED sang COMPLETED và ghi lịch sử. Đây là bước tự động, không có thao tác complete thủ công.

Nếu chưa cộng tồn kho thành công, phiếu giữ trạng thái RECEIVED kèm trạng thái xử lý/lỗi. Không hiển thị COMPLETED chỉ vì đã gửi message.

---

## FR-TR-10 – Theo dõi lịch sử trạng thái

Hệ thống phải lưu lịch sử:

- Trạng thái cũ.
- Trạng thái mới.
- Người thao tác.
- Thời gian.
- Ghi chú.

---

## FR-TR-11 – Xem danh sách transfer

Người dùng có thể lọc theo:

- Source warehouse.
- Destination warehouse.
- Status.
- Date.
- Product.

## FR-TR-12 – Sửa và kiểm tra transfer

- Phiếu mới ở DRAFT; tối thiểu một dòng sản phẩm.
- Chỉ sửa kho nguồn, kho đích, sản phẩm, số lượng và note khi DRAFT. PENDING trở đi khóa nội dung; muốn thay đổi phải hủy theo quyền và tạo phiếu mới.
- Mỗi sản phẩm xuất hiện tối đa một lần trong phiếu; dòng trùng bị từ chối.
- Kho và sản phẩm phải tồn tại, đang hoạt động khi tạo/sửa, submit và approve.
- Submit chỉ cho phép DRAFT → PENDING. Không có trạng thái REJECTED hoặc chức năng trả về DRAFT trong MVP; dùng cancel kèm lý do khi từ chối.
- Không cung cấp API xóa vật lý transfer trong MVP. Cancel bắt buộc có lý do.
- Cancel DRAFT/PENDING không gọi release vì chưa có giữ chỗ thành công; không chấp nhận cancel nếu approve đang PROCESSING/RECOVERY_REQUIRED.
- Cancel APPROVED chỉ chuyển sang CANCELLED sau khi Inventory xác nhận release thành công.

## FR-TR-13 – Theo dõi thao tác đang xử lý

Mỗi thao tác approve, cancel APPROVED, ship hoặc receive có một `operation_id`, loại thao tác và trạng thái `PROCESSING`, `SUCCEEDED`, `FAILED` hoặc `RECOVERY_REQUIRED`. Trạng thái thao tác độc lập với trạng thái nghiệp vụ của transfer.

- Mỗi transfer chỉ có tối đa một thao tác tồn kho chưa giải quyết xong. Request nghiệp vụ cạnh tranh trả `409 OPERATION_IN_PROGRESS`; request lặp cùng khóa trả lại thao tác cũ.
- Lỗi nghiệp vụ xác định được, chưa làm thay đổi tồn kho, kết thúc thao tác ở FAILED; người dùng có thể thử lại bằng thao tác mới sau khi khắc phục nguyên nhân.
- Timeout, mất kết nối hoặc hết retry mà chưa xác định được kết quả phải chuyển RECOVERY_REQUIRED, không coi là thất bại nghiệp vụ và không mở khóa transfer.
- Riêng receive đã chuyển RECEIVED thì mọi lỗi chưa cộng hàng xong phải được phục hồi trên cùng thao tác; không tạo một lần receive mới.
- Kết quả FAILED chỉ là kết quả nghiệp vụ cuối cùng khi bảo đảm không có tác động tồn kho và trạng thái transfer vẫn cho phép người dùng sửa nguyên nhân/thử lại. Với receive, lỗi cần sửa nguyên nhân được ghi là RECOVERY_REQUIRED; khi chưa có kết quả commit thành công, cơ chế phục hồi phải cho phép xử lý tiếp cùng operation, không lưu một kết quả thất bại cuối cùng chặn mọi lần phục hồi.
- Frontend hiển thị trạng thái đang xử lý/lỗi và vô hiệu hóa các nút xung đột. Backend vẫn bắt buộc tự kiểm tra.

---

# 6. Business Rules

## BR-01

Số lượng chuyển phải lớn hơn 0.

---

## BR-02

Kho nguồn và kho đích không được giống nhau.

---

## BR-03

Không được approve transfer nếu tồn kho khả dụng không đủ.

---

## BR-04

Một lượng hàng đã reserve không được sử dụng cho transfer khác.

---

## BR-05

Chỉ được chỉnh sửa nội dung transfer khi ở DRAFT theo FR-TR-12.

---

## BR-06

Transfer đã SHIPPED không được xóa.

---

## BR-07

Transfer đã COMPLETED chỉ được xem lịch sử, không chỉnh sửa.

---

## BR-08

Mọi thay đổi liên quan đến số lượng tồn kho phải được ghi nhận.

---

## BR-09

Không xóa vật lý Product hoặc Warehouse đã từng phát sinh giao dịch.

Thay vào đó sử dụng:

```text
status = INACTIVE
```

---

## BR-10

Mỗi sự kiện cập nhật inventory phải có cơ chế chống xử lý trùng.

---

## BR-11 – Bất biến tồn kho

Luôn bảo đảm `quantity >= 0`, `reserved_quantity >= 0` và `reserved_quantity <= quantity`. MVP chỉ hỗ trợ số lượng nguyên theo đơn vị đếm; chưa hỗ trợ hàng cân/đo có số lượng thập phân. Số lượng đầu vào phải được kiểm tra giới hạn kiểu dữ liệu để tránh tràn số.

## BR-12 – Tính nguyên tử và xử lý đồng thời

Kiểm tra khả dụng và reserve phải thực hiện nguyên tử trong Inventory Service, không tách thành đọc số dư rồi cập nhật không có bảo vệ đồng thời. Mọi dòng của một thao tác reserve/release/ship/receive phải cùng thành công hoặc cùng rollback. Điều chỉnh tồn và các thao tác transfer đồng thời vẫn phải bảo toàn BR-11.

## BR-13 – Giữ chỗ thuộc về transfer

Giữ chỗ phải được quản lý theo transfer và sản phẩm. Ship/release chỉ sử dụng đúng giữ chỗ của transfer đó, không được lấy phần giữ chỗ của phiếu khác. Không release lại giữ chỗ đã SHIPPED hoặc RELEASED; request lặp hợp lệ trả kết quả cũ.

## BR-14 – Tranh chấp trạng thái

Kiểm tra trạng thái transfer và nhận một thao tác mới phải nguyên tử. Nếu ship và cancel đến đồng thời, chỉ một thao tác được chấp nhận; thao tác còn lại không được gây tác động tồn kho.

## BR-15 – Tính duy nhất

Ngoài SKU, các trường `warehouse.code`, `transfer.transfer_code`, `user.username` và `user.email` phải duy nhất. Username/email được trim và so sánh không phân biệt hoa thường trong MVP. Mỗi transfer có tối đa một dòng cho mỗi sản phẩm.

## BR-16 – Vô hiệu hóa danh mục

Không cho vô hiệu hóa sản phẩm/kho nếu còn tồn kho, giữ chỗ, transfer chưa kết thúc (DRAFT/PENDING/APPROVED/SHIPPED/RECEIVED), hoặc thao tác chưa giải quyết liên quan. Trả `409 RESOURCE_IN_USE` và thông tin tham chiếu để người dùng xử lý trước.

Kiểm tra điều kiện và chặn giao dịch mới phải có phối hợp giữa các service để tránh race với tạo/sửa/submit/approve hoặc khởi tạo/điều chỉnh tồn. Khi không thể xác minh điều kiện do service không khả dụng, từ chối vô hiệu hóa và cho thử lại; không mặc định coi tài nguyên là không được sử dụng. Thiết kế kỹ thuật phải mô tả cơ chế chặn và phục hồi này. Dữ liệu INACTIVE vẫn hiển thị trong lịch sử; có thể kích hoạt lại.

---

# 7. Event-driven Communication

RabbitMQ là thành phần bắt buộc của MVP. Transfer Service điều phối các thao tác tồn kho bằng command và nhận result từ Inventory Service. Không đồng thời dùng REST và event để thực hiện cùng một thay đổi tồn kho.

## 7.1. Command, result và domain event

| Command từ Transfer | Xử lý tại Inventory | Kết quả thành công | Chuyển trạng thái tại Transfer |
|---|---|---|---|
| `ReserveStock` | Kiểm tra và giữ chỗ toàn bộ phiếu | `StockReserved` | PENDING → APPROVED |
| `ReleaseStock` | Giải phóng đúng giữ chỗ của phiếu | `StockReleased` | APPROVED → CANCELLED |
| `ShipStock` | Trừ quantity và reserved tại kho nguồn | `StockShipped` | APPROVED → SHIPPED |
| `ReceiveStock` | Cộng quantity tại kho đích | `StockReceived` | RECEIVED → COMPLETED |

Lỗi nghiệp vụ được trả bằng `InventoryOperationFailed` với `operationId`, `code` và chi tiết các dòng lỗi. Lỗi tạm thời được retry theo mục 7.3, không phát kết quả thất bại nghiệp vụ khi chưa biết transaction đã commit hay chưa.

Các domain event `TransferApproved`, `TransferCancelled`, `TransferShipped`, `TransferReceived`, `TransferCompleted` chỉ thông báo trạng thái đã được Transfer lưu thành công; **không kích hoạt reserve/release/trừ/cộng stock lần nữa**. `InventoryUpdated` phục vụ mở rộng audit/dashboard; audit bắt buộc của MVP được lưu ngay trong transaction cập nhật Inventory.

## 7.2. Hợp đồng message

Mọi command/result/event có tối thiểu `eventId` (ID message), `eventType`, `schemaVersion`, `operationId` nếu thuộc một thao tác, `transferId` nếu liên quan transfer, `correlationId`, `occurredAt` theo UTC có hậu tố `Z`, và `payload`. Command mang thêm người khởi tạo đã được xác thực, phiên bản transfer, kho nguồn/đích và toàn bộ dòng hàng bất biến của thao tác.

```json
{
  "eventId": "36d33f1b-e711-4caf-a5c8-0db56d742191",
  "eventType": "ReserveStock",
  "schemaVersion": 1,
  "operationId": "7beabcc9-e835-4cfc-a42c-d3890489c044",
  "transferId": "TR-2026-001",
  "correlationId": "req-001",
  "occurredAt": "2026-09-17T10:00:00Z",
  "payload": {
    "actorId": "U001",
    "transferVersion": 2,
    "sourceWarehouseId": "WH001",
    "destinationWarehouseId": "WH002",
    "items": [{ "productId": "P001", "quantity": 20 }]
  }
}
```

## 7.3. Giao nhận tin cậy và phục hồi

- Transfer lưu thao tác/trạng thái, lịch sử và outbox trong cùng transaction DB. Inventory lưu kết quả xử lý, bản ghi chống trùng, số dư, reservation, lịch sử và result outbox trong cùng transaction DB.
- Publisher gửi lại outbox chưa xác nhận; consumer chỉ ACK sau khi transaction commit. Queue phải durable và message phải persistent.
- Transfer áp dụng result và ghi lịch sử/trạng thái/outbox trong cùng transaction, có chống trùng. Result phải khớp operation đang chờ và loại thao tác; không làm lùi trạng thái khi message cũ đến muộn.
- Inventory kiểm tra vòng đời reservation và các thao tác đã xử lý; không giả định message luôn đến đúng thứ tự. Message thiếu điều kiện tiên quyết không được làm thay đổi tồn kho và phải được đưa vào quy trình retry/phục hồi.
- Mặc định retry lỗi tạm thời tối đa 5 lần sau lần đầu, có backoff và cấu hình được; sau đó chuyển dead-letter queue (DLQ), ghi lý do và đánh dấu thao tác cần phục hồi. Không retry vô hạn.
- Có cơ chế đối soát định kỳ và thao tác phục hồi cho Admin: tra cứu kết quả theo `operationId`, đồng bộ lại result nếu Inventory đã commit, hoặc gửi lại command với cùng operation nếu chưa xử lý. Mặc định một thao tác chờ quá 60 giây cần được đối soát; thời gian này cấu hình được và không phải bằng chứng thất bại.
- Nếu reserve đã commit nhưng Transfer chưa ghi APPROVED, phải giữ trạng thái chờ/phục hồi và áp dụng lại kết quả để hoàn tất approve. Không tự giải phóng giữ chỗ chỉ vì HTTP timeout. Sau khi approve được khôi phục, người dùng có thể cancel theo quy trình.
- Không sửa trực tiếp database để hoàn tất nghiệp vụ thông thường. Mọi yêu cầu phục hồi của Admin phải được audit.

---

# 8. Idempotency

Do message broker có thể gửi lại cùng một message nhiều lần, consumer phải đảm bảo cùng một event không bị xử lý hai lần.

Ví dụ:

```text
eventId = 123
```

Inventory Service phải lưu danh sách event đã xử lý.

Nếu event `123` được gửi lại:

```text
Ignore duplicate event
```

Mục đích:

Tránh trường hợp:

```text
TransferReceived
```

bị xử lý hai lần và kho đích được cộng stock hai lần.

Ngoài `eventId`, Inventory phải lưu kết quả duy nhất theo `operationId`; gửi lại một command cùng operation nhưng khác message ID vẫn không làm thay đổi stock lần nữa. Khóa nghiệp vụ và vòng đời reservation phải ngăn một transfer bị ship hoặc receive hai lần ngay cả khi có operation ID khác.

Các API tạo transfer, submit, approve, cancel, ship, receive, khởi tạo và điều chỉnh tồn kho bắt buộc nhận header `Idempotency-Key`.

- Cùng người dùng, endpoint và key với payload giống nhau trả cùng resource/operation và kết quả hiện hành.
- Tái sử dụng key với payload khác trả `409 IDEMPOTENCY_KEY_REUSED`.
- Tiếp nhận key và tạo tác động nghiệp vụ/thao tác phải nguyên tử, bao gồm khi hai request đến đồng thời.
- Gửi lại request/message không được tạo thêm lịch sử nghiệp vụ hoặc biến động tồn kho.
- Dữ liệu idempotency, operation và processed message được lưu bền vững qua restart; MVP không tự động xóa các khóa này.

---

# 9. Dữ liệu chính

## 9.1. User

```text
User
----
id
username
email
password_hash
role
assigned_warehouse_id
additional_permissions
status
created_at
updated_at
```

---

## 9.2. Product

```text
Product
-------
id
sku
name
category
unit
description
status
created_at
updated_at
```

---

## 9.3. Warehouse

```text
Warehouse
---------
id
code
name
address
status
created_at
updated_at
```

---

## 9.4. Inventory

```text
Inventory
---------
id
warehouse_id
product_id
quantity
reserved_quantity
minimum_stock_level
version
updated_at
```

Ràng buộc:

```text
UNIQUE(warehouse_id, product_id)
```

---

## 9.5. Transfer

```text
Transfer
--------
id
transfer_code
source_warehouse_id
destination_warehouse_id
status
version
current_operation_id
created_by
approved_by
shipped_by
received_by
cancelled_by
created_at
approved_at
shipped_at
received_at
completed_at
cancelled_at
cancel_reason
note
```

---

## 9.6. Transfer Item

```text
TransferItem
------------
id
transfer_id
product_id
quantity
```

Ràng buộc: `UNIQUE(transfer_id, product_id)` và `quantity > 0`.

---

## 9.7. Transfer History

```text
TransferHistory
---------------
id
transfer_id
old_status
new_status
changed_by
operation_id
note
changed_at
```

`changed_by` có thể là actor hệ thống cho bước COMPLETED tự động; `operation_id` truy ngược người xác nhận nhận hàng. Các thời điểm trong DB/API sử dụng UTC; frontend hiển thị theo múi giờ người dùng.

## 9.8. Stock Reservation — Inventory DB

```text
StockReservation
----------------
id
transfer_id
product_id
source_warehouse_id
quantity
status                 # RESERVED / RELEASED / SHIPPED
reserve_operation_id
last_operation_id
created_at
updated_at
```

Ràng buộc: `UNIQUE(transfer_id, product_id)`. Reservation đã release hoặc ship được giữ lại để audit và chống lặp. Không có tự động hết hạn giữ chỗ trong MVP.

## 9.9. Stock Movement và Inventory Adjustment — Inventory DB

```text
StockMovement
-------------
id
warehouse_id
product_id
movement_type          # INITIAL / ADJUSTMENT / RESERVE / RELEASE / SHIP / RECEIVE
quantity_delta
reserved_delta
quantity_before
quantity_after
reserved_before
reserved_after
transfer_id            # nullable
adjustment_id          # nullable
operation_id
actor_id
reason
created_at

InventoryAdjustment
-------------------
id
warehouse_id
product_id
type                   # INITIAL / ADJUSTMENT
delta
reason
actor_id
created_at
```

`StockMovement` có khóa duy nhất theo operation, kho, sản phẩm và loại biến động. Các dòng xuất/nhận đã commit là cơ sở đối soát hàng đang vận chuyển.

## 9.10. Operation và dữ liệu giao nhận message

Transfer DB lưu `TransferOperation`: `id`, `transfer_id`, `type`, `status`, `request_payload`, `actor_id`, `expected_transfer_version`, `error_code`, `error_details`, `created_at`, `updated_at`, `completed_at`. Mỗi transfer chỉ có một operation PROCESSING hoặc RECOVERY_REQUIRED tại một thời điểm.

Inventory DB lưu `InventoryOperationResult`: `operation_id` duy nhất, `transfer_id`, `operation_type`, `payload_hash`, `outcome`, `result_payload`, `processed_at`. Payload khác với operation đã tồn tại phải bị từ chối và ghi lỗi.

Các service tham gia message lưu `OutboxMessage` và `ProcessedMessage` trong DB của mình. Các API có idempotency lưu `IdempotencyRecord` gồm người dùng, endpoint, key, payload hash và tham chiếu resource/operation hoặc kết quả đã xử lý. Ràng buộc chống trùng phải được thực thi ở DB, không chỉ bằng kiểm tra trong bộ nhớ.

Auth, Product và Warehouse lưu audit cho thay đổi tài khoản, quyền, kho và sản phẩm trong transaction của service tương ứng. MVP cho phép Admin truy vấn audit theo từng service qua Gateway, chưa cần một Audit Service riêng.

---

# 10. Database-per-Service

Mỗi microservice sở hữu database riêng.

Ví dụ:

```text
Auth DB
Product DB
Warehouse DB
Inventory DB
Transfer DB
```

Không sử dụng Foreign Key trực tiếp giữa database của các service.

Ví dụ `Transfer Service` chỉ lưu:

```text
product_id
source_warehouse_id
destination_warehouse_id
```

Việc kiểm tra dữ liệu phải thông qua:

- REST API.
- Event.
- Local cache nếu có.

---

# 11. API đề xuất

## 11.1. Auth

```text
POST /api/auth/login
POST /api/users
GET  /api/users
GET  /api/users/{id}
PUT  /api/users/{id}
PATCH /api/users/{id}/status
GET  /api/users/audit
```

---

## 11.2. Product

```text
POST   /api/products
GET    /api/products
GET    /api/products/{id}
PUT    /api/products/{id}
PATCH  /api/products/{id}/status
GET    /api/products/audit
```

---

## 11.3. Warehouse

```text
POST  /api/warehouses
GET   /api/warehouses
GET   /api/warehouses/{id}
PUT   /api/warehouses/{id}
PATCH /api/warehouses/{id}/status
GET   /api/warehouses/audit
```

---

## 11.4. Inventory

```text
GET /api/inventory
GET /api/inventory/warehouses/{warehouseId}
GET /api/inventory/warehouses/{warehouseId}/products/{productId}
GET /api/inventory/movements
GET /api/inventory/in-transit
POST /api/inventory/initial-balances
POST /api/inventory/adjustments
```

Không expose reserve/release/ship/receive stock cho frontend. Các thao tác này được Inventory tiếp nhận qua command RabbitMQ từ Transfer Service. Kênh tra cứu kết quả operation giữa các service chỉ được truy cập nội bộ, có xác thực service.

---

## 11.5. Transfer

```text
POST /api/transfers
GET  /api/transfers
GET  /api/transfers/{id}
PUT  /api/transfers/{id}
GET  /api/transfers/{id}/history

POST /api/transfers/{id}/submit
POST /api/transfers/{id}/approve
POST /api/transfers/{id}/cancel
POST /api/transfers/{id}/ship
POST /api/transfers/{id}/receive
GET  /api/transfers/{id}/operations/{operationId}
POST /api/transfers/{id}/operations/{operationId}/recover
```

`recover` chỉ dành cho Admin, tiếp tục operation hiện tại với cùng định danh, không tạo một lần biến động tồn mới. Các route tĩnh như `/audit` phải được phân biệt với route `/{id}`.

## 11.6. Hợp đồng xử lý bất đồng bộ

Approve, cancel APPROVED, ship và receive trả `202 ACCEPTED` khi đã lưu bền vững thao tác và outbox; chưa có nghĩa là nghiệp vụ đã hoàn tất.

```json
{
  "transferId": "TR-2026-001",
  "transferStatus": "PENDING",
  "operationId": "7beabcc9-e835-4cfc-a42c-d3890489c044",
  "operationStatus": "PROCESSING",
  "statusUrl": "/api/transfers/TR-2026-001/operations/7beabcc9-e835-4cfc-a42c-d3890489c044"
}
```

Frontend truy vấn `statusUrl` cho đến khi thao tác có kết quả hoặc cần phục hồi. API tra cứu operation trả `200` cùng trạng thái, mã lỗi và chi tiết nếu có, tuân theo quyền xem phiếu. Các request bị lỗi xác thực, phân quyền, dữ liệu, trạng thái hoặc xung đột thao tác được từ chối trước khi tiếp nhận bằng HTTP 4xx.

Tạo transfer trả `201`; sửa nháp, submit và cancel DRAFT/PENDING xử lý đồng bộ trả `200`. Khởi tạo tồn kho và tạo điều chỉnh trả `201` sau khi transaction Inventory commit. Request thiếu Idempotency-Key tại endpoint bắt buộc trả `400`.

## 11.7. Quy ước API chung

- API danh sách hỗ trợ phân trang `page` (bắt đầu từ 0), `size` (mặc định 20, tối đa 100), và sắp xếp ổn định. Lọc dữ liệu theo quyền trước khi phân trang/tính tổng.
- Response lỗi có tối thiểu `code`, `message`, `correlationId`; chi tiết lỗi trường hoặc dòng hàng đặt trong `details`.
- `401`: chưa xác thực/token không hợp lệ; `403`: không có quyền; `404`: tài nguyên không tồn tại; `409`: xung đột dữ liệu/nghiệp vụ; `400`: dữ liệu hoặc trạng thái không hợp lệ; `503`: phụ thuộc không khả dụng trước khi yêu cầu được lưu bền vững.
- Không trả token, password hash hoặc thông tin nhạy cảm trong lỗi/log/audit.
- Cần cung cấp mô tả API và bộ request mẫu để chạy các luồng MVP.

---

# 12. Luồng nghiệp vụ chính

## 12.1. Tạo và hoàn tất một transfer

Ví dụ:

Kho TP.HCM có:

```text
Laptop = 100
```

Kho Hà Nội có:

```text
Laptop = 20
```

Người dùng tạo:

```text
Transfer TR001

HCM → Hanoi
Laptop × 50
```

### Bước 1 – Tạo request

```text
Status = DRAFT
```

### Bước 2 – Submit

```text
DRAFT → PENDING
```

### Bước 3 – Approve

API tiếp nhận trả 202 cùng operation ID. Các số dư và trạng thái dưới đây là kết quả sau khi Inventory xử lý và Transfer nhận result thành công.

Inventory Service kiểm tra:

```text
available = 100
requested = 50

100 >= 50
```

Hệ thống reserve:

```text
quantity = 100
reserved = 50
available = 50
```

Transfer:

```text
PENDING → APPROVED
```

### Bước 4 – Ship

Kho TP.HCM xuất hàng.

API trả 202; trong khi chờ result, phiếu vẫn APPROVED và thao tác PROCESSING. Sau kết quả thành công:

Inventory:

```text
quantity = 50
reserved = 0
```

Transfer:

```text
APPROVED → SHIPPED
```

### Bước 5 – Receive

Kho Hà Nội nhận 50 laptop.

API lưu xác nhận RECEIVED và command trong outbox, trả 202. Inventory cộng kho đích; sau khi result được xử lý, Transfer tự chuyển COMPLETED. Trong lúc đang vận chuyển có 50 laptop ngoài số dư hai kho; sau nhận, lượng đang vận chuyển của phiếu trở về 0.

Inventory:

```text
Hanoi:
20 + 50 = 70
```

Transfer:

```text
SHIPPED → RECEIVED → COMPLETED
```

Kết quả:

```text
HCM:   50
Hanoi: 70
```

---

# 13. Xử lý lỗi

## 13.1. Không đủ tồn kho

Nếu:

```text
available = 20
requested = 50
```

Với approve bất đồng bộ, request ban đầu đã trả `202`; kết quả tra cứu operation trả HTTP `200` và nội dung thất bại nghiệp vụ. Không thể đổi HTTP response ban đầu thành 409 sau khi consumer xử lý.

Ví dụ kết quả operation:

```json
{
  "operationId": "7beabcc9-e835-4cfc-a42c-d3890489c044",
  "operationStatus": "FAILED",
  "transferStatus": "PENDING",
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "Không đủ tồn kho khả dụng.",
    "details": [{ "productId": "P001", "availableQuantity": 20, "requestedQuantity": 50 }]
  }
}
```

Các thao tác đồng bộ như điều chỉnh làm vi phạm tồn khả dụng trả `409` trực tiếp. Approve thất bại do thiếu hàng không làm thay đổi số dư hoặc giữ chỗ của bất kỳ dòng nào.

---

## 13.2. Trạng thái không hợp lệ

Ví dụ gọi `ship` trong khi transfer đang PENDING.

Response:

```text
400 BAD REQUEST
```

```json
{
  "code": "INVALID_TRANSFER_STATUS",
  "message": "Transfer phải ở trạng thái APPROVED trước khi xuất kho."
}
```

---

## 13.3. Product không tồn tại

```text
404 NOT FOUND
```

---

## 13.4. Không có quyền

```text
403 FORBIDDEN
```

## 13.5. Chưa xác định được kết quả

HTTP timeout hoặc service bị dừng sau khi tiếp nhận không chứng minh thao tác thất bại. Client phải gửi lại cùng Idempotency-Key hoặc tra cứu operation. Hệ thống đối soát theo mục 7.3; không tự tạo operation mới hoặc tự cộng/trừ bù.

## 13.6. Message lỗi hoặc sai thứ tự

Message không hợp lệ, operation không khớp hoặc vi phạm vòng đời reservation không được cập nhật tồn kho. Ghi lý do để điều tra; lỗi không thể retry đưa vào DLQ. Với message có thể hợp lệ nhưng thiếu điều kiện tiên quyết, áp dụng retry có giới hạn và đối soát; không bỏ qua rồi coi nghiệp vụ đã thành công.

---

# 14. Yêu cầu phi chức năng

## NFR-01 – Bảo mật

- Password phải được hash.
- Sử dụng JWT.
- Endpoint cần được phân quyền theo role.
- Không lưu plain text password.
- Kiểm tra quyền theo kho và quyền bổ sung tại service sở hữu nghiệp vụ.
- Các cổng API nghiệp vụ chỉ được frontend truy cập qua Gateway; API nội bộ và RabbitMQ yêu cầu xác thực service, không nhận actor/role do client tự khai báo.

---

## NFR-02 – Hiệu năng

Mục tiêu nghiệm thu: p95 thời gian phản hồi API đọc danh sách/chi tiết dưới 2 giây, với 20 người dùng đồng thời, tối đa 10 kho, 1.000 sản phẩm, 10.000 bản ghi tồn kho và 10.000 transfer, trang 20 bản ghi, trên môi trường local sau warm-up. Báo cáo phải ghi CPU/RAM và cấu hình Docker của máy đo.

Khi các service và broker khỏe, mục tiêu p95 hoàn tất thao tác bất đồng bộ dưới 10 giây với 5 transfer thao tác đồng thời, mỗi phiếu tối đa 20 dòng trong bài đo. Đây là cấu hình đo, không phải giới hạn nghiệp vụ số dòng của transfer. Thời gian chờ khôi phục phụ thuộc bị dừng không tính vào bài đo bình thường và phải được kiểm tra riêng.

---

## NFR-03 – Khả năng mở rộng

Các microservice phải có thể chạy độc lập và có thể scale riêng nếu cần.

---

## NFR-04 – Khả năng bảo trì

Mỗi service phải:

- Có codebase độc lập.
- Có cấu hình riêng.
- Có database riêng.
- Chịu trách nhiệm cho một nhóm nghiệp vụ rõ ràng.

---

## NFR-05 – Logging

Mỗi service phải log tối thiểu:

- Request quan trọng.
- Error.
- Event đã xử lý.
- Thay đổi trạng thái transfer.

---

## NFR-06 – Auditability

Các thao tác quan trọng phải lưu:

- User thực hiện.
- Thời gian.
- Dữ liệu hoặc trạng thái thay đổi.

---

## NFR-07 – Fault tolerance

Khi một consumer tạm thời không hoạt động, message phải được giữ trong queue để xử lý sau.

---

## NFR-08 – Retry

Consumer bắt buộc retry lỗi tạm thời, với giới hạn, backoff và DLQ theo mục 7.3. Lỗi nghiệp vụ xác định được không retry tự động.

---

## NFR-09 – Data consistency

Hệ thống chấp nhận mô hình **eventual consistency** giữa các service.

Không yêu cầu distributed transaction ACID giữa nhiều database.

Mỗi transaction cục bộ phải bảo toàn bất biến tồn kho; outbox/inbox, operation và đối soát phải bảo đảm thao tác đã tiếp nhận không bị mất hoặc thực hiện lặp. Không coi eventual consistency là cho phép số dư âm hoặc trạng thái sai tồn tại vĩnh viễn.

## NFR-10 – Vận hành local và khả năng quan sát

- PostgreSQL và RabbitMQ có volume lưu bền vững qua restart container.
- Các service có health/readiness check; cấu hình kết nối và bí mật qua biến môi trường hoặc file cấu hình local không đưa vào version control.
- Request, command, result và log có correlation ID để truy vết xuyên service.
- Admin có thể xem operation cần phục hồi và lý do lỗi. Có hướng dẫn kiểm tra outbox tồn đọng, DLQ và phục hồi cùng operation ID.

---

# 15. Công nghệ đề xuất

Một stack tham khảo:

```text
Backend:
- Spring Boot

API Gateway:
- Spring Cloud Gateway

Authentication:
- Spring Security
- JWT

Database:
- PostgreSQL

Message Broker:
- RabbitMQ

Cache:
- Redis (optional)

Frontend:
- React hoặc Vue

Container:
- Docker
- Docker Compose

API Testing:
- Postman hoặc Bruno
```

Tất cả các thành phần trên đều có thể chạy local mà không cần dịch vụ cloud trả phí.

---

# 16. Docker Compose

Hệ thống có thể được chạy bằng:

```bash
docker compose up -d
```

Các container dự kiến:

```text
api-gateway
auth-service
product-service
warehouse-service
inventory-service
transfer-service

postgres-auth
postgres-product
postgres-warehouse
postgres-inventory
postgres-transfer

rabbitmq
redis
frontend
```

Redis có thể bỏ nếu phiên bản đầu chưa cần.

Repository phải có hướng dẫn cấu hình, migration/schema, khởi tạo Admin và dữ liệu demo gồm tối thiểu hai kho, sản phẩm và tồn ban đầu. Seed chạy lại không tạo dữ liệu trùng hoặc ghi đè dữ liệu nghiệp vụ. Các service chờ dependency sẵn sàng bằng health check hoặc retry kết nối. Khởi động lại không mất số dư, message và dữ liệu chống trùng.

---

# 17. Chức năng ngoài phạm vi phiên bản đầu

Các chức năng sau không bắt buộc trong MVP:

- Theo dõi GPS xe vận chuyển.
- Tích hợp đơn vị vận chuyển bên ngoài.
- Thanh toán.
- Quản lý đơn hàng khách hàng.
- Quản lý nhà cung cấp.
- Purchase Order.
- Barcode scanner phần cứng.
- Mobile App.
- AI demand forecasting.
- Automatic warehouse replenishment.
- Email/SMS thật.
- Cloud deployment.
- Xuất hàng/nhận hàng từng phần, chia chuyến, nhận thiếu/thừa/hỏng.
- Quy trình trả hàng hoặc hoàn chuyển sau SHIPPED.
- Quản lý lô, serial, hạn sử dụng và quy đổi đơn vị tính.
- Hàng cân/đo có số lượng thập phân.
- Một người dùng phụ trách nhiều kho và quy trình duyệt nhiều cấp.
- Tự động hết hạn giữ chỗ.

Các chức năng trên có thể phát triển trong phiên bản tương lai.

---

# 18. MVP đề xuất

Phiên bản đầu tiên nên tập trung vào:

1. Login và JWT.
2. Tạo, xem, cập nhật và đổi trạng thái Product.
3. Tạo, xem, cập nhật và đổi trạng thái Warehouse.
4. Xem tồn kho.
5. Tạo Transfer.
6. Submit Transfer.
7. Approve Transfer.
8. Reserve Stock.
9. Ship Transfer.
10. Receive Transfer.
11. Tự động cập nhật tồn kho.
12. Xem lịch sử Transfer.
13. API Gateway.
14. RabbitMQ cho event quan trọng.
15. Docker Compose chạy toàn hệ thống.
16. Quản lý tài khoản, gán kho và quyền bổ sung.
17. Khởi tạo và điều chỉnh tồn kho có audit.
18. Hủy transfer và giải phóng giữ chỗ theo trạng thái hợp lệ.
19. Theo dõi hàng đang vận chuyển và lịch sử biến động tồn.
20. Theo dõi/phục hồi thao tác lỗi, outbox, chống lặp và DLQ.

---

# 19. Tiêu chí nghiệm thu

Hệ thống được xem là đáp ứng MVP khi:

### AC-01

Người dùng có thể đăng nhập và nhận JWT hợp lệ.

### AC-02

Admin có thể tạo Product và Warehouse.

### AC-03

Hệ thống có thể hiển thị tồn kho của sản phẩm theo từng kho.

### AC-04

Người dùng có thể tạo phiếu chuyển kho gồm một hoặc nhiều sản phẩm.

### AC-05

Hệ thống không cho approve khi số lượng khả dụng không đủ.

### AC-06

Khi approve, số lượng tương ứng được reserve.

### AC-07

Khi cancel transfer đã APPROVED, reserved stock được release.

### AC-08

Khi transfer được SHIPPED, kho nguồn giảm tồn kho.

### AC-09

Sau khi transfer được xác nhận RECEIVED, Inventory cộng kho đích đúng một lần. Việc tăng có thể bất đồng bộ; chỉ được chuyển COMPLETED sau khi Inventory xác nhận tăng thành công. RECEIVED đang chờ không được hiển thị như đã hoàn tất.

### AC-10

Transfer phải tuân theo đúng workflow trạng thái.

### AC-11

Frontend chỉ cần gọi API Gateway.

### AC-12

Các service có database độc lập.

### AC-13

Các event quan trọng được truyền qua RabbitMQ.

### AC-14

Việc xử lý message phải tránh cập nhật trùng dữ liệu.

### AC-15

Toàn bộ hệ thống có thể khởi chạy local bằng Docker Compose.

### AC-16 – Khởi tạo và điều chỉnh

Người có quyền khởi tạo tồn ban đầu đúng một lần và điều chỉnh kèm lý do. Điều chỉnh làm quantity âm hoặc nhỏ hơn reserved bị từ chối; số dư và lịch sử không thay đổi khi thất bại.

### AC-17 – Tranh chấp tồn kho

Kho có quantity 100, reserved 0; hai phiếu cùng yêu cầu 80 được approve đồng thời. Chỉ một phiếu thành công; số dư cuối quantity 100, reserved 80, available 20. Phiếu còn lại PENDING với operation FAILED do thiếu hàng.

### AC-18 – Phiếu nhiều sản phẩm

Phiếu có A đủ tồn và B thiếu tồn. Approve thất bại không giữ chỗ A hoặc B. Ship/release/receive nhiều dòng cũng không để lại cập nhật một phần nếu transaction gặp lỗi.

### AC-19 – Request và message lặp

Nhấn đúp/gửi lại request cùng key, gửi lại message cùng eventId, và phát lại cùng operation với eventId khác đều chỉ gây một tác động nghiệp vụ. Không tạo thêm stock movement hoặc lịch sử trạng thái. Tái sử dụng key với payload khác trả 409.

### AC-20 – Ship và cancel đồng thời

Với phiếu APPROVED, ship và cancel gửi đồng thời chỉ có một thao tác được nhận. Nếu ship thắng thì quantity/reserved cùng giảm và không release lại; nếu cancel thắng thì chỉ reserved giảm và không ship.

### AC-21 – Restart và phục hồi

Kiểm tra ít nhất ba điểm dừng: Transfer đã commit outbox nhưng chưa publish; Inventory đã commit số dư nhưng chưa gửi result; Transfer chưa commit kết quả nhận được. Sau restart/đối soát, cùng operation hoàn tất đúng một lần, không mất giữ chỗ hoặc cộng/trừ lặp. Áp dụng kiểm tra cho reserve và receive.

### AC-22 – Consumer dừng và DLQ

Khi consumer dừng, request đã nhận vẫn truy vấn được và message không mất. Khi consumer hoạt động lại, xử lý tiếp thành công. Lỗi kéo dài vượt giới hạn retry vào DLQ và operation RECOVERY_REQUIRED; sau khi sửa nguyên nhân, Admin phục hồi cùng operation mà không lặp biến động tồn.

### AC-23 – Phân quyền

Kiểm tra ma trận mục 2.4 qua API, gồm truy cập trực tiếp ID phiếu của kho khác, Staff thiếu quyền ship/receive, tài khoản disable và quyền đã bị thu hồi dù JWT chưa hết hạn. Mọi thao tác trái quyền bị từ chối và không gây thay đổi dữ liệu.

### AC-24 – Nội dung phiếu và danh mục

Từ chối phiếu rỗng, số lượng không hợp lệ, sản phẩm trùng, kho nguồn trùng kho đích, danh mục INACTIVE và sửa phiếu ngoài DRAFT. Từ chối vô hiệu hóa tài nguyên đang được sử dụng, kể cả khi có request tạo/approve hoặc cập nhật tồn đồng thời.

### AC-25 – Bảo toàn hàng và audit

Với ví dụ mục 12, trước chuyển tổng là 120; sau ship có HCM 50, Hà Nội 20, đang vận chuyển 50; sau receive hoàn tất có HCM 50, Hà Nội 70, đang vận chuyển 0. Mỗi bước có lịch sử với actor, thời gian, tham chiếu và số dư trước/sau; bước COMPLETED tự động có actor hệ thống.

### AC-26 – Message đến muộn

Phát lại result reserve sau khi phiếu đã SHIPPED hoặc COMPLETED không làm lùi trạng thái hoặc giữ chỗ lại. Command thiếu điều kiện tiên quyết không làm thay đổi số dư và được xử lý theo quy trình retry/phục hồi.

### AC-27 – Khả năng sử dụng và hiệu năng

Frontend thể hiện PROCESSING, FAILED và RECOVERY_REQUIRED, cho phép xem lỗi nhưng không gửi thao tác xung đột. API phân trang/lọc đúng quyền; bài đo đạt mục tiêu NFR-02 với cấu hình máy được ghi nhận.

---

# 20. Use Case tổng quan

```text
Admin
 │
 ├── Login
 ├── Manage Users
 ├── Manage Products
 ├── Manage Warehouses
 ├── View Inventory
 └── View Transfers


Warehouse Manager
 │
 ├── Login
 ├── View Inventory
 ├── Create Transfer
 ├── Submit Transfer
 ├── Approve Transfer
 ├── Cancel Transfer
 ├── Ship Transfer
 ├── Receive Transfer
 └── View Transfer History


Warehouse Staff
 │
 ├── Login
 ├── View Inventory
 ├── View Transfers
 ├── Ship Transfer       (nếu được cấp quyền)
 └── Receive Transfer    (nếu được cấp quyền)
```

---

# 21. Tóm tắt

**Inventory & Warehouse Transfer System** là hệ thống quản lý tồn kho nhiều kho và hỗ trợ quy trình điều chuyển hàng hóa giữa các kho.

Hệ thống giải quyết ba bài toán chính:

```text
1. Có sản phẩm gì?
        ↓
   Product Service

2. Hàng đang ở đâu và còn bao nhiêu?
        ↓
   Warehouse + Inventory Service

3. Làm thế nào chuyển hàng giữa các kho an toàn?
        ↓
   Transfer Service
```

Kiến trúc microservice giúp tách biệt từng nhóm nghiệp vụ, trong khi API Gateway cung cấp một điểm truy cập duy nhất cho frontend.

RabbitMQ hỗ trợ giao tiếp bất đồng bộ giữa các service, đặc biệt đối với các thay đổi liên quan đến tồn kho và trạng thái transfer.

Đây là một đề tài phù hợp để thực hành:

- Microservices.
- API Gateway.
- REST API.
- JWT Authentication.
- Role-Based Authorization.
- Database-per-Service.
- RabbitMQ.
- Event-driven Architecture.
- Eventual Consistency.
- Idempotency.
- Docker Compose.
