# Thiết kế database Auth Service

**Phiên bản:** 0.4  
**Ngày:** 2026-09-22  
**Trạng thái:** Đã có entity và migration cho ba bảng, kiểm tra schema đạt; chờ người dùng chạy migration vào `auth_db`. Các quy tắc API chưa triển khai.  
**Database:** `auth_db`  
**Tài khoản kết nối của service:** `auth_user`  
**Căn cứ:** [SRS 1.1](../SRS_Inventory_Warehouse_Transfer_System_VI.md), mục 2.4, FR-AUTH-01–03, BR-15, mục 9.1/9.10/10/11.1/11.7 và NFR-06.

**Bối cảnh toàn hệ thống:** [Thiết kế database tổng quan của 5 service](./database-overview.md).

## 1. Phạm vi thiết kế từng bước

| Bảng dự kiến | Mục đích | Trạng thái thiết kế |
|---|---|---|
| `users` | Thông tin đăng nhập, vai trò, kho phụ trách và trạng thái tài khoản | Entity và migration đã kiểm tra |
| `user_permissions` | Các quyền bổ sung được Admin gán cho từng tài khoản | Entity và migration đã kiểm tra; API phân quyền làm sau |
| `user_audit_logs` | Lịch sử thay đổi tài khoản, vai trò, kho và quyền | Entity, migration và trigger bảo vệ audit đã kiểm tra; ghi audit nghiệp vụ làm sau |

MVP có ba role cố định, mỗi tài khoản một role, nên đề xuất chưa tạo bảng `roles` hoặc `user_roles`. Quyền bổ sung tách thành bảng con để quản lý từng quyền và chống gán trùng. Trường `additional_permissions` trong mô hình User của SRS vẫn được trả dưới dạng danh sách trong API, nhưng được lưu bằng các dòng trong `user_permissions` thay vì thêm một cột trùng dữ liệu vào `users`.

`auth_user` là tài khoản PostgreSQL để service kết nối database. Một bản ghi trong `users` là tài khoản đăng nhập ứng dụng. Hai khái niệm này độc lập.

## 2. Bảng users — đề xuất đầu tiên

Mỗi dòng tương ứng một người dùng ứng dụng. Các độ dài trường và ràng buộc database dưới đây đã được đưa vào entity và migration đầu tiên; các quy tắc xử lý đầu vào và phân quyền sẽ được triển khai cùng API.

| Cột | Kiểu PostgreSQL | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|---|
| `id` | `uuid` | Có, khóa chính | UUID v4 do backend sinh | Định danh ổn định của tài khoản |
| `username` | `varchar(50)` | Có | Không | Tên đăng nhập, duy nhất không phân biệt hoa thường |
| `email` | `varchar(254)` | Có | Không | Email đăng nhập, duy nhất không phân biệt hoa thường |
| `password_hash` | `text` | Có | Không | Mật khẩu đã băm; không lưu mật khẩu gốc |
| `role` | `varchar(32)` | Có | Không | Một trong ba vai trò được hỗ trợ |
| `assigned_warehouse_id` | `uuid` | Theo vai trò | NULL | ID kho được phân công; Admin có thể không được gán kho |
| `status` | `varchar(16)` | Có | `ACTIVE` | Trạng thái tài khoản |
| `created_at` | `timestamptz` | Có | `CURRENT_TIMESTAMP` | Thời điểm tạo |
| `updated_at` | `timestamptz` | Có | `CURRENT_TIMESTAMP` khi tạo | Thời điểm thay đổi gần nhất |

### 2.1. Tính duy nhất và chuẩn hóa

- Backend trim username/email và chuyển về chữ thường trước khi lưu hoặc tra cứu đăng nhập.
- Username đề xuất dài 3–50 ký tự; bắt đầu bằng chữ cái ASCII hoặc chữ số, phần còn lại gồm chữ cái ASCII, số, dấu chấm, gạch dưới hoặc gạch ngang. Không dùng `@`, để đầu vào đăng nhập dạng email không trùng với username của một tài khoản khác.
- Email được kiểm tra định dạng và giới hạn độ dài tại backend; trong MVP chuẩn hóa toàn bộ email về chữ thường theo BR-15.
- Database có CHECK yêu cầu username/email ở dạng chuẩn hóa và không rỗng, cùng UNIQUE riêng cho từng cột. Username có thêm CHECK cho mẫu ký tự/độ dài nêu trên.
- UNIQUE vẫn áp dụng với tài khoản INACTIVE; disable không giải phóng username/email cho một tài khoản mới.

