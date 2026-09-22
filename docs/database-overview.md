# Thiết kế database tổng quan — Inventory & Warehouse Transfer System

**Phiên bản:** 0.1  
**Ngày:** 2026-09-19  
**Trạng thái:** Bản nháp để cùng xem xét; chưa tạo database, bảng, entity hoặc migration trong bước này  
**Căn cứ:** [SRS 1.1](../SRS_Inventory_Warehouse_Transfer_System_VI.md) và [kế hoạch phát triển](../plan.md)  
**Thiết kế chi tiết hiện có:** [Auth — bản nháp ba bảng](./auth-database-design.md)

**Sơ đồ để mở bằng dbdiagram:** [database.dbml](./database.dbml). Dán toàn bộ file vào trình soạn thảo DBML tại [dbdiagram.io](https://dbdiagram.io). File có 5 nhóm service; nét liền là FK nội bộ, nét đứt màu cam là tham chiếu logic liên service. Namespace `*_db` chỉ đại diện cho các database riêng trên sơ đồ, không phải quyết định gộp thành một database. Các cột ngoài Auth là đề xuất sơ bộ để trực quan hóa; không dùng SQL export toàn sơ đồ làm migration. Cú pháp theo [DBML](https://dbml.dbdiagram.io/docs/), cách nhóm/nét đứt theo [tài liệu hiển thị](https://dbml.dbdiagram.io/syntax/enrichment-visualization/).

**Kiểm tra DBML ngày 2026-09-19:** kiểm tra cấu trúc cục bộ đạt 26 bảng, 5 nhóm, 17 FK nội bộ và 23 tham chiếu logic; các cột đích tồn tại, kiểu tham chiếu khớp và FK nội bộ không vượt database. Đây chưa phải kết quả chạy parser chính thức hoặc mở trên dbdiagram; không cài thêm công cụ trong bước tạo file.

**DBML v0.2:** sau khi người dùng mở trên dbdiagram và báo warning, sửa ký hiệu quan hệ để khớp nullability và tính duy nhất: `?>?` cho FK nullable, quan hệ một–một tùy chọn cho kết quả operation và current operation. Giữ nguyên cột/constraint nghiệp vụ. Lần kiểm tra cấu trúc trước chưa bao phủ cardinality; bản sửa được rà thêm phần này cục bộ. Người dùng xác nhận bản mới ổn trên dbdiagram ngày 2026-09-22. Quy ước theo [tài liệu quan hệ DBML](https://docs.dbdiagram.io/relationships/).

## 1. Mục tiêu và mức độ thiết kế

Tài liệu này xác định dữ liệu thuộc service nào, các nhóm bảng cần có, quan hệ và cách dữ liệu thay đổi trong một luồng chuyển kho. Sau khi thống nhất tổng thể, thiết kế chi tiết và triển khai từng phần theo thứ tự Auth → Product → Warehouse → Inventory và Transfer. Hai service cuối được thiết kế nghiệp vụ cùng nhau nhưng vẫn code từng chức năng nhỏ.

Tên bảng dưới đây là đề xuất ánh xạ từ các mô hình trong SRS, không phải schema đã chạy. Kiểu dữ liệu từng cột, độ dài, index đầy đủ và SQL migration sẽ nằm trong tài liệu chi tiết của từng service. Các bảng bổ sung để thực hiện một quy tắc kỹ thuật được ghi rõ là đề xuất; không tự đổi yêu cầu nghiệp vụ của SRS.

## 2. Quyền sở hữu dữ liệu

| Service | Database dự kiến | Tài khoản PostgreSQL dự kiến | Nguồn dữ liệu chính cho |
|---|---|---|---|
| Auth | `auth_db` | `auth_user` | Người dùng, vai trò, quyền, kho được phân công |
| Product | `product_db` | `product_user` | Sản phẩm, SKU, đơn vị, trạng thái danh mục |
| Warehouse | `warehouse_db` | `warehouse_user` | Kho, mã kho, địa chỉ, trạng thái hoạt động |
| Inventory | `inventory_db` | `inventory_user` | Tồn thực tế, giữ chỗ, biến động và số lượng đang vận chuyển |
| Transfer | `transfer_db` | `transfer_user` | Phiếu chuyển kho, dòng hàng, trạng thái phiếu và operation |

Hiện người dùng đã xác nhận tạo `auth_db`/`auth_user`; bốn database/tài khoản còn lại mới là dự kiến. Khi chạy local, các database cùng nằm trong một PostgreSQL instance nhưng mỗi service chỉ được truy cập database của mình. Gateway không có database nghiệp vụ. Web và Android cùng sử dụng API qua Gateway.

Quy ước chung:

- Đề xuất dùng UUID làm ID nội bộ; SKU, mã kho và mã phiếu là mã nghiệp vụ có ràng buộc duy nhất riêng.
- Chỉ tạo foreign key (FK) giữa các bảng trong cùng database. ID của service khác được kiểm tra bằng API nội bộ hoặc hợp đồng message, không bằng JOIN/truy vấn trực tiếp database của service đó.
- Không chia sẻ entity hoặc repository giữa service. Việc hai service lưu cùng `transfer_id`/`operation_id` không biến các bảng đó thành dữ liệu dùng chung.
- Thời điểm lưu/xuất theo UTC; giao diện chuyển sang múi giờ người dùng. Bản ghi lịch sử giữ ID tham chiếu dù tài nguyên đã INACTIVE.
- Một transaction chỉ bao phủ database của một service. Các bước qua nhiều service cần trạng thái bền vững, thử lại và đối soát.
- GPS, nghiệp vụ offline và database đồng bộ offline trên Android nằm ngoài phạm vi hiện tại. Low stock vẫn là tùy chọn theo FR-INV-08.

## 3. Danh sách bảng theo service

### 3.1. Auth

| Bảng | Mục đích | Quan hệ và ràng buộc chính | Căn cứ |
|---|---|---|---|
| `users` | Tài khoản, mật khẩu đã băm, role, kho phụ trách, trạng thái | Username/email duy nhất sau chuẩn hóa; Manager/Staff bắt buộc được phân công kho | SRS 2.4, 9.1, FR-AUTH-03, BR-15 |
| `user_permissions` | Các quyền được Admin cấp bổ sung | FK tới users; khóa ghép người dùng + quyền; quyền vẫn bị giới hạn bởi role/kho | Ánh xạ additional_permissions; bản nháp Auth mục 3 |
| `user_audit_logs` | Ai thay đổi tài khoản/quyền, dữ liệu trước/sau và lúc nào | FK tài khoản/actor trong Auth; ghi cùng transaction; không chứa mật khẩu, hash hoặc token | SRS 9.10, NFR-06; bản nháp Auth mục 4 |

Role cố định theo SRS, chưa cần bảng quản lý role tùy biến. Không cần bảng refresh token vì kế hoạch hiện tại chỉ dùng access token. Chi tiết ba bảng đã có trong [thiết kế Auth](./auth-database-design.md).

### 3.2. Product

| Bảng | Mục đích | Quan hệ và ràng buộc chính | Căn cứ |
|---|---|---|---|
| `products` | SKU, tên, category, unit, mô tả, trạng thái | SKU chuẩn hóa chữ hoa, duy nhất và không sửa; unit không đổi sau khi đã có Inventory/giao dịch | SRS 9.2, FR-PRODUCT-01–04 |
| `product_audit_logs` | Lịch sử thay đổi sản phẩm | FK tới products; actor_id tham chiếu logic sang Auth; audit cùng transaction cập nhật | SRS 9.10, NFR-06 |
| `product_usage_references` | Các đăng ký sử dụng sản phẩm của service khác | FK tới products; định danh đăng ký duy nhất để retry không nhân đôi; phân biệt đang dùng và đã giải phóng | Đề xuất vật lý cho plan 4.6 và BR-16 |

Category và unit là thuộc tính của products trong MVP, chưa tách thành module/bảng CRUD riêng. Product không lưu số lượng tồn của từng kho. Cần giữ dấu sử dụng đã được xác nhận một cách bền vững để biết unit đã bị khóa, kể cả khi các tham chiếu đang dùng đã được giải phóng; cách lưu cụ thể sẽ chốt ở bước Product.

### 3.3. Warehouse

| Bảng | Mục đích | Quan hệ và ràng buộc chính | Căn cứ |
|---|---|---|---|
| `warehouses` | Mã kho, tên, địa chỉ, trạng thái | Mã kho chuẩn hóa chữ hoa, duy nhất và không sửa | SRS 9.3, FR-WH-01–03 |
| `warehouse_audit_logs` | Lịch sử thay đổi kho | FK tới warehouses; actor_id tham chiếu logic sang Auth; audit cùng transaction cập nhật | SRS 9.10, NFR-06 |
| `warehouse_usage_references` | Các đăng ký sử dụng kho của service khác | FK tới warehouses; định danh đăng ký duy nhất; giữ trạng thái phục vụ đối soát | Đề xuất vật lý cho plan 4.6 và BR-16 |

Warehouse không sở hữu danh sách tài khoản được gán kho hoặc số dư sản phẩm; các dữ liệu đó lần lượt thuộc Auth và Inventory. Product/Warehouse không xóa vật lý dữ liệu đã có giao dịch; vô hiệu hóa phải tuân theo mục 7.

### 3.4. Inventory

| Bảng | Mục đích | Quan hệ và ràng buộc chính | Căn cứ |
|---|---|---|---|
| `inventory_balances` | Số dư hiện hành theo cặp kho–sản phẩm; ánh xạ mô hình Inventory của SRS | Duy nhất warehouse_id + product_id; `0 <= reserved_quantity <= quantity`; số lượng nguyên | SRS 9.4, BR-11/12 |
| `stock_reservations` | Giữ chỗ theo từng phiếu và sản phẩm | Duy nhất transfer_id + product_id; giữ trạng thái RESERVED/RELEASED/SHIPPED và operation liên quan | SRS 9.8, BR-13 |
| `stock_movements` | Lịch sử mọi thay đổi quantity/reserved, trước/sau và actor | Liên hệ số dư qua cặp kho–sản phẩm trong cùng DB; adjustment_id có thể FK nội bộ; transfer_id là tham chiếu logic | SRS 9.9, FR-INV-11 |
| `inventory_adjustments` | Chứng từ khởi tạo hoặc điều chỉnh tồn, delta và lý do | INITIAL chỉ khi chưa có balance; ADJUSTMENT yêu cầu balance đã tồn tại, delta khác 0 và số dư mới hợp lệ | SRS 9.9, FR-INV-09/10 |
| `inventory_operation_results` | Kết quả xử lý command để trả lại/đối soát mà không lặp stock | operation_id duy nhất; kiểm tra loại thao tác và payload_hash; chỉ lưu kết quả cuối cùng khi đã xác định chắc chắn | SRS 9.10, mục 8, FR-TR-13 |

Inventory còn có các bảng kỹ thuật tại mục 3.6. Các điểm phải giữ khi thiết kế chi tiết:

- `available_quantity = quantity - reserved_quantity` được tính từ số dư, không có API cho client sửa trực tiếp.
- Cặp kho–sản phẩm chưa có balance được hiểu là 0 khi kiểm tra khả dụng. Receive lần đầu được tạo balance; INITIAL cạnh tranh với receive phải xử lý ràng buộc duy nhất, không ghi đè số dư.
- Reserve/release/ship/receive toàn bộ dòng hàng trong một transaction, khóa theo thứ tự cố định. Giữ chỗ của phiếu nào chỉ phiếu đó được sử dụng; không tự hết hạn reservation.
- stock_movements có khóa chống lặp theo operation, kho, sản phẩm và loại biến động. Đồng thời phải chặn ship/receive lặp cùng phiếu ngay cả khi command dùng operation_id khác; chỉ kiểm tra event_id hoặc operation_id là chưa đủ. Ràng buộc theo transfer/sản phẩm/loại tác động và vòng đời reservation sẽ được chốt cùng thiết kế Transfer.
- Hàng đang vận chuyển được tính từ SHIP đã commit và RECEIVE đã commit trong Inventory. Chưa cần bảng số dư vận chuyển độc lập; không lấy riêng trạng thái Transfer làm nguồn tính số lượng.
- Receive chưa cộng hàng xong phải phục hồi cùng operation. Không lưu kết quả FAILED cuối cùng khiến operation đó vĩnh viễn không thể xử lý lại.

### 3.5. Transfer

| Bảng | Mục đích | Quan hệ và ràng buộc chính | Căn cứ |
|---|---|---|---|
| `transfers` | Thông tin phiếu, kho nguồn/đích, status, version, current_operation_id và actor | transfer_code duy nhất; nguồn khác đích; chỉ sửa nội dung khi DRAFT | SRS 9.5, FR-TR-01–12 |
| `transfer_items` | Các sản phẩm và số lượng của phiếu | FK tới transfers; duy nhất transfer_id + product_id; quantity nguyên dương; phiếu có ít nhất một dòng | SRS 9.6, BR-01/15 |
| `transfer_history` | Lịch sử trạng thái và người thực hiện | FK tới transfers, operation nếu có; bước COMPLETED có actor hệ thống | SRS 9.7, FR-TR-10, NFR-06 |
| `transfer_operations` | Thao tác approve/cancel APPROVED/ship/receive đang xử lý hoặc đã kết thúc | FK tới transfers; lưu payload cố định, actor, lỗi và version; tối đa một operation PROCESSING/RECOVERY_REQUIRED trên một phiếu | SRS 9.10, FR-TR-13 |

Transfer còn có các bảng kỹ thuật tại mục 3.6. current_operation_id nếu có phải thuộc đúng phiếu đó; FK chỉ kiểm tra operation tồn tại là chưa đủ. Cách bảo đảm bằng khóa/constraint sẽ được chốt khi viết schema chi tiết.

Status phiếu và status operation là hai khái niệm độc lập. Ví dụ approve đang PROCESSING thì phiếu vẫn PENDING. Các yêu cầu phục hồi của Admin cũng phải được audit: đề xuất mở rộng transfer_history để ghi loại hành động và operation ngay cả khi status phiếu chưa đổi, thay vì tạo thêm một Audit Service.

### 3.6. Bảng kỹ thuật cần cho tính đúng đắn

| Bảng | Database cần có | Mục đích và dữ liệu tối thiểu ở mức tổng quan |
|---|---|---|
| `outbox_messages` | Inventory, Transfer | Lưu message và payload trong transaction nghiệp vụ; theo dõi publish/confirm để gửi lại khi cần |
| `processed_messages` | Inventory, Transfer | Ghi message đã xử lý theo consumer + event_id trong cùng transaction áp dụng kết quả; consumer ACK sau commit |
| `idempotency_records` | Inventory, Transfer | Duy nhất theo actor + phạm vi endpoint/tài nguyên + key; payload hash và tham chiếu resource/operation hoặc kết quả; nhận key cùng transaction tiếp nhận nghiệp vụ |
| `resource_usage_tasks` | Inventory, Transfer | Đề xuất lưu công việc đăng ký/xác nhận/giải phóng tham chiếu Product/Warehouse, định danh đăng ký và trạng thái để phục hồi sau restart |

Ba bảng đầu được yêu cầu bởi SRS mục 7–9. Bảng resource_usage_tasks là đề xuất cho điều phối bền vững trong plan 4.6; chưa chốt cột hoặc giao thức chi tiết. Có thể gộp vào một cơ chế công việc bền vững tương đương ở bước chi tiết nếu vẫn chứng minh được phục hồi đầy đủ.

Các bảng cùng tên ở hai database là hai bảng độc lập. Không tự thêm outbox/inbox vào Auth, Product hoặc Warehouse khi chưa có luồng message cần dùng. Việc Product/Warehouse nhận REST đăng ký tham chiếu phải chống lặp bằng định danh đăng ký tại bảng usage_references của chính service đó.

Không tự xóa idempotency, processed message và kết quả operation trong MVP. Outbox có thể phát lại sau lỗi confirm nên consumer vẫn phải chống trùng. Xử lý thiếu điều kiện tiên quyết chưa được đánh dấu hoàn tất trong processed_messages; lỗi/retry/DLQ không được biến thành thành công giả.

## 4. Quan hệ giữa dữ liệu các service

| Nơi lưu tham chiếu | Nguồn dữ liệu được tham chiếu | Cách phối hợp |
|---|---|---|
| users.assigned_warehouse_id | Warehouse.warehouses | Auth gọi Warehouse để xác minh kho tồn tại/ACTIVE khi gán; không FK chéo DB |
| balances/adjustments/movements: warehouse_id, product_id | Warehouse và Product | Inventory xác minh danh mục, đăng ký sử dụng và cập nhật số dư trong DB riêng |
| transfers: source/destination_warehouse_id; items.product_id | Warehouse và Product | Transfer xác minh danh mục, quyền kho và đăng ký sử dụng trước khi lưu tác động nghiệp vụ |
| created_by/approved_by/actor_id ở các DB nghiệp vụ | Auth.users | Kiểm tra người thực hiện/quyền hiện hành qua Auth; lưu ID để truy vết |
| reservations/movements/results: transfer_id, operation_id | Transfer.transfers/transfer_operations | Nhận command đã xác thực với nội dung cố định; Inventory lưu bằng chứng xử lý cục bộ |
| transfer_history/current_operation_id | Transfer.transfer_operations | Quan hệ trong cùng transfer_db, có FK và kiểm tra operation thuộc đúng phiếu |
| usage_references: owner service + resource/operation ID | Inventory hoặc Transfer | Tham chiếu logic để truy vấn đối soát; Product/Warehouse không đọc DB của bên đăng ký |

Tên sản phẩm/kho hiện tại được lấy qua API khi cần hiển thị; số lượng và tham chiếu ID trong lịch sử không thay đổi theo việc đổi tên. Việc cần lưu thêm bản chụp tên tại thời điểm lập phiếu hay chỉ hiển thị tên hiện tại sẽ được chốt trước schema Transfer, không giả định JOIN liên database.

## 5. Dữ liệu trao đổi và ranh giới transaction

| Trao đổi | Kênh | Nội dung/trách nhiệm |
|---|---|---|
| Kiểm tra người dùng và quyền | API nội bộ tới Auth | ID, status, role, assigned_warehouse_id, additional_permissions; Auth không khả dụng thì từ chối thao tác cần xác thực |
| Tra cứu sản phẩm/kho | API nội bộ tới Product/Warehouse | ID, mã, trạng thái và thuộc tính cần kiểm tra/hiển thị |
| Đăng ký/giải phóng sử dụng danh mục | API nội bộ tới service sở hữu | Định danh đăng ký bền vững, tài nguyên và bên sử dụng; không chỉ là một lần GET kiểm tra ACTIVE |
| Yêu cầu thay đổi stock | RabbitMQ: Transfer → Inventory | ReserveStock, ReleaseStock, ShipStock, ReceiveStock |
| Kết quả stock | RabbitMQ: Inventory → Transfer | StockReserved, StockReleased, StockShipped, StockReceived hoặc lỗi nghiệp vụ xác định được |
| Phục hồi operation | API nội bộ/command gửi lại theo SRS 7.3 | Tra cứu bằng operation_id; phát lại kết quả hoặc tiếp tục cùng thao tác khi chưa xử lý |

Hợp đồng message giữ eventId, eventType, schemaVersion, operationId, transferId, correlationId, occurredAt UTC và payload theo SRS 7.2. Command mang actor đã xác thực, version phiếu, kho nguồn/đích và toàn bộ dòng hàng cố định; mọi lần retry phải giữ cùng ý nghĩa nghiệp vụ. Nội dung field/DTO chi tiết được chốt cùng Inventory và Transfer.

Ba lần commit độc lập của một thao tác stock:

1. **Transfer tiếp nhận:** kiểm tra quyền/trạng thái và khóa phiếu; lưu idempotency, operation, thay đổi phiếu/lịch sử nếu có và command outbox. Commit rồi trả `202 + operationId`.
2. **Inventory xử lý:** chống trùng và kiểm tra điều kiện; cập nhật toàn bộ số dư, reservation, movement, kết quả operation, processed message và result outbox cùng transaction. Nếu có lỗi nghiệp vụ cuối cùng thì lưu kết quả lỗi bền vững, không đổi bất kỳ dòng stock nào.
3. **Transfer nhận result:** kiểm tra operation/version, chống trùng; cập nhật operation, trạng thái phiếu, history và domain event outbox nếu có cùng transaction. Result cũ không làm lùi trạng thái.

Timeout hoặc hết retry chưa biết kết quả thì cần đối soát/RECOVERY_REQUIRED; không tự coi stock chưa thay đổi. Riêng receive lỗi chưa cộng hàng xong phải giữ khả năng phục hồi cùng operation như FR-TR-13. Domain event thông báo trạng thái không kích hoạt stock lần thứ hai.

Khởi tạo/điều chỉnh tồn là API trực tiếp của Inventory: balance, adjustment, movement và idempotency được lưu cùng transaction. Các bước đăng ký sử dụng danh mục trước/sau transaction này được quản lý theo mục 7.

## 6. Một phiếu chuyển kho làm thay đổi dữ liệu thế nào?

Ví dụ theo SRS: kho A có 100 sản phẩm, kho B có 20; chuyển đủ 50. Bảng sau tách thời điểm xác nhận nhận hàng và thời điểm Inventory cộng hàng để tránh nhầm trạng thái phiếu với số dư.

| Mốc | Trạng thái phiếu | Tồn A | Giữ chỗ A | Tồn B | Đang vận chuyển | Dữ liệu thay đổi chính |
|---|---|---:|---:|---:|---:|---|
| Tạo nháp | DRAFT | 100 | 0 | 20 | 0 | transfers, items, history; tham chiếu danh mục |
| Submit | PENDING | 100 | 0 | 20 | 0 | transfers, history, idempotency |
| Reserve và áp dụng result xong | APPROVED | 100 | 50 | 20 | 0 | operation, reservation, movement, giữ chỗ; history/result |
| Ship và áp dụng result xong | SHIPPED | 50 | 0 | 20 | 50 | số dư nguồn, reservation SHIPPED, movement và operation/history |
| Nhận yêu cầu receive, Inventory chưa cộng | RECEIVED | 50 | 0 | 20 | 50 | phiếu, history, operation và command outbox |
| Inventory cộng xong, result chưa áp dụng ở Transfer | RECEIVED | 50 | 0 | 70 | 0 | số dư đích, movement, kết quả operation và result outbox |
| Transfer áp dụng result nhận hàng | COMPLETED | 50 | 0 | 70 | 0 | operation SUCCEEDED, history; lên lịch giải phóng tham chiếu phiếu |

Tổng `tồn A + tồn B + đang vận chuyển` luôn là 120; giữ chỗ là một phần của tồn A nên không cộng lần nữa. Approve đang chờ kết quả thì phiếu vẫn PENDING; ship đang chờ kết quả thì phiếu vẫn APPROVED.

Các nhánh khác:

- Cancel DRAFT/PENDING: chỉ khi không có operation chưa giải quyết; ghi CANCELLED, history, idempotency và công việc giải phóng tham chiếu. Không gọi release vì chưa reserve thành công.
- Cancel APPROVED: gửi ReleaseStock; chỉ chuyển CANCELLED sau result thành công. Nếu hủy sau approve trong ví dụ thì A trở về giữ chỗ 0, tồn A vẫn 100.
- SHIPPED/RECEIVED không được cancel trực tiếp. MVP xuất đủ/nhận đủ toàn phiếu, chưa có chia chuyến hoặc nhận thiếu.
- Approve thiếu bất kỳ mặt hàng nào: không reserve dòng nào, operation FAILED, phiếu vẫn PENDING; các tham chiếu cho phiếu đang tồn tại vẫn được giữ.

## 7. Tham chiếu sử dụng và vô hiệu hóa danh mục

BR-16 chặn vô hiệu hóa khi còn tồn/giữ chỗ, phiếu chưa kết thúc hoặc operation chưa giải quyết. Một lần gọi GET kiểm tra rồi cập nhật ở DB khác không đủ ngăn hai thao tác cạnh tranh; kế hoạch đã chọn đăng ký sử dụng bền vững tại Product/Warehouse.

Ở mức tổng quan, phối hợp như sau:

1. Inventory/Transfer lưu ý định thực hiện và các định danh đăng ký vào resource_usage_tasks trước các lời gọi liên service. Tác vụ này chưa được coi là nghiệp vụ hoàn tất.
2. Product/Warehouse khóa tài nguyên trong transaction của mình; kiểm tra ACTIVE và tạo/khôi phục tham chiếu chống trùng. Đăng ký và vô hiệu hóa cùng sử dụng khóa tài nguyên này.
3. Sau khi đăng ký đủ tài nguyên, bên sử dụng kiểm tra lại điều kiện và commit nghiệp vụ trong DB riêng; lưu trạng thái công việc để xác nhận/giải phóng về sau. Không giữ transaction DB mở trong khi gọi HTTP qua service khác.
4. Khi chắc chắn hết sử dụng, bên sử dụng ghi công việc giải phóng bền vững; Product/Warehouse cập nhật đúng định danh tham chiếu. Đăng ký của lần sử dụng mới phải phân biệt được với lần giải phóng cũ đến muộn.
5. Nếu bị dừng giữa các bước, đối soát theo tài nguyên/operation/ý định đã lưu. Timeout hoặc service không phản hồi không chứng minh rằng có thể giải phóng; không tự xóa tham chiếu theo TTL.

Phạm vi tham chiếu cần theo dõi:

| Bên sử dụng | Khi cần giữ tham chiếu | Khi có thể giải phóng |
|---|---|---|
| Transfer | Từ DRAFT cho kho nguồn, kho đích và từng sản phẩm; tiếp tục trong PENDING/APPROVED/SHIPPED/RECEIVED hoặc khi còn operation chưa giải quyết | Phiếu kết thúc và chắc chắn không còn tác động/chờ phục hồi liên quan |
| Inventory | Trước thao tác có thể tạo/tăng số dư hoặc giữ chỗ; tiếp tục khi còn quantity/reserved hoặc công việc chưa giải quyết | Xác minh số dư/giữ chỗ về 0 và không còn công việc đang sử dụng; phải phối hợp với thao tác mới cạnh tranh |

Sửa DRAFT phải đăng ký các tài nguyên mới trước khi ghi thay đổi rồi mới giải phóng những tài nguyên không còn dùng. Một phiếu COMPLETED không đồng nghĩa sản phẩm/kho được vô hiệu hóa: tham chiếu Inventory vẫn còn nếu còn số dư.

Lịch sử đã sử dụng không bị xóa khi tham chiếu đang dùng được giải phóng. Điều kiện khóa unit sau khi có Inventory/giao dịch là điều kiện lịch sử, khác với điều kiện đang sử dụng để chặn INACTIVE. Một balance tồn tại với số dư 0 vẫn đủ khóa unit, nhưng riêng nó không phải lý do còn tồn để chặn INACTIVE.

Giao thức đăng ký/xác nhận/giải phóng, chống lặp, dấu sử dụng lịch sử và các ca dừng giữa bước là phần cần thiết kế chi tiết trước khi code BR-16. Bản tổng quan này chưa tuyên bố giải quyết xong transaction phân tán.

## 8. Các điểm cần chốt khi thiết kế chi tiết

| Điểm | Chốt ở bước nào | Điều kiện cần đáp ứng |
|---|---|---|
| Kiểu số lượng và giới hạn đầu vào | Inventory + Transfer | Số nguyên, không tràn số, nhất quán giữa DB/API/TypeScript |
| Sinh transfer_code và khóa version | Transfer | Mã duy nhất khi nhiều request; nhận operation và chặn sửa/xử lý cạnh tranh nguyên tử |
| Chống receive/ship lặp khác operation ID | Inventory + Transfer | Bằng chứng/khóa theo nghiệp vụ ngoài event_id và operation_id; một phiếu không cộng/trừ lần thứ hai |
| Vòng đời tham chiếu danh mục và khóa unit | Product + Warehouse + Inventory + Transfer | Đăng ký trước tác động, phục hồi sau crash, không giải phóng khi chưa xác minh, không mở lại unit đã sử dụng |
| Vô hiệu hóa kho còn Manager/Staff được phân công | Auth + Warehouse | SRS yêu cầu kho phân công đang hoạt động nhưng BR-16 chưa nêu cách xử lý trường hợp này; cần thống nhất chặn disable hay chuyển/thu hồi phân công trước |
| Tên danh mục trên phiếu/lịch sử | Product + Warehouse + Transfer | Thống nhất hiển thị tên hiện tại hay lưu thêm bản chụp; ID/số lượng lịch sử luôn ổn định |
| Hợp đồng API/message và audit phục hồi | Từng chức năng, đặc biệt Transfer | Trường bắt buộc, mã lỗi, quyền, idempotency, payload bất biến và bằng chứng phục hồi theo SRS |

Các điểm trên được ghi để không bỏ sót; chưa tự chọn quy tắc nghiệp vụ mới thay người dùng. Chúng không yêu cầu thiết kế hết mọi cột của bốn service còn lại trước khi làm kết nối Auth.

## 9. Đối chiếu phạm vi và bước tiếp theo

| Nhóm yêu cầu | Nơi chịu trách nhiệm trong thiết kế |
|---|---|
| FR-AUTH-01–03, quyền theo kho, audit tài khoản | Ba bảng Auth và kiểm tra quyền hiện hành |
| FR-PRODUCT-01–04, FR-WH-01–03, BR-15/16 | Danh mục, audit, usage_references và cơ chế phối hợp |
| FR-INV-01–07/09–11, BR-11–13 | balances, reservations, movements, adjustments, operation_results |
| FR-TR-01–13, BR-14 | transfers, items, history, operations và workflow command/result |
| SRS 7–9: retry, outbox, idempotency, phục hồi | Các bảng kỹ thuật cục bộ và kết quả operation bền vững |
| NFR-06, AC-23/25 | Audit/actor, phân quyền, lịch sử tồn và đối chiếu hàng đang vận chuyển |

Đã có bản nháp tổng quan cho cả năm service và bản nháp chi tiết Auth. PREP-05 vẫn IN_PROGRESS vì schema chi tiết và hợp đồng API/message toàn hệ thống chưa hoàn tất; chưa đánh dấu chức năng Backend/Web/Android nào DONE từ tài liệu này.

Ngày 2026-09-22, Auth đã kết nối `auth_db` với `synchronize: false`, bổ sung entity/migration ba bảng và kiểm tra PostgreSQL đạt. Bước hiện tại là người dùng chạy migration theo [hướng dẫn tạo bảng Auth](./auth-database-migration.md). Việc tạo thêm database/tài khoản và cài công cụ vẫn do người dùng thực hiện thủ công theo hướng dẫn.
