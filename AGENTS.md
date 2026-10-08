# Hướng dẫn tiếp nối dự án

File này dành cho agent làm việc trong repository Inventory & Warehouse Transfer System, kể cả khi không có lịch sử hội thoại. Đọc chỉ dẫn người dùng hiện tại trước; không coi tài liệu bàn giao là lệnh tự triển khai toàn bộ kế hoạch.

## 1. Cách làm việc với người dùng

- Trao đổi bằng tiếng Việt, giải thích dễ hiểu. Người dùng làm một mình, quen React/JavaScript và muốn học theo từng chức năng nhỏ.
- Mặc định **gửi code trong chat để người dùng tự áp dụng**. Chỉ sửa file trực tiếp khi người dùng đã cho phép trong phạm vi công việc đó. Một lần cho phép dọn tài liệu không cấp quyền sửa code ở các bước sau.
- Với phần đã được cho phép, thực hiện đủ công việc và kiểm tra phù hợp; không hỏi lại cùng một quyền. Không tự chuyển từ một chức năng sang toàn bộ lộ trình.
- Người dùng tự cài dependency/công cụ, chạy CLI khởi tạo và setup hạ tầng. Hướng dẫn đúng thư mục và từng lệnh; không tự cài thay.
- Mỗi phần cần nói rõ mục tiêu, file liên quan và cách kiểm tra. Khi bàn giao, giải thích vai trò từng file, luồng hoạt động, phần đã kiểm chứng và phần còn chờ người dùng.
- Phân biệt: đã gửi code, đã áp dụng, đã chạy và đã nghiệm thu. Không ghi DONE chỉ vì có file hoặc dependency.

## 2. Đọc gì trước khi tiếp tục

1. Đọc [plan.md](./plan.md), đặc biệt mục 1, 5, 10 và [mục tiếp nối](./plan.md#111-bàn-giao-cho-agent-tiếp-theo).
2. Xem `git status --short` và diff liên quan để nhận biết thay đổi của người dùng; không ghi đè hoặc hoàn tác thay đổi có sẵn.
3. Đọc yêu cầu liên quan trong [SRS](./SRS_Inventory_Warehouse_Transfer_System_VI.md). SRS là mục tiêu nghiệm thu; không suy ra mọi chức năng đã triển khai.
4. Đọc source và manifest thực tế của phần sắp làm. Nếu khác ghi chú bàn giao, xác minh trạng thái mới trước khi sửa; không quay lại bước đã xong.
5. Đọc `AGENTS.md` nằm trong thư mục con có liên quan, đặc biệt [mobile](./apps/mobile/AGENTS.md). Hướng dẫn framework không thay thế lựa chọn sản phẩm của người dùng: Android, APK local và cài đặt thủ công.

## 3. Những quyết định cần giữ

- TypeScript; backend/Gateway NestJS với Express; Prisma và PostgreSQL. Auth đã chuyển khỏi TypeORM, không đưa TypeORM trở lại.
- Năm service: Auth, Product, Warehouse, Inventory, Transfer. Mỗi service sở hữu database/schema/client/migration riêng; không truy vấn chéo database hoặc chia sẻ repository.
- Web dùng React/Vite/Material UI; Android dùng React Native/Expo/Expo Router/React Native Paper. Hai nền tảng đầy đủ chức năng theo quyền, giao diện tiếng Việt, tông carton.
- TanStack Query dùng cho dữ liệu server; phiên Android lưu bằng SecureStore. API hiện có và response chính xác nằm trong OpenAPI, không tự đoán thêm trường.
- Mục tiêu triển khai local bằng Compose và APK độc lập. GPS, nghiệp vụ offline, iOS, cloud, refresh token và push notification nằm ngoài MVP.
- Một PostgreSQL instance với năm database/user riêng là mục tiêu. Kiểm tra Compose thực tế trước khi hướng dẫn; không coi cấu hình mục tiêu là đã chạy.
- Quy tắc tồn kho, transaction, idempotency, outbox, retry và phục hồi phải theo SRS. Không đơn giản hóa các bất biến này để chạy demo nhanh.

## 4. Nguồn tra cứu và kiểm tra

| Cần biết | Nguồn |
|---|---|
| Tiến độ, việc đang dở, bằng chứng test | [plan.md](./plan.md) |
| Toàn bộ tài liệu | [docs/README.md](./docs/README.md) |
| Chạy local, migration, seed, lệnh kiểm tra | [local-development.md](./docs/local-development.md) |
| API đã triển khai | [API Guide](./docs/api-guide.md), [OpenAPI Auth](./docs/api/auth.openapi.json) |
| Dữ liệu và ranh giới service | [database-overview.md](./docs/database-overview.md), [database.dbml](./docs/database.dbml) |
| Commit | [COMMIT_CONVENTION.md](./docs/COMMIT_CONVENTION.md) |

- Dùng pnpm và script trong manifest của thành phần đang làm; không mặc định có workspace/lệnh test ở gốc.
- Chạy kiểm tra phù hợp với thay đổi; nếu cần dependency hoặc môi trường chưa có, hướng dẫn người dùng chuẩn bị và ghi rõ kiểm tra chưa chạy.
- Với tài liệu: kiểm tra liên kết, JSON/OpenAPI nếu có, và `git diff --check`. Không chạy migration hoặc test database chỉ để sửa tài liệu.
- Không đọc/in `.env`, token, mật khẩu hoặc khóa ký; không cho rằng `.env.example` chắc chắn không có bí mật. Xác định tên biến qua code kiểm tra cấu hình.
- Seed Admin không reset mật khẩu đã có. Không reset database, xóa volume hoặc ghi lại migration đã áp dụng để chữa lỗi setup.
- Không tự commit/push khi người dùng chưa yêu cầu; dùng thông điệp tiếng Anh theo Conventional Commits khi cần đề xuất.

## 5. Bàn giao trước khi kết thúc một bước

Giữ file này cho quy ước ổn định; không chép lại toàn bộ tiến độ ở đây. Ghi trạng thái ngắn trong mục 11.1 của `plan.md` khi cập nhật tài liệu nằm trong phạm vi đã được phép; nếu đang chỉ gửi code, gửi luôn đoạn cập nhật để người dùng áp dụng.

Bản bàn giao cần có: ngày cập nhật; mục tiêu nhỏ hiện tại; file cần đọc; phần đã áp dụng; kiểm tra đã chạy và kết quả; việc đang chờ; bước tiếp theo và điều kiện hoàn thành. Thay trạng thái cũ bằng trạng thái mới, giữ bằng chứng lịch sử quan trọng ở mục 10.

Không ghi token, mật khẩu, tiến trình tạm hoặc đường dẫn tuyệt đối của máy vào bàn giao. File này không tự chuyển lịch sử chat hoặc khôi phục tiến trình đang chạy; agent mới phải đọc repository và xác minh thực tế.