### 2.2. Vai trò và kho phụ trách

- `role` chỉ nhận `ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`; dùng CHECK tại database. Không có giá trị role mặc định để tránh tự gán vai trò ngoài ý định khi tạo tài khoản.
- `WAREHOUSE_MANAGER` và `WAREHOUSE_STAFF` bắt buộc có `assigned_warehouse_id`; `ADMIN` được phép NULL hoặc có kho phụ trách.
- Nếu có ID kho khi tạo/gán lại, Auth phải kiểm tra kho tồn tại và đang hoạt động qua Warehouse Service. Khi Warehouse Service chưa được triển khai, chưa tạo Manager/Staff có ID kho giả để bỏ qua điều kiện này.
- Không tạo khóa ngoại từ `auth_db` sang database Warehouse. Đây là tham chiếu giữa các service theo SRS mục 10.
- Quyền xem/thao tác theo kho vẫn phải kiểm tra tại service sở hữu nghiệp vụ; lưu ID kho trong User không thay thế bước phân quyền.

### 2.3. Trạng thái, mật khẩu và thời gian

- `status` chỉ nhận `ACTIVE` hoặc `INACTIVE`, có CHECK tại database. Tài khoản INACTIVE không được đăng nhập hoặc thực hiện nghiệp vụ theo FR-AUTH-03.
- MVP vô hiệu hóa tài khoản bằng trạng thái; không cung cấp chức năng xóa vật lý người dùng.
- `password_hash` không rỗng và không được đưa vào response API hoặc audit. Thuật toán/thư viện băm sẽ được chọn ở bước triển khai đăng nhập.
- Khi tạo: `created_at` và `updated_at` được khởi tạo. Khi chỉnh sửa thông tin, quyền hoặc đổi mật khẩu: service cập nhật `updated_at` trong cùng transaction. `DEFAULT CURRENT_TIMESTAMP` không tự cập nhật cột mỗi lần sửa dòng.
- API xuất thời điểm theo UTC; giao diện hiển thị theo múi giờ người dùng.

### 2.4. Khóa và index dự kiến

- PRIMARY KEY trên `id`.
- UNIQUE trên `username` và `email` đã chuẩn hóa; không tạo thêm index trùng với các UNIQUE này.
- Index trên `assigned_warehouse_id` để hỗ trợ truy vấn tài khoản theo kho.
- Chưa thêm index riêng cho role/status trước khi có truy vấn và kết quả đo cần tối ưu.

### 2.5. Các ca kiểm tra khi triển khai

- [ ] Admin không gán kho được tạo hợp lệ.
- [ ] Manager/Staff thiếu kho bị từ chối; kho không tồn tại hoặc không hoạt động bị từ chối tại bước kiểm tra liên service.
- [ ] Username/email khác nhau chỉ ở chữ hoa hoặc khoảng trắng đầu/cuối vẫn được xem là trùng.
- [ ] Hai request tạo cùng username/email đồng thời: chỉ một request thành công.
- [ ] Username chứa `@`, username/email rỗng hoặc vượt giới hạn bị từ chối.
- [ ] Role/status ngoài danh sách bị từ chối kể cả khi ghi trực tiếp vào database.
- [ ] Tài khoản INACTIVE không đăng nhập được; username/email vẫn không thể tái sử dụng.
- [ ] API và audit không trả/lưu password_hash; updated_at đổi khi chỉnh sửa.

## 3. Bảng user_permissions — quyền bổ sung hiện hành

Mỗi dòng lưu một quyền được Admin cấp thêm cho một người dùng. Người dùng không có quyền bổ sung thì không có dòng nào trong bảng này; vẫn được hưởng các quyền mặc định của role theo SRS mục 2.4. Cấu trúc database đã có trong migration; cách cập nhật qua API dưới đây chưa triển khai.

### 3.1. Các cột và quan hệ

