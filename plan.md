# Kế hoạch phát triển Inventory & Warehouse Transfer System

**Nền tảng:** Web và Android\
**Phiên bản kế hoạch:** 1.1\
**Ngày cập nhật:** 2026-10-01\
**Tài liệu nghiệp vụ hiện hành:** [SRS phiên bản 1.2](./SRS_Inventory_Warehouse_Transfer_System_VI.md)\
**Trạng thái dự án:** Auth/Gateway đã có login và `/me`; người dùng đã xác nhận đăng nhập web/Android. Android đang tích hợp cập nhật phiên/quyền theo vòng đời ứng dụng. Các service nghiệp vụ còn lại chưa triển khai.
**Thời gian mục tiêu:** 8 tuần, điều chỉnh theo tiến độ thực tế

> Đây là tài liệu để cùng học, thống nhất và theo dõi công việc. Các công việc trong kế hoạch không đồng nghĩa với việc sẽ được tự động triển khai toàn bộ ngay lập tức.

## Mục lục

1. [Cách làm việc cùng nhau](#1-cách-làm-việc-cùng-nhau)
2. [Mục tiêu và phạm vi](#2-mục-tiêu-và-phạm-vi)
3. [Tech stack đã chọn](#3-tech-stack-đã-chọn)
4. [Kiến trúc và quy ước triển khai](#4-kiến-trúc-và-quy-ước-triển-khai)
5. [Ma trận chức năng và tiến độ](#5-ma-trận-chức-năng-và-tiến-độ)
6. [Lộ trình mục tiêu 8 tuần](#6-lộ-trình-mục-tiêu-8-tuần)
7. [Kiểm thử và nghiệm thu](#7-kiểm-thử-và-nghiệm-thu)
8. [Quản lý tài liệu](#8-quản-lý-tài-liệu)
9. [Rủi ro và cách xử lý](#9-rủi-ro-và-cách-xử-lý)
10. [Nhật ký quyết định](#10-nhật-ký-quyết-định)
11. [Bước tiếp theo](#11-bước-tiếp-theo)

## 1. Cách làm việc cùng nhau

- Trợ lý gửi code/nội dung trong chat để người dùng áp dụng thủ công; chỉ chỉnh trực tiếp khi được yêu cầu rõ. Đợt tinh gọn tài liệu ngày 2026-10-01 được người dùng cho phép chỉnh trực tiếp.

- Người thực hiện chính là một người, đã quen React/JavaScript. Trợ lý hỗ trợ giải thích, thiết kế, viết mã và kiểm tra theo từng phần đã thống nhất.
- Trước mỗi bước, nói rõ mục tiêu, vì sao cần làm, đầu ra và những file dự kiến tạo hoặc sửa.
- Cùng thống nhất một phần nhỏ rồi mới thực hiện. Không tự chuyển từ viết tài liệu sang tạo code, cài dependency hoặc chạy toàn bộ lộ trình.
- Người dùng thực hiện thủ công các bước cài công cụ/dependency, khởi tạo bằng CLI và setup hạ tầng theo hướng dẫn. Trợ lý kiểm tra kết quả, giải thích và hỗ trợ viết mã cho phần đã thống nhất.
- Sau mỗi phần, giải thích cách hoạt động, cách kiểm tra và kết quả thực tế; cập nhật tiến độ trong file này rồi mới bàn bước tiếp theo.
- Với mỗi file tạo hoặc sửa, giải thích vai trò của file, vì sao cần nó và cách nó phối hợp với các file khác; dùng lời giải thích dễ hiểu để người dùng theo kịp quá trình học.
- Ưu tiên hiểu và chạy được từng luồng nghiệp vụ. Không đặt mục tiêu tạo thật nhiều file trong một lần.
- Nếu phát hiện cần thay đổi phạm vi hoặc công nghệ đã chọn, ghi nhận lý do và trao đổi trước khi thay đổi.
- Các mốc tuần là thứ tự và mục tiêu tham khảo, không phải hạn tự động. Chưa xác định số giờ làm việc mỗi tuần hoặc ngày bàn giao cố định.

### Quy ước trạng thái

| Trạng thái    | Ý nghĩa                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `TODO`        | Chưa bắt đầu                                                                |
| `IN_PROGRESS` | Đang thực hiện, chưa đáp ứng đầy đủ điều kiện hoàn thành                    |
| `BLOCKED`     | Không thể tiếp tục phần việc này; phải ghi nguyên nhân và điều kiện tháo gỡ |
| `DONE`        | Đã hoàn thành và có bằng chứng kiểm tra phù hợp                             |

Một nhóm chức năng chỉ hoàn thành khi Backend, Web, Android và Kiểm thử đều `DONE`. Giao diện mock, API chưa tích hợp, code chưa chạy hoặc package mới cài không được tính là chức năng hoàn thành.

## 2. Mục tiêu và phạm vi

### 2.1. Các lựa chọn đã thống nhất

- Xây dựng 5 microservice: Auth/User, Product, Warehouse, Inventory và Transfer, cùng một API Gateway.
- Dùng TypeScript xuyên suốt backend, web và mobile.
- Web và app Android có **đầy đủ chức năng theo quyền**, bao gồm chức năng quản trị; mobile không chỉ là bản xem thông tin hoặc chỉ dành cho Staff.
- Hai ứng dụng dùng chung backend và dữ liệu. Thay đổi từ một nền tảng phải được phản ánh khi nền tảng còn lại tải lại dữ liệu.
- Giao diện tiếng Việt; giữ tên trạng thái kỹ thuật thống nhất trong API.
- Backend và web chạy local bằng Docker Compose. Android bàn giao APK cài trực tiếp, truy cập hệ thống qua mạng nội bộ.
- Không bắt buộc dùng dịch vụ cloud hoặc dịch vụ trả phí.

### 2.2. Kết quả cần đạt

Người dùng đăng nhập đúng vai trò, quản lý danh mục và tồn kho theo quyền, tạo phiếu nhiều sản phẩm và xử lý quy trình:

```text
DRAFT → PENDING → APPROVED → SHIPPED → RECEIVED → COMPLETED
```

Phiếu DRAFT/PENDING/APPROVED được hủy theo điều kiện và quyền trong SRS. Số dư tồn kho, hàng giữ chỗ và hàng đang vận chuyển được theo dõi chính xác; thao tác lặp hoặc lỗi giữa các service không làm mất hoặc cộng/trừ hàng hai lần.

### 2.3. Ngoài phạm vi MVP

- iOS, Google Play, cloud deployment và Kubernetes.
- Redis, refresh token, push notification, email/SMS thật.
- Giao dịch offline, tự xếp hàng thao tác khi mất mạng.
- Barcode, GPS, tích hợp vận chuyển, đơn hàng bán, nhà cung cấp và mua hàng.
- Xuất/nhận từng phần, chia chuyến, nhận thiếu/thừa/hỏng, hoàn chuyển sau SHIPPED.
- Lô, serial, hạn sử dụng, quy đổi đơn vị và số lượng thập phân.
- Một tài khoản phụ trách nhiều kho, duyệt nhiều cấp, tự hết hạn giữ chỗ.
- Báo cáo nâng cao, AI và tự động bổ sung hàng.

Phạm vi và giới hạn nghiệp vụ tuân theo SRS 1.2.

## 3. Tech stack đã chọn

| Thành phần     | Công nghệ                                                 | Vai trò trong dự án                                                                      |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Ngôn ngữ       | TypeScript, strict mode                                   | Thống nhất ngôn ngữ, kiểm tra kiểu dữ liệu                                               |
| Runtime        | Node.js 24 LTS                                            | Chạy backend và công cụ phát triển                                                       |
| Workspace      | pnpm workspaces                                           | Quản lý nhiều ứng dụng/package trong một repository                                      |
| Backend        | NestJS với Express                                        | Tổ chức controller, service, validation và phân quyền                                    |
| API Gateway    | NestJS + HTTP proxy                                       | Định tuyến, xác thực sơ bộ, CORS, correlation ID                                         |
| Database       | PostgreSQL                                                | Lưu nghiệp vụ, ràng buộc và transaction                                                  |
| ORM            | Prisma ORM 7                                              | Auth đã dùng Prisma; schema/client/migration riêng từng service |
| Messaging      | RabbitMQ + amqplib trong module NestJS                    | Command/result, publisher confirm, manual ACK                                            |
| Web            | React + Vite + React Router                               | Ứng dụng quản trị dạng SPA                                                               |
| UI web         | Material UI, thành phần miễn phí                          | Bảng, biểu mẫu, bộ lọc và hộp thoại                                                      |
| Android        | React Native + Expo + Expo Router                         | App Android riêng và điều hướng màn hình                                                 |
| UI Android     | React Native Paper bản stable                             | Thành phần giao diện phù hợp điện thoại                                                  |
| Dữ liệu client | TanStack Query                                            | Cache, tải lại dữ liệu, theo dõi operation                                               |
| Biểu mẫu       | React Hook Form + Zod                                     | Quản lý form và validation phía giao diện                                                |
| Token Android  | Expo SecureStore                                          | Lưu token trên thiết bị                                                                  |
| Tài liệu API   | OpenAPI/Swagger                                           | Hợp đồng API để tích hợp hai client                                                      |
| Bộ request mẫu | Bruno                                                     | Chạy và lưu các kịch bản API                                                             |
| Test backend   | Jest + Supertest                                          | Unit test và API/integration test                                                        |
| Test web       | Vitest + React Testing Library + Playwright               | Component test và luồng sử dụng web                                                      |
| Test Android   | Jest + React Native Testing Library; kiểm tra APK thực tế | Component test và nghiệm thu trên thiết bị/emulator                                      |
| Đóng gói       | Docker Compose; Android SDK và Gradle                     | Chạy hệ thống local và build APK                                                         |

### 3.1. Lý do chọn hướng này

- Phù hợp kiến thức React/JavaScript hiện có; không thêm Java hoặc Dart vào giai đoạn MVP.
- NestJS tổ chức backend theo module. Theo lựa chọn ngày 2026-09-23, dùng Prisma ORM 7 để truy vấn và quản lý migration; các thao tác cần transaction/khóa PostgreSQL vẫn phải thiết kế theo nghiệp vụ. Auth đã chuyển mã chạy, test và dependency sang Prisma theo [hướng dẫn Prisma và migration](./docs/local-development.md). Phiên bản Auth đã chốt là 7.10.0 trong manifest/lockfile.
- Web và Android có thể dùng chung kiểu dữ liệu, API client và quy tắc validation phía giao diện. Bố cục và component hiển thị được phát triển riêng theo nền tảng.
- Expo hỗ trợ pnpm monorepo và build Android tại máy. APK bàn giao phải chạy độc lập; Expo Go chỉ là lựa chọn thử nghiệm ban đầu. Xem [Expo Monorepos](https://docs.expo.dev/guides/monorepos/) và [Build Local](https://docs.expo.dev/guides/local-app-overview/).
- Material UI và React Native Paper cung cấp component để tập trung vào chức năng nghiệp vụ. Chỉ dùng thành phần miễn phí và bản stable. Xem [Material UI](https://mui.com/material-ui/getting-started/) và [React Native Paper](https://oss.callstack.com/react-native-paper/).

### 3.2. Quy ước phiên bản

- Auth, Gateway, web và mobile đã có dependency; quản lý phiên bản bằng manifest/lockfile của từng thành phần.
- Với thành phần mới, kiểm tra phiên bản stable tương thích khi khởi tạo; giữ lockfile để tái tạo môi trường.
- Phiên bản React Native và React của mobile đi theo Expo SDK; kiểm tra thư viện dùng chung tương thích với cả web và mobile.
- Không nâng major trong quá trình làm MVP nếu không có nguyên nhân cụ thể đã được trao đổi.
- Không dùng tag `latest` trong cấu hình build bàn giao; môi trường chạy phải tái tạo được.

## 4. Kiến trúc và quy ước triển khai

### 4.1. Phân chia trách nhiệm

| Thành phần  | Trách nhiệm chính                                             | Dữ liệu sở hữu                                                  |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Auth/User   | Đăng nhập, tài khoản, vai trò, quyền và kho phụ trách         | User, quyền bổ sung, audit tài khoản                            |
| Product     | SKU, sản phẩm, category/unit dạng thuộc tính, trạng thái      | Product, audit, tham chiếu sử dụng sản phẩm                     |
| Warehouse   | Kho, mã kho, địa chỉ, trạng thái                              | Warehouse, audit, tham chiếu sử dụng kho                        |
| Inventory   | Số dư, giữ chỗ, điều chỉnh, biến động và hàng đang vận chuyển | Inventory, Reservation, Movement, Adjustment, kết quả operation |
| Transfer    | Phiếu, workflow, điều phối thao tác tồn kho, phục hồi         | Transfer, Item, History, Operation                              |
| API Gateway | Điểm vào chung của web/Android                                | Không sở hữu dữ liệu nghiệp vụ                                  |

Transfer và Inventory trao đổi command/result qua RabbitMQ. REST phục vụ truy vấn và tiếp nhận yêu cầu người dùng; API nội bộ cần xác thực service. Không cho frontend gọi trực tiếp database, RabbitMQ hoặc API thay đổi stock nội bộ.

### 4.2. Tổ chức repository dự kiến

```text
apps/
  api-gateway/
  web/
  mobile/
services/
  auth-service/
  product-service/
  warehouse-service/
  inventory-service/
  transfer-service/
packages/
  contracts/
  api-client/
  client-validation/
  tooling-config/
infra/
tests/
docs/
plan.md
SRS_Inventory_Warehouse_Transfer_System_VI.md
```

Auth, Gateway, web và mobile đã có ứng dụng. Bốn service nghiệp vụ còn lại mới giữ chỗ. Các thư mục `packages`, `infra`, `tests` ở gốc và workspace chung vẫn là dự kiến; hiện từng ứng dụng có manifest/lockfile riêng. Mỗi service khi triển khai có source, cấu hình, migration, kiểm thử và Docker image riêng; không dùng chung database hoặc tiến trình.

Package dùng chung chỉ chứa hợp đồng API/message, API client, validation phía client và cấu hình công cụ. Không chia sẻ entity/repository giữa service; không truy vấn chéo database. Backend tự kiểm tra đầu vào và quyền, không tin validation của client.

### 4.3. API và phân quyền

- Hai client dùng chung các route `/api/...` trong SRS qua Gateway.
- Bổ sung `GET /api/auth/me` để lấy tài khoản và quyền hiện hành; bổ sung lọc transfer theo trạng thái operation cho màn hình phục hồi.
- JWT được kiểm tra tại Gateway và service. Service kiểm tra trạng thái/quyền hiện hành qua Auth khi nhận request; nếu Auth không khả dụng thì từ chối request cần xác thực bằng lỗi phù hợp.
- Quyền thao tác phụ thuộc cả vai trò, kho được phân công và quyền bổ sung trong SRS mục 2.4. Quyền xem tồn kho khác không cấp quyền thay đổi tồn kho hoặc xem phiếu không liên quan.
- Danh sách phải được lọc theo quyền trước khi phân trang hoặc tính tổng.
- OpenAPI mô tả request, response, quyền, lỗi, phân trang và yêu cầu Idempotency-Key. Hai client thống nhất dùng cùng hợp đồng.

### 4.4. Phiên đăng nhập và vòng đời ứng dụng

- Access token mặc định hết hạn sau 30 phút, chưa có refresh token.
- Web giữ token trong bộ nhớ; tải lại trang hoặc đóng rồi mở lại sẽ cần đăng nhập. Đây là giới hạn được chọn cho MVP.
- Android lưu token trong SecureStore; khi mở app phải kiểm tra phiên và quyền hiện hành trước khi cho thao tác. Không lưu mật khẩu. Xem [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
- Token hết hạn thì yêu cầu đăng nhập lại. Đăng xuất xóa token và dữ liệu cache trên client; MVP chưa có endpoint thu hồi token riêng cho đăng xuất.
- Khi đổi người dùng, không hiển thị cache thuộc người dùng trước.
- Khi app trở lại foreground hoặc có mạng, tải lại quyền và dữ liệu đang xem. TanStack Query cần tích hợp trạng thái mạng và vòng đời React Native. Xem [TanStack Query React Native](https://tanstack.com/query/latest/docs/framework/react/react-native).
- Khi mất mạng, thông báo rõ, khóa thao tác ghi và không xếp hàng nghiệp vụ offline. Dữ liệu cache phải được phân biệt với dữ liệu vừa đồng bộ.

### 4.5. Thao tác bất đồng bộ và tính đúng đắn

| Hành động       | Xử lý tồn kho                           | Thời điểm đổi trạng thái phiếu                                                  |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Approve         | Reserve toàn bộ dòng hàng               | PENDING → APPROVED sau result thành công                                        |
| Cancel APPROVED | Release đúng giữ chỗ của phiếu          | APPROVED → CANCELLED sau result thành công                                      |
| Ship            | Giảm quantity và reserved tại kho nguồn | APPROVED → SHIPPED sau result thành công                                        |
| Receive         | Cộng quantity tại kho đích              | SHIPPED → RECEIVED khi ghi xác nhận; RECEIVED → COMPLETED sau result thành công |

- Giữ hợp đồng `202 + operationId` trong SRS. `202` chỉ xác nhận đã tiếp nhận bền vững, chưa xác nhận nghiệp vụ hoàn tất.
- API client giữ nguyên Idempotency-Key cho cùng một thao tác khi thử lại sau lỗi mạng. Không tự tạo khóa mới để lặp một thao tác chưa rõ kết quả.
- Khi màn hình hoạt động, kiểm tra operation mỗi 2 giây; dừng polling khi SUCCEEDED/FAILED hoặc chuyển sang hiển thị yêu cầu phục hồi khi RECOVERY_REQUIRED. Mở lại màn hình phải tải trạng thái hiện hành.
- Một transfer chỉ có một thao tác tồn kho chưa giải quyết. Cả backend và giao diện chặn các hành động xung đột.
- Inventory cập nhật tất cả dòng trong cùng transaction, khóa bản ghi theo thứ tự cố định và bảo đảm `0 <= reserved_quantity <= quantity`.
- Reservation thuộc về transfer. Ship/release không dùng giữ chỗ của phiếu khác.
- Lưu số dư, audit, kết quả xử lý, dữ liệu chống trùng và outbox trong transaction của service tương ứng. ACK sau commit; publisher chờ broker confirm.
- Retry tối đa 5 lần sau lần đầu, có backoff và DLQ; đối soát operation chờ quá 60 giây theo SRS. Phục hồi dùng cùng operation ID, không mặc định thất bại chỉ vì timeout.
- Domain event thông báo trạng thái không được tiếp tục kích hoạt lại biến động tồn kho đã được command xử lý.
- Hàng đang vận chuyển dựa trên kết quả stock đã commit, không chỉ dựa trên trạng thái Transfer có thể đồng bộ chậm.

### 4.6. Vô hiệu hóa sản phẩm và kho

Giữ điều kiện BR-16 của SRS: không vô hiệu hóa tài nguyên còn tồn, giữ chỗ, phiếu chưa kết thúc hoặc thao tác chưa giải quyết.

Hướng thiết kế đã chọn là đăng ký tham chiếu sử dụng bền vững tại service sở hữu Product/Warehouse trước khi tạo tác động nghiệp vụ. Đăng ký tham chiếu và vô hiệu hóa phải cùng khóa tài nguyên tại service sở hữu; giải phóng tham chiếu sau khi hết sử dụng. Tham chiếu dang dở được đối soát theo trạng thái nghiệp vụ, không tự xóa chỉ do timeout.

Trước khi viết phần này, cần cùng thiết kế chi tiết các bước đăng ký, giải phóng và phục hồi để tránh khóa tài nguyên vĩnh viễn hoặc vô hiệu hóa nhầm khi request chạy đồng thời.

### 4.7. Môi trường local và APK

Đây là cấu hình bàn giao mục tiêu. Compose hiện chỉ có PostgreSQL; xem [hướng dẫn chạy hiện hành](./docs/local-development.md).

- Compose mặc định có một PostgreSQL instance, 5 database và 5 tài khoản truy cập riêng cho các service; không cấp quyền truy vấn chéo database.
- Chạy thêm RabbitMQ, Gateway, năm service và web. PostgreSQL/RabbitMQ có volume bền vững.
- Gateway công khai cổng 8080, định tuyến API và web; các API nghiệp vụ nằm trong mạng Docker.
- Android emulator kết nối địa chỉ host dành cho emulator; thiết bị thật dùng IP LAN của máy chạy hệ thống. Không dùng `localhost` của điện thoại để trỏ về máy tính.
- Cấu hình API URL tách theo môi trường. APK demo local cho phép HTTP nội bộ; cấu hình triển khai HTTPS tương lai không kế thừa ngoại lệ này mặc định.
- Migration, seed và health/readiness check phục vụ khởi động lặp lại. Seed không ghi đè dữ liệu nghiệp vụ hiện có.
- Bí mật đặt trong cấu hình local không commit. APK không chứa mật khẩu database, khóa JWT hoặc bí mật service.
- APK bàn giao phải chạy độc lập sau khi tắt Metro/dev server. Không yêu cầu Docker Compose chạy bên trong thiết bị Android.

## 5. Ma trận chức năng và tiến độ

Tất cả nhóm chức năng dưới đây đều có trên cả web và Android, nhưng người dùng chỉ thấy và thực hiện các chức năng được cấp quyền. Web ưu tiên bảng/bộ lọc; Android ưu tiên danh sách, màn hình chi tiết và form chia bước. Không dùng việc khó bố trí trên điện thoại làm lý do bỏ chức năng quản trị.

### 5.1. Tiến độ chuẩn bị

| Mã      | Đầu ra                                               | Trạng thái  | Ghi chú                                                                                                                                                                                                                                                                                                              |
| ------- | ---------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PREP-01 | Chốt nền tảng, phạm vi và hướng công nghệ            | DONE        | TypeScript, web + Android đầy đủ, local + APK                                                                                                                                                                                                                                                                        |
| PREP-02 | Hoàn thiện `plan.md`                                 | DONE        | Tài liệu hiện tại; không bao gồm triển khai code                                                                                                                                                                                                                                                                     |
| PREP-03 | Đồng bộ SRS lên 1.2 | DONE | 2026-10-01: kiểm tra 68 liên kết/anchor nội bộ, AC-01–27 giữ nguyên, bổ sung AC-28–31/NFR-11; hợp đồng OpenAPI không đổi |
| PREP-04 | Giải thích và thống nhất kiến trúc chi tiết          | TODO        | Bắt đầu từ một ví dụ chuyển kho                                                                                                                                                                                                                                                                                      |
| PREP-05 | Thiết kế dữ liệu và hợp đồng API/message | IN_PROGRESS | Có tổng quan năm service, DBML và Auth/Prisma; schema và hợp đồng các service khác chưa hoàn tất |
| PREP-06 | Danh sách màn hình và luồng điều hướng web/Android   | TODO        | Bao gồm màn hình quản trị và phục hồi                                                                                                                                                                                                                                                                                |
| PREP-07 | Kiểm tra môi trường, chốt phiên bản dependency       | IN_PROGRESS | Node.js/pnpm và khung NestJS đã chạy; môi trường database, web, Android và bộ phiên bản toàn dự án còn cần kiểm tra                                                                                                                                                                                                  |
| PREP-08 | Khởi tạo và chạy Auth Service                        | DONE        | Người dùng tạo bằng NestJS CLI, duyệt hai build script và cài dependency; GET http://localhost:3000 trả HTTP 200, nội dung Hello World!                                                                                                                                                                              |
| PREP-09 | PostgreSQL local, pgAdmin và database/tài khoản Auth | DONE        | Người dùng xác nhận ngày 2026-09-18 đã hoàn tất các bước kiểm tra; kết nối 127.0.0.1:5433, database auth_db, tài khoản auth_user                                                                                                                                                                                     |
| PREP-10 | Kết nối NestJS với auth_db | DONE | Auth kết nối bằng Prisma; xem docs/local-development.md |
| PREP-11 | Tạo thư mục các thành phần | DONE | Auth, Gateway, web, mobile đã có ứng dụng; bốn service nghiệp vụ còn lại giữ chỗ |
| PREP-12 | Schema và migration đầu tiên cho Auth | DONE | Ba bảng nghiệp vụ, constraint và trigger audit được giữ trong baseline Prisma |
| PREP-13 | Seed Admin đầu tiên | DONE | Đã kiểm tra; chạy lại không đổi tài khoản có sẵn; xem docs/local-development.md |
| PREP-14 | Chuyển Auth sang Prisma | DONE | Baseline applied, giữ database/Admin và lịch sử migration; API/seed/test dùng Prisma |
| PREP-15 | Gateway chuyển tiếp login và me | DONE | Người dùng gửi kết quả 5/5 test đạt, đã kiểm tra qua Auth thật; xem apps/api-gateway/README.md |

### 5.2. Theo dõi triển khai theo chức năng

| Mã      | Nhóm chức năng                                             | Tham chiếu SRS                      | Backend     | Web  | Android | Kiểm thử    |
| ------- | ---------------------------------------------------------- | ----------------------------------- | ----------- | ---- | ------- | ----------- |
| FEAT-01 | Đăng nhập, tài khoản, đăng xuất, quyền hiện hành | FR-AUTH-01/02, NFR-01/11, AC-01/23/30 | IN_PROGRESS | IN_PROGRESS | IN_PROGRESS | IN_PROGRESS |
| FEAT-02 | Quản lý người dùng, role, kho và quyền bổ sung             | FR-AUTH-03, mục 2.4                 | TODO        | TODO | TODO    | TODO        |
| FEAT-03 | Danh mục sản phẩm, tìm kiếm, trạng thái                    | FR-PRODUCT-01–04, BR-16, AC-02/24   | TODO        | TODO | TODO    | TODO        |
| FEAT-04 | Danh mục kho, tìm kiếm, trạng thái                         | FR-WH-01–03, BR-16, AC-02/24        | TODO        | TODO | TODO    | TODO        |
| FEAT-05 | Xem tồn thực tế, giữ chỗ và khả dụng                       | FR-INV-01–03, AC-03                 | TODO        | TODO | TODO    | TODO        |
| FEAT-06 | Khởi tạo và điều chỉnh tồn kho                             | FR-INV-09/10, AC-16                 | TODO        | TODO | TODO    | TODO        |
| FEAT-07 | Tạo/sửa nháp, submit, danh sách và chi tiết phiếu          | FR-TR-01–04/11/12, AC-04/10/24      | TODO        | TODO | TODO    | TODO        |
| FEAT-08 | Approve và reserve nguyên tử                               | FR-INV-04, FR-TR-06, AC-05/06/17/18 | TODO        | TODO | TODO    | TODO        |
| FEAT-09 | Cancel và release                                          | FR-INV-05, FR-TR-05/12, AC-07/20    | TODO        | TODO | TODO    | TODO        |
| FEAT-10 | Ship, receive và complete tự động                          | FR-INV-06/07, FR-TR-07–09, AC-08/09 | TODO        | TODO | TODO    | TODO        |
| FEAT-11 | Lịch sử phiếu, biến động và audit                          | FR-TR-10, FR-INV-11, NFR-06, AC-25  | TODO        | TODO | TODO    | TODO        |
| FEAT-12 | Hàng đang vận chuyển                                       | FR-INV-11, AC-25                    | TODO        | TODO | TODO    | TODO        |
| FEAT-13 | Operation, lỗi, đối soát và phục hồi cho Admin             | FR-TR-13, mục 7/8, AC-19/21/22/26   | TODO        | TODO | TODO    | TODO        |
| FEAT-14 | Phân trang, bộ lọc, trạng thái tải/rỗng/lỗi/mất mạng       | mục 11.7, NFR-11, AC-27/30     | TODO        | TODO | TODO    | TODO        |

FEAT-01 đã có login/me ở Auth/Gateway và người dùng xác nhận đăng nhập web/Android. Android có quyền bổ sung và QueryProvider kết nối AppState. Chưa đánh dấu DONE: `/me` chưa tích hợp đầy đủ TanStack Query, AbortSignal, xử lý 401/lỗi mạng và phản hồi đến muộn khi logout. Tải lại khi mạng phục hồi là bước riêng; các ca nghiệm thu phiên còn phải chạy.

Low stock trong FR-INV-08 vẫn là tùy chọn, không được tự đưa vào phần bắt buộc hoặc ảnh hưởng nghiệm thu các chức năng chính.

### 5.3. Cách ghi bằng chứng

Với mỗi phần được chuyển sang `DONE`, bổ sung mã kiểm thử hoặc đường dẫn báo cáo, ngày kiểm tra và giới hạn còn lại nếu có. Nếu `BLOCKED`, ghi phần nào vẫn có thể làm độc lập và điều kiện cụ thể để tiếp tục; không đánh dấu toàn dự án bị chặn vì một công cụ chưa chạy.

## 6. Lộ trình mục tiêu 8 tuần

Làm theo từng nhóm chức năng xuyên backend, web và Android. Kiểm thử được thực hiện trong từng tuần; tuần 7 dành cho hồi quy và đánh giá toàn hệ thống.

| Mốc                         | Nội dung                                                                                                 | Điều kiện hoàn thành                                                    | Trạng thái  |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| W1 — Nền tảng               | Đồng bộ tài liệu; thống nhất kiến trúc; khởi tạo workspace, Compose, migration, OpenAPI và hai giao diện | Web/Android gọi được Gateway; build và cài được APK thử nghiệm          | IN_PROGRESS |
| W2 — Tài khoản và danh mục  | Auth, quyền theo kho, người dùng, sản phẩm và kho trên hai nền tảng                                      | Ba vai trò đăng nhập và thao tác đúng quyền; dữ liệu dùng chung         | TODO        |
| W3 — Tồn kho và phiếu nháp  | Khởi tạo/điều chỉnh tồn, lịch sử; tạo/sửa/submit phiếu                                                   | Có dữ liệu demo và phiếu nhiều sản phẩm từ cả web/Android               | TODO        |
| W4 — Luồng chuyển kho       | Reserve, approve, cancel, ship, receive; outbox, chống trùng và operation                                | Một phiếu chạy hết luồng qua hai nền tảng; số dư đúng, không xử lý lặp  | TODO        |
| W5 — Phục hồi và tranh chấp | Retry/DLQ, đối soát, màn hình phục hồi, hoàn thiện vô hiệu hóa danh mục                                  | Restart không mất/lặp giao dịch; không vô hiệu hóa tài nguyên đang dùng | TODO        |
| W6 — Hoàn thiện giao diện   | Bộ lọc, phân trang, audit, hàng đang vận chuyển, trạng thái tải/rỗng/lỗi                                 | Đủ chức năng theo ma trận; không còn phần bắt buộc chỉ làm qua API      | TODO        |
| W7 — Nghiệm thu hệ thống    | Đồng thời, phân quyền, restart, hiệu năng, mạng Android, hồi quy                                         | Có báo cáo đối chiếu các tiêu chí SRS và tiêu chí mobile bổ sung        | TODO        |
| W8 — Đóng gói và bàn giao   | APK release, cài mới, tài liệu local, dữ liệu demo và kịch bản báo cáo                                   | Chạy từ hướng dẫn; APK độc lập với Metro/dev server                     | TODO        |

### 6.1. Cách chia nhỏ một mốc

Ví dụ W1 không được thực hiện trong một lần mà chia thành các bước: giải thích kiến trúc → thống nhất cấu trúc repository → kiểm tra môi trường → tạo workspace → chạy hạ tầng → chạy một service → kết nối web → kết nối Android → kiểm tra APK. Sau mỗi bước có kết quả để cùng xem và trao đổi.

### 6.2. Điểm đánh giá tiến độ

- Cuối W1: đánh giá thời gian làm quen NestJS/Expo, khả năng chạy Docker và build Android; điều chỉnh kế hoạch theo quỹ thời gian thực tế.
- Cuối W4: phải chứng minh được một luồng chuyển kho hoàn chỉnh trên cả hai nền tảng. Nếu chưa đạt, tập trung hoàn tất luồng trước khi trau chuốt thêm màn hình.
- Cuối mỗi mốc: cập nhật ma trận, bằng chứng kiểm tra và công việc còn lại.
- Nếu chậm, điều chỉnh lịch hoặc giảm mức độ trang trí giao diện. Không âm thầm bỏ phân quyền, tính đúng tồn kho hoặc chức năng bắt buộc trên Android.

## 7. Kiểm thử và nghiệm thu

### 7.1. Chiến lược kiểm thử

| Lớp kiểm tra      | Công cụ/cách thực hiện                                          | Nội dung                                                  |
| ----------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| Nghiệp vụ backend | Jest                                                            | Workflow, quyền, validation và bất biến                   |
| API và tích hợp   | Supertest; PostgreSQL/RabbitMQ thật trong môi trường test riêng | Transaction, khóa, idempotency, outbox, retry và phục hồi |
| Web component     | Vitest + React Testing Library                                  | Form, lỗi, trạng thái và hiển thị theo quyền              |
| Web end-to-end    | Playwright                                                      | Luồng quản trị và chuyển kho qua Gateway                  |
| Android component | Jest + React Native Testing Library                             | Form, điều hướng và trạng thái xử lý                      |
| Android thực tế   | APK cài trên thiết bị/emulator                                  | Chức năng đầy đủ, Back, bàn phím, mất mạng, mở lại app    |
| Liên nền tảng     | Kịch bản phối hợp web và APK                                    | Cùng dữ liệu, quyền và kết quả nghiệp vụ                  |

Các test làm thay đổi dữ liệu dùng môi trường test riêng, không xóa hoặc reset dữ liệu demo/người dùng. Kiểm tra PostgreSQL/RabbitMQ thật là bắt buộc cho các kết luận về transaction và giao nhận message; test mock không thay thế được.

### 7.2. Kịch bản bắt buộc

- [ ] Tạo sản phẩm, kho, người dùng và phân quyền trên cả hai nền tảng.
- [ ] Khởi tạo tồn một lần; điều chỉnh có lý do, audit và kiểm tra giới hạn tồn khả dụng.
- [ ] Tạo trên web → duyệt/xuất trên Android → nhận trên web; chạy thêm chiều ngược lại.
- [ ] Một mặt hàng thiếu trong phiếu nhiều sản phẩm: toàn bộ reserve thất bại, không giữ chỗ một phần.
- [ ] Hai phiếu cùng tranh tồn: chỉ thao tác đủ điều kiện thành công, tồn không âm.
- [ ] Ship và cancel đồng thời: chỉ một thao tác gây tác động.
- [ ] Gửi lại request cùng khóa, message cùng event ID và command cùng operation ID khác event ID: không cộng/trừ lặp.
- [ ] Dừng service trước publish, sau commit Inventory hoặc trước commit result tại Transfer: khôi phục đúng một lần.
- [ ] Message đến muộn không làm lùi workflow; hết retry vào DLQ và có thể phục hồi đúng operation.
- [ ] Tài khoản disable hoặc quyền bị thu hồi bị chặn dù JWT chưa hết hạn; không xem/sửa dữ liệu kho ngoài quyền.
- [ ] Đổi người dùng trên app không thấy cache của tài khoản cũ.
- [ ] Vô hiệu hóa kho/sản phẩm đang dùng, kể cả có thao tác cạnh tranh: bị từ chối đúng quy tắc.
- [ ] Đối chiếu tồn tại các kho + hàng đang vận chuyển; mọi biến động có audit.
- [ ] Android mất mạng, mở lại app, token hết hạn và request timeout không gây thao tác lặp.
- [ ] API phân trang/lọc đúng quyền và đạt bài đo NFR-02 với cấu hình máy được ghi nhận.
- [ ] Compose khởi động lại giữ nguyên dữ liệu và message; migration/seed chạy lại an toàn.
- [ ] APK release cài mới và chạy khi Metro/dev server đã tắt.

### 7.3. Tiêu chí liên nền tảng trong SRS 1.2

Giữ AC-01–27. AC-28–31 đã được đưa vào SRS 1.2; bảng dưới đây tóm tắt để theo dõi:

| Mã | Tiêu chí                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC-28      | Web và Android đều cung cấp đầy đủ chức năng theo ma trận quyền, kể cả quản trị và phục hồi                             |
| AC-29      | Một phiếu được xử lý luân phiên giữa hai nền tảng, số dư/trạng thái/lịch sử cuối cùng nhất quán                         |
| AC-30      | App khôi phục trạng thái từ server khi mở lại/có mạng; hết phiên yêu cầu đăng nhập; không gửi lặp nghiệp vụ khi timeout |
| AC-31      | APK cài trực tiếp, kết nối hệ thống local và chạy độc lập sau khi tắt Metro/dev server                                  |

### 7.4. Checklist bàn giao

- [ ] Mã nguồn web, Android, Gateway và năm service.
- [ ] Manifest và lockfile với phiên bản tái tạo được.
- [ ] Migration, seed và dữ liệu demo tối thiểu hai kho.
- [ ] Compose, cấu hình mẫu và hướng dẫn khởi tạo Admin.
- [ ] APK release và hướng dẫn cấu hình kết nối LAN/emulator.
- [ ] OpenAPI và bộ request Bruno.
- [ ] Báo cáo test, hiệu năng và đối chiếu tiêu chí nghiệm thu.
- [ ] Hướng dẫn kiểm tra lỗi, đối soát và phục hồi operation.
- [ ] Hướng dẫn chạy từ môi trường mới và kịch bản demo/báo cáo.

## 8. Quản lý tài liệu

- [SRS 1.2](./SRS_Inventory_Warehouse_Transfer_System_VI.md): yêu cầu và tiêu chí nghiệm thu.
- [Mục lục](./docs/README.md): nơi tìm tài liệu dùng chung.
- [Chạy local](./docs/local-development.md): cấu hình, migration, seed và kiểm tra.
- [API Guide](./docs/api-guide.md) và [OpenAPI Auth](./docs/api/auth.openapi.json): tích hợp API.
- Thiết kế database/DBML giữ riêng, phân biệt đề xuất với schema đã triển khai.

Không lặp nhật ký trong từng hướng dẫn. Mốc hoàn thành, bằng chứng và quyết định được ghi tại đây.

## 9. Rủi ro và cách xử lý

| Rủi ro                                              | Cách xử lý trong kế hoạch                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Một người làm 5 service và 2 giao diện              | Chia theo luồng chức năng; kiểm tra cả hai client sớm; đánh giá lại W1/W4                       |
| Chưa quen NestJS hoặc Expo                          | Dành thời gian giải thích kiến trúc và làm một luồng nhỏ trước khi nhân rộng                    |
| Lệch phiên bản Expo/React Native/package dùng chung | Chốt bộ phiên bản tương thích ở bước khởi tạo, giữ lockfile và tránh nâng major                 |
| Docker và Android emulator dùng nhiều tài nguyên    | Một PostgreSQL instance; đo tài nguyên thực tế; ưu tiên thiết bị Android thật nếu emulator nặng |
| Build Android hoặc kết nối LAN gặp lỗi              | Build/cài APK thử nghiệm ngay W1; kiểm tra API URL và cấu hình mạng trước khi có nhiều màn hình |
| Tồn kho sai khi nhiều request hoặc service dừng     | Transaction, khóa, outbox, idempotency và test tích hợp từ lúc xây luồng                        |
| Tham chiếu danh mục bị treo do lỗi giữa các service | Thiết kế đối soát; không xóa tham chiếu chưa xác minh chỉ vì hết thời gian                      |
| Mobile bỏ sót chức năng quản trị                    | Ma trận Backend/Web/Android/Test riêng cho từng nhóm; chưa đủ thì chưa DONE                     |
| Chậm tiến độ                                        | Điều chỉnh lịch và độ trau chuốt UI; giữ các yêu cầu nghiệp vụ bắt buộc                         |

## 10. Nhật ký quyết định

| Mã     | Ngày       | Quyết định                                                                                | Cơ sở                                                                                                                                          |
| ------ | ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-01 | 2026-09-17 | Android là nền tảng mobile của MVP                                                        | Người dùng chọn app Android riêng                                                                                                              |
| DEC-02 | 2026-09-17 | Web và Android có đầy đủ chức năng theo quyền                                             | Người dùng yêu cầu đầy đủ trên cả hai                                                                                                          |
| DEC-03 | 2026-09-17 | Dùng TypeScript cho backend/web/mobile                                                    | Người dùng quen React/JavaScript, làm một mình                                                                                                 |
| DEC-04 | 2026-09-17 | NestJS, React và React Native/Expo                                                        | Hướng công nghệ đã được thống nhất                                                                                                             |
| DEC-05 | 2026-09-17 | Bàn giao local + APK                                                                      | Chưa cần cloud hoặc Google Play                                                                                                                |
| DEC-06 | 2026-09-17 | Lộ trình mục tiêu 8 tuần                                                                  | Khoảng thời gian dự kiến 5–8 tuần; chưa có quỹ giờ cố định                                                                                     |
| DEC-07 | 2026-09-17 | Một PostgreSQL instance, 5 database/user riêng khi chạy local                             | Giảm tài nguyên, vẫn giữ quyền sở hữu dữ liệu riêng                                                                                            |
| DEC-08 | 2026-09-17 | Access token 30 phút, chưa có refresh token                                               | Giới hạn MVP trong kế hoạch đã thống nhất                                                                                                      |
| DEC-09 | 2026-09-17 | Làm từng bước, giải thích và thống nhất trước khi triển khai                              | Người dùng yêu cầu đồng hành chậm, không tự triển khai cả kế hoạch                                                                             |
| DEC-10 | 2026-09-17 | Tài liệu theo dõi tên `plan.md`                                                           | Theo yêu cầu mới nhất; dùng thay tên `DEVELOPMENT_PLAN.md` trước đó                                                                            |
| DEC-11 | 2026-09-19 | Giữ GPS ngoài phạm vi; tiếp tục theo dõi trạng thái phiếu, lịch sử xử lý và biến động tồn | Người dùng quyết định không bổ sung tracking GPS sau khi trao đổi phạm vi và chi phí                                                           |
| DEC-12 | 2026-09-19 | Xem thiết kế database tổng thể 5 service trước, sau đó chi tiết và code từng phần         | Người dùng đồng ý cách làm tổng quan trước; Inventory và Transfer được thiết kế nghiệp vụ cùng nhau, triển khai từng chức năng nhỏ             |
| DEC-13 | 2026-09-22 | Seed Admin đọc SEED*ADMIN*\* từ .env; băm bằng scrypt có sẵn trong Node.js                | Người dùng muốn file seed để tiện test API và nhớ thông tin local; không thêm dependency, không hardcode mật khẩu, không reset tài khoản đã có |
| DEC-14 | 2026-09-23 | Chuyển Auth từ TypeORM sang Prisma 7, chốt 7.10.0 | Giữ dữ liệu/Admin; baseline SQL bảo toàn constraint/trigger; người dùng cài dependency thủ công |
| DEC-15 | 2026-10-01 | Gộp tài liệu vận hành/API, đồng bộ SRS 1.2 | Người dùng cho phép chỉnh trực tiếp đợt này; chưa tách thêm BRD, UI Guidelines hoặc use case chi tiết |

Khi có quyết định mới, thêm một dòng thay vì âm thầm đổi lựa chọn cũ. Nếu thay đổi yêu cầu nghiệp vụ, cập nhật cả SRS ở bước tương ứng.

### Bằng chứng kiểm thử đã ghi nhận

Đây là kết quả lịch sử, không phải kết quả chạy lại trong đợt dọn tài liệu. Các bộ test có thể bao gồm nhau; không cộng thành tổng ca độc lập.

| Mốc | Bằng chứng |
|---|---|
| Schema Auth, 2026-09-22 | 39 ca PostgreSQL: constraint, audit, rollback; migration ban đầu đã chạy |
| Seed Admin | 8 ca PostgreSQL: tạo mới, chạy lại, đồng thời và rollback; Admin local đã có |
| Chuyển Prisma | Baseline đối chiếu trong schema tạm rồi rollback; sau chuyển đổi có 26 unit, 68 database, 1 e2e cùng build/lint đạt |
| Login trước baseline Prisma | Báo cáo lúc triển khai ghi 26 unit, 69 database (gồm 22 ca HTTP login), 1 e2e; số ca thay đổi khi thay setup TypeORM |
| `/api/auth/me`, 2026-09-24 | 77 ca database theo báo cáo: token, trạng thái và quyền hiện hành |
| Gateway | Người dùng gửi kết quả 5 test đạt, 0 lỗi |
| Web/Android | Người dùng xác nhận đăng nhập; chưa thay thế nghiệm thu đầy đủ trên APK release |
| DBML | Kiểm tra cấu trúc ban đầu: 26 bảng, 5 nhóm, 17 FK nội bộ, 23 tham chiếu logic; sau sửa nullability/cardinality, người dùng xác nhận dbdiagram ổn ngày 2026-09-22 |

Đợt tài liệu ngày 2026-10-01: `docs` còn 8 file; kiểm tra 68 liên kết/anchor nội bộ và JSON/reference OpenAPI đạt. Request/response Auth và AC-01–27 giữ nguyên; DBML, quy ước commit, Prisma schema/migration không đổi. Các lệnh trong hướng dẫn được đối chiếu với manifest. Không chạy lại test ứng dụng hoặc thao tác database trong đợt này.

## 11. Bước tiếp theo

1. Hoàn thiện Android tải `/me` bằng TanStack Query khi trở lại foreground.
2. Bổ sung AbortSignal, xử lý 401, lỗi mạng/server, thử lại và logout khi request đang chạy.
3. Kiểm tra TypeScript/lint và các ca phiên trên thiết bị; cập nhật bằng chứng.
4. Làm tải lại khi mạng phục hồi ở bước riêng.
5. Khi phần phiên ổn định, bắt đầu quản lý người dùng theo từng chức năng nhỏ.

Tiếp tục thiết kế chi tiết theo thứ tự Auth → Product → Warehouse → Inventory và Transfer. Hai service cuối thiết kế nghiệp vụ cùng nhau, code từng luồng. PREP-05 vẫn IN_PROGRESS cho tới khi schema và hợp đồng toàn hệ thống hoàn tất.
