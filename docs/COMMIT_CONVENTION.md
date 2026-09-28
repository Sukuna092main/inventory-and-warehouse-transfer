# Quy ước commit — Inventory & Warehouse Transfer System

Áp dụng [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
Thông điệp commit viết bằng tiếng Anh.

## 1. Cấu trúc

```text
type(scope): short description

Optional explanation.

Optional references.
```

Ví dụ:

```text
feat(mobile): display additional permissions
fix(mobile): keep password input visible above keyboard
docs(repo): add commit conventions
```

Quy ước riêng của dự án:

- Bắt buộc có `type` và `scope`, viết thường.
- Tiêu đề tối đa 72 ký tự, tính cả type và scope.
- Không có dấu chấm cuối tiêu đề.
- Mô tả bắt đầu bằng động từ như `add`, `fix`, `update`, `remove`.
- Body không bắt buộc; dùng để giải thích lý do hoặc thay đổi hành vi.
- Tránh mô tả chung chung như `update code`, `done`, `fix bug`.

## 2. Loại commit

| Type       | Dùng khi                                           |
| ---------- | -------------------------------------------------- |
| `feat`     | Thêm chức năng hoặc khả năng mới                   |
| `fix`      | Sửa hành vi sai hoặc lỗi                           |
| `docs`     | Thay đổi tài liệu                                  |
| `refactor` | Tổ chức lại code, giữ nguyên hành vi               |
| `test`     | Thêm hoặc sửa kiểm thử                             |
| `style`    | Định dạng code: khoảng trắng, dấu nháy, xuống dòng |
| `perf`     | Cải thiện hiệu năng                                |
| `build`    | Thay đổi dependency hoặc cấu hình build            |
| `ci`       | Thay đổi pipeline CI/CD                            |
| `chore`    | Bảo trì khác, chẳng hạn cập nhật `.gitignore`      |
| `revert`   | Hoàn tác commit; ghi SHA được hoàn tác trong body  |

Thay đổi giao diện không mặc định dùng `style`.

Ví dụ:

```text
feat(mobile): add password visibility toggle
fix(mobile): prevent keyboard from covering password input
style(auth): format authentication service
```

Dùng `feat`, không dùng `add` hoặc `feats` làm type.

## 3. Phạm vi

| Scope         | Phạm vi                                            |
| ------------- | -------------------------------------------------- |
| `auth`        | Auth Service, tài khoản, quyền, seed Admin         |
| `product`     | Product Service                                    |
| `warehouse`   | Warehouse Service                                  |
| `inventory`   | Inventory Service                                  |
| `transfer`    | Transfer Service                                   |
| `api-gateway` | API Gateway                                        |
| `web`         | Giao diện web                                      |
| `mobile`      | Ứng dụng Android                                   |
| `db`          | Thiết kế dữ liệu tổng quan, DBML của nhiều service |
| `infra`       | Docker Compose, hạ tầng local                      |
| `deps`        | Dependency chung hoặc của nhiều thành phần         |
| `plan`        | Kế hoạch và theo dõi tiến độ                       |
| `srs`         | Đặc tả yêu cầu                                     |
| `repo`        | Quy ước, cấu hình chung hoặc thay đổi xuyên dự án  |

Scope thể hiện thành phần sở hữu thay đổi. Migration riêng của
Auth dùng `auth`; tài liệu thiết kế database toàn hệ thống dùng `db`.

Ví dụ:

```text
feat(auth): add admin seed command
refactor(auth): replace TypeORM with Prisma
feat(api-gateway): forward authentication requests
feat(web): add login page
feat(mobile): display additional permissions
build(mobile): add Expo vector icons
docs(db): update service database diagram
docs(plan): record Android login progress
```

## 4. Cách chia commit

Mỗi commit nên có một mục đích rõ ràng:

- Có thể commit backend, web và Android riêng khi từng phần hoàn chỉnh.
- Code, migration và kiểm thử phục vụ cùng một thay đổi có thể nằm chung commit.
- Khi thay dependency, đưa manifest và lockfile tương ứng vào cùng commit.
- Tách những thay đổi không liên quan thành các commit riêng.
- Trước khi commit, xem `git diff --staged` và chạy kiểm tra phù hợp.

Ví dụ hai thay đổi độc lập nên tách:

```text
fix(mobile): keep password input visible above keyboard
feat(mobile): display additional permissions
```

Nếu thêm thư viện chỉ để triển khai một chức năng, có thể đưa dependency,
lockfile và code sử dụng vào cùng commit chức năng đó.

## 5. Thay đổi không tương thích

Nếu thay đổi làm client hoặc thành phần khác bắt buộc phải cập nhật,
thêm `!` trước dấu `:` và giải thích trong footer `BREAKING CHANGE`.

Ví dụ minh họa:

```text
feat(auth)!: rename login identifier field

BREAKING CHANGE: login requests must use identifier instead of username.
```

Không dùng `!` chỉ vì thay đổi nhiều file hoặc có migration.

## 6. Tham chiếu yêu cầu

Có thể ghi mã yêu cầu SRS hoặc issue liên quan trong footer.

```text
feat(auth): add user creation endpoint

Refs: FR-AUTH-03
```

Chỉ ghi mã yêu cầu hoặc issue thực sự liên quan.

## 7. Áp dụng

- Áp dụng từ các commit tiếp theo.
- Giữ nguyên lịch sử commit cũ.
- Giai đoạn hiện tại kiểm tra thủ công, chưa cài Husky hoặc commitlint.
- Chọn thông điệp dựa trên nội dung thực tế đã staged.

Commit dành cho tài liệu này:

```text
docs(repo): add commit conventions
```