| Cột | Kiểu PostgreSQL | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|---|
| `user_id` | `uuid` | Có, thuộc khóa chính ghép | Không | Người được cấp quyền; FK tới `users.id` |
| `permission` | `varchar(32)` | Có, thuộc khóa chính ghép | Không | Mã quyền bổ sung |
| `granted_by` | `uuid` | Có | Backend lấy từ người thực hiện đã xác thực | Người cấp quyền; FK tới `users.id` |
| `granted_at` | `timestamptz` | Có | `CURRENT_TIMESTAMP` | Thời điểm cấp quyền hiện hành |

- PRIMARY KEY (`user_id`, `permission`) bảo đảm mỗi người chỉ có một dòng cho mỗi quyền. Không cần cột `id` riêng hoặc UNIQUE lặp lại trên cùng cặp cột.
- Hai FK đều nằm trong `auth_db`, dùng `ON DELETE RESTRICT`. MVP disable người dùng thay vì xóa vật lý; người cấp quyền bị disable hoặc đổi role vẫn được giữ làm tham chiếu lịch sử.
- `permission` có CHECK chỉ chấp nhận bốn mã trong mục 3.2; tất cả cột đều NOT NULL.
- Dùng index của khóa chính ghép cho việc lấy quyền theo `user_id`; chưa cần index riêng trùng trên `user_id`. Chưa thêm index cho truy vấn chưa có nhu cầu như lọc theo người cấp.
- Backend tự xác định `granted_by` và `granted_at`, không cho client tự khai báo hai giá trị này.

### 3.2. Quyền nào có ý nghĩa với từng vai trò?

| Mã quyền | Vai trò được cấp bổ sung theo đề xuất | Tác dụng theo SRS mục 2.4 |
|---|---|---|
| `VIEW_OTHER_INVENTORY` | Manager, Staff | Xem tồn kho ngoài kho được phân công; không mở quyền xem phiếu hoặc sửa tồn kho khác |
| `SHIP_TRANSFER` | Staff | Xuất phiếu có kho nguồn là kho được phân công |
| `RECEIVE_TRANSFER` | Staff | Nhận phiếu có kho đích là kho được phân công |
| `ADJUST_INVENTORY` | Manager | Khởi tạo/điều chỉnh tồn tại kho được phân công |

Manager đã có quyền ship/receive tại kho tương ứng theo role, nên không cần lưu hai quyền đó. Admin có quyền toàn hệ thống theo role, nên danh sách quyền bổ sung của Admin để rỗng. Không sao chép các quyền mặc định của role thành dòng trong bảng này.

Đề xuất API từ chối quyền không phù hợp với role hoặc quyền dư thừa, kèm lỗi rõ ràng. Đây là quy tắc kiểm tra dữ liệu đầu vào để giữ cấu hình dễ hiểu; không thay đổi ma trận quyền của SRS. Ví dụ, gán `ADJUST_INVENTORY` cho Staff phải bị từ chối.

CHECK trong database chỉ kiểm tra mã quyền. Việc quyền phù hợp với role của người nhận và người cấp đang là Admin được kiểm tra tại Auth Service; không dùng CHECK đọc role từ một dòng/bảng khác. Service nghiệp vụ vẫn kiểm tra role, quyền, trạng thái tài khoản và kho hiện hành khi tiếp nhận thao tác.

### 3.3. Ví dụ dễ đối chiếu

Giả sử tài khoản `nv_kho_a` có role `WAREHOUSE_STAFF`, được phân công kho A và được Admin cấp hai quyền:

| Người dùng | Quyền | Người cấp |
|---|---|---|
| `nv_kho_a` | `SHIP_TRANSFER` | `admin` |
| `nv_kho_a` | `VIEW_OTHER_INVENTORY` | `admin` |

Tên tài khoản trong ví dụ chỉ để dễ đọc; database lưu UUID ở `user_id` và `granted_by`. Người này được xuất từ kho A và xem tồn kho khác. Khi nhận hàng tại kho A vẫn cần `RECEIVE_TRANSFER`; không được xuất từ kho B hoặc điều chỉnh tồn kho.

API User tiếp tục trả `additional_permissions: ["SHIP_TRANSFER", "VIEW_OTHER_INVENTORY"]`. Không thêm một cột chứa cùng danh sách vào `users`.

### 3.4. Cấp, thu hồi và thay đổi vai trò

- Chỉ Admin đang ACTIVE được thay đổi quyền. Auth kiểm tra thông tin hiện hành, không chỉ tin role cũ trong JWT.
- Đề xuất khi cập nhật User: bỏ qua trường `additional_permissions` nghĩa là giữ nguyên; gửi danh sách nghĩa là thay thế bằng đúng tập quyền đó; `[]` thu hồi toàn bộ quyền bổ sung. Từ chối mã lạ, phần tử trùng hoặc quyền không phù hợp với role sau cập nhật; không áp dụng một phần danh sách.
- Mọi đường cập nhật role, kho, trạng thái hoặc quyền của cùng người dùng phải khóa dòng `users` đó trong transaction trước khi đọc/kiểm tra dữ liệu để ghi. Khi tạo mới, tạo `users` rồi các dòng quyền trong cùng transaction.
- Khi đổi role, kiểm tra tập quyền cuối cùng với role mới. Nếu giữ nguyên danh sách cũ khiến có quyền không hợp lệ, từ chối và yêu cầu Admin gửi danh sách phù hợp trong cùng yêu cầu; không tự chuyển đổi quyền. Ví dụ đổi Staff có `SHIP_TRANSFER` thành Manager có thể gửi `additional_permissions: []`.
- Khi thay đổi tập quyền, chỉ thêm quyền mới và xóa quyền bị thu hồi; quyền giữ nguyên giữ nguyên `granted_by`/`granted_at`. Thu hồi rồi cấp lại tạo dòng với người cấp và thời điểm mới.
- Cập nhật quyền, role/kho nếu có, `users.updated_at` và audit trước/sau phải cùng commit hoặc cùng rollback theo SRS mục 9.10. Gửi lại tập quyền giống hiện tại không tạo lần cấp mới và không đổi thời điểm cấp. Cấu trúc audit được đề xuất tại mục 4.
- Disable tài khoản giữ lại các dòng quyền nhưng tài khoản không được thực hiện nghiệp vụ. Khi đổi kho, ship/receive/adjust được kiểm tra theo kho mới; các quyền này không chứa một kho riêng trong `user_permissions`.
- Sau khi việc thu hồi đã commit, request mới phải dùng quyền hiện hành từ Auth; JWT chưa hết hạn không giữ lại quyền đã thu hồi. Khi Auth không khả dụng, từ chối thao tác cần xác thực theo kế hoạch.

Bảng này lưu các quyền đang được gán. Lịch sử cấp/thu hồi phải nằm trong `user_audit_logs` để vẫn tra được sau khi dòng quyền đã bị xóa.

### 3.5. Các ca kiểm tra khi triển khai

- [ ] Người dùng không có quyền bổ sung trả `additional_permissions: []`; quyền mặc định theo role vẫn hoạt động.
- [ ] Staff được cấp ship/receive chỉ thao tác đúng kho nguồn/đích được phân công.
- [ ] `VIEW_OTHER_INVENTORY` không mở quyền xem phiếu hoặc sửa tồn kho khác.
- [ ] Staff nhận `ADJUST_INVENTORY`, mã lạ, phần tử trùng hoặc quyền dư thừa theo role bị từ chối toàn bộ tại API.
- [ ] Khóa chính ghép chặn hai dòng cùng người/quyền; FK chặn người nhận/người cấp không tồn tại; CHECK chặn mã quyền lạ khi ghi trực tiếp database.
- [ ] Client không thể giả `granted_by`; người không phải Admin ACTIVE không thể cấp/thu hồi quyền.
- [ ] Đổi role và cập nhật quyền đồng thời không để lại tập quyền không phù hợp; thay đổi không hợp lệ rollback toàn bộ.
- [ ] Gửi lại cùng tập quyền giữ nguyên thông tin cấp; thu hồi rồi cấp lại có thông tin cấp mới và đủ lịch sử.
- [ ] Ghi audit thất bại thì thay đổi quyền và `updated_at` cũng rollback.
- [ ] Sau khi thu hồi hoặc disable đã commit, request mới bị chặn theo quyền hiện hành dù JWT còn hạn (AC-23).

## 4. Bảng user_audit_logs — lịch sử thay đổi tài khoản

Mỗi dòng ghi một sự kiện thay đổi tài khoản đã được lưu thành công: ai thực hiện, thay đổi tài khoản nào, dữ liệu trước/sau và thời gian. Đã có migration tạo bảng và trigger bảo vệ; chưa triển khai API. Lịch sử đăng nhập thất bại và log lỗi kỹ thuật thuộc phần logging riêng, không được ghi thành thay đổi tài khoản thành công trong bảng này.

### 4.1. Các cột và quan hệ

| Cột | Kiểu PostgreSQL | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|---|
| `id` | `uuid` | Có, khóa chính | UUID v4 do backend sinh | Định danh bản ghi lịch sử |
| `user_id` | `uuid` | Có | Không | Tài khoản bị thay đổi; FK tới `users.id` |
| `actor_type` | `varchar(16)` | Có | Không | `USER` hoặc `SYSTEM` |
| `actor_id` | `uuid` | Khi `actor_type = USER` | Không | Người thực hiện đã xác thực; FK tới `users.id` |
| `action` | `varchar(32)` | Có | Không | Loại thay đổi tại mục 4.2 |
| `before_data` | `jsonb` | Trừ khi tạo tài khoản | Không | Bản chụp dữ liệu trước thay đổi |
| `after_data` | `jsonb` | Có | Không | Bản chụp dữ liệu sau thay đổi |
| `correlation_id` | `varchar(128)` | Có | Backend lấy từ ngữ cảnh request/tác vụ | Liên kết lịch sử với log xử lý |
| `created_at` | `timestamptz` | Có | `clock_timestamp()` | Thời điểm ghi bản lịch sử vào transaction |

`user_id` và `actor_id` có ý nghĩa khác nhau: khi Admin cấp quyền cho nhân viên, nhân viên là `user_id`, còn Admin là `actor_id`. Hai FK đều trong `auth_db`, dùng `ON DELETE RESTRICT` để giữ tham chiếu; disable hoặc đổi tên tài khoản không xóa lịch sử.

Backend xác định actor, action, thời gian và dữ liệu trước/sau; client không được cung cấp các giá trị audit để ghi trực tiếp. `correlation_id` được kiểm tra định dạng/độ dài tại biên hệ thống hoặc sinh mới khi thiếu; không được dùng làm bằng chứng xác thực hay khóa chống lặp.

### 4.2. Loại thay đổi và người thực hiện

| `action` dự kiến | Khi ghi | Dữ liệu trước/sau |
|---|---|---|
| `USER_CREATED` | Tạo tài khoản, bao gồm Admin đầu tiên | Trước là SQL NULL; sau là dữ liệu tài khoản và quyền ban đầu |
| `USER_UPDATED` | Sửa username/email, role, kho, status hoặc quyền bổ sung | Hai bản chụp phản ánh cùng một lần cập nhật |
| `USER_PASSWORD_CHANGED` | Khi triển khai thao tác thay đổi mật khẩu | Chỉ ghi sự kiện và bản chụp thông tin cho phép; không chứa mật khẩu/mã băm |

Một request thay đổi nhiều trường quản trị ghi một `USER_UPDATED` với đầy đủ trước/sau, để không bị hiểu thành nhiều lần cập nhật độc lập. Nếu sau này một request cho phép vừa sửa thông tin vừa đổi mật khẩu, ghi thêm sự kiện `USER_PASSWORD_CHANGED` trong cùng transaction và cùng `correlation_id`. Mã sự kiện mật khẩu ở đây chỉ chuẩn bị cách lưu lịch sử, chưa bổ sung API hoặc luồng đặt lại mật khẩu vào phạm vi triển khai hiện tại.

- Thao tác do người dùng thực hiện: `actor_type = USER`, `actor_id` bắt buộc. Quyền của người thực hiện được kiểm tra theo nghiệp vụ tại thời điểm xử lý; không dùng FK để suy ra người đó có quyền Admin.
- Khởi tạo Admin đầu tiên: `actor_type = SYSTEM`, `actor_id = NULL`, `action = USER_CREATED`. Trong phạm vi hiện tại chỉ luồng bootstrap nội bộ được dùng tổ hợp này; client không thể tự chọn SYSTEM để bỏ qua phân quyền. Tạo Admin và audit trong cùng transaction; chạy lại bootstrap khi đã có Admin không tạo thêm bản ghi.
- Người thực hiện bị đổi role hoặc disable sau này không làm bản audit cũ mất hợp lệ. ID là định danh lịch sử; tên hiển thị tra từ `users` có thể là tên hiện tại.

### 4.3. Nội dung bản chụp và ràng buộc

Đề xuất `before_data`/`after_data` là JSON object với đúng các trường: `username`, `email`, `role`, `assigned_warehouse_id`, `status`, `additional_permissions`. Đây là dữ liệu từ database do backend chọn rõ từng trường; không sao chép toàn bộ entity hoặc request body vào audit. ID tài khoản đã nằm ở `user_id` nên không cần lặp trong bản chụp.

- `assigned_warehouse_id` là chuỗi UUID hoặc JSON null; `additional_permissions` là mảng mã quyền không trùng, sắp xếp ổn định trước khi so sánh/lưu. Quyền rỗng được ghi `[]`.
- Backend kiểm tra cấu trúc, kiểu dữ liệu và chỉ giữ các trường cho phép. Không lưu mật khẩu gốc, `password_hash`, JWT, header Authorization hoặc bí mật cấu hình. Bản chụp chứa email nên API audit chỉ dành cho Admin đã xác thực, không xuất vào log công khai.
- Database có CHECK cho danh sách action, actor_type và tổ hợp actor: USER phải có actor_id; SYSTEM phải không có actor_id và chỉ dùng USER_CREATED trong MVP.
- Database kiểm tra `before_data` là SQL NULL đúng khi USER_CREATED; các action khác bắt buộc có JSON object. `after_data` luôn NOT NULL và là JSON object. Không dùng JSON null thay cho SQL NULL của bản chụp trước khi tạo.
- `correlation_id` không rỗng hoặc chỉ gồm khoảng trắng, tối đa 128 ký tự. Không UNIQUE vì một request/tác vụ có thể tạo nhiều bản lịch sử.
- Các field khác ngoài `before_data` và `actor_id` theo điều kiện đều NOT NULL. Audit không có `updated_at` vì bản ghi đã tạo không được chỉnh sửa trong luồng ứng dụng.

Ví dụ Admin cấp quyền xuất hàng cho Staff tại kho A:

| Nội dung | Trước | Sau |
|---|---|---|
| `role` | `WAREHOUSE_STAFF` | `WAREHOUSE_STAFF` |
| `assigned_warehouse_id` | ID kho A | ID kho A |
| `additional_permissions` | `[]` | `["SHIP_TRANSFER"]` |

Sự kiện là `USER_UPDATED`, có ID Admin thực hiện và thời điểm ghi. Bảng ví dụ rút gọn để dễ đọc; bản chụp thật vẫn có đầy đủ sáu trường đã nêu. Nếu quyền bị thu hồi sau đó, ghi một sự kiện mới với trước/sau ngược lại; bản cấp quyền ban đầu được giữ nguyên.

### 4.4. Transaction và bảo toàn lịch sử

- Khi sửa tài khoản, khóa dòng `users` theo mục 3.4 trước khi đọc bản chụp cũ; lấy quyền hiện hành từ `user_permissions` trong cùng transaction. Sau khi kiểm tra hợp lệ, cập nhật tài khoản/quyền, lấy bản chụp mới và thêm audit qua cùng transaction manager.
- Khi tạo tài khoản, thêm `users`, các quyền ban đầu nếu có và `USER_CREATED` trong một transaction. Ghi audit thất bại thì toàn bộ thay đổi rollback; thay đổi bị từ chối cũng không để lại bản audit thành công.
- Gửi lại cập nhật không làm thay đổi dữ liệu quản trị thì không thêm `USER_UPDATED` và không đổi `users.updated_at`. Bỏ qua khác biệt do thứ tự mảng quyền. Thay đổi mật khẩu thực sự vẫn ghi sự kiện riêng dù các trường trong bản chụp không đổi.
- Không gửi việc ghi audit sang RabbitMQ sau commit: lịch sử bắt buộc phải được lưu cùng thay đổi Auth theo SRS mục 9.10.
- API chỉ cho đọc lịch sử. Đề xuất migration bổ sung trigger từ chối UPDATE, DELETE và TRUNCATE trên bảng audit để tránh sửa/xóa nhầm trong vận hành thông thường. Chủ sở hữu database vẫn có thể thay đổi schema hoặc vô hiệu hóa trigger; thiết kế này không phải cơ chế chống can thiệp của quản trị viên database.
- MVP chưa có tác vụ tự xóa lịch sử. Sao lưu dữ liệu Auth phải bao gồm bảng audit; chính sách lưu trữ lâu dài được xem xét khi có nhu cầu vận hành thực tế.

### 4.5. Truy vấn, phân quyền và index dự kiến

- Dùng endpoint đã có trong SRS: `GET /api/users/audit`, chỉ Admin ACTIVE. Manager/Staff không được đọc kể cả lịch sử của chính mình qua endpoint này. Định tuyến `/audit` trước hoặc phân biệt rõ với `/{id}`.
- Đề xuất bộ lọc theo `user_id`, `actor_id`, `action` và khoảng thời gian UTC `from` (bao gồm), `to` (không bao gồm). Đây là chi tiết hợp đồng cần đối chiếu ở bước API.
- Phân trang theo SRS mục 11.7: `page` từ 0, `size` mặc định 20, tối đa 100. Thứ tự mặc định `created_at DESC, id DESC` để xác định thứ tự khi trùng thời gian; API trả thời điểm UTC.
- PRIMARY KEY trên `id`; thêm index (`created_at DESC`, `id DESC`) cho danh sách chung và (`user_id`, `created_at DESC`, `id DESC`) cho lịch sử một tài khoản.
- Chưa cần GIN index trên JSON hoặc index riêng cho mọi bộ lọc. Các điều kiện tìm kiếm MVP dựa vào cột thông thường; chỉ bổ sung index sau khi có truy vấn và bài đo cho thấy cần thiết.

### 4.6. Các ca kiểm tra khi triển khai

- [ ] Tạo người dùng ghi USER_CREATED với before_data là SQL NULL và after_data đúng dữ liệu/quyền ban đầu.
- [ ] Bootstrap Admin ghi actor SYSTEM; chạy lại không tạo tài khoản hoặc lịch sử trùng. Request từ client không thể giả actor SYSTEM/actor_id khác.
- [ ] Cấp rồi thu hồi quyền tạo hai sự kiện trước/sau đúng, dù dòng user_permissions đã bị xóa.
- [ ] Đổi nhiều trường trong một request ghi một USER_UPDATED; request không đổi dữ liệu không tạo lịch sử cập nhật giả.
- [ ] Ghi audit lỗi thì users, user_permissions và updated_at rollback; request bị từ chối không có audit thành công.
- [ ] Cập nhật cùng người dùng đồng thời lấy đúng bản chụp trước sau khi khóa; không ghi bản trước đã lỗi thời.
- [ ] Không có mật khẩu, password_hash, token hoặc trường ngoài danh sách trong audit/API, kể cả khi client cố đưa thêm vào payload.
- [ ] FK/CHECK từ chối actor hoặc tài khoản không tồn tại, tổ hợp SYSTEM không hợp lệ, action lạ và bản chụp sai dạng.
- [ ] UPDATE/DELETE/TRUNCATE thông thường bị chặn bởi trigger khi triển khai; disable tài khoản không làm mất lịch sử.
- [ ] Admin xem/lọc/phân trang được; Manager, Staff và tài khoản INACTIVE bị từ chối, kể cả khi gọi trực tiếp endpoint.

## 5. Bước tiếp theo

Ngày 2026-09-22 đã có entity và migration ba bảng Auth, cùng 39 ca kiểm tra schema trên PostgreSQL thật. Bước hiện tại là người dùng chạy migration theo [hướng dẫn tạo bảng](./auth-database-migration.md), rồi kiểm tra trong pgAdmin. Giữ `synchronize: false`. Sau khi xác nhận bảng đã tạo mới chuyển sang bước tài khoản Admin/đăng nhập; các checklist nghiệp vụ phía trên không được coi là hoàn thành chỉ vì schema đã có.

Các tham khảo kỹ thuật: [UUID](https://www.postgresql.org/docs/17/datatype-uuid.html), [ràng buộc PostgreSQL](https://www.postgresql.org/docs/17/ddl-constraints.html), [khóa bản ghi](https://www.postgresql.org/docs/17/explicit-locking.html), [JSON/JSONB](https://www.postgresql.org/docs/17/datatype-json.html), [hàm thời gian](https://www.postgresql.org/docs/17/functions-datetime.html) và [trigger](https://www.postgresql.org/docs/17/sql-createtrigger.html).
