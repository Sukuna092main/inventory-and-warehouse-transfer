# Tài liệu dự án

Inventory & Warehouse Transfer System có giao diện web và Android, dùng chung backend qua API Gateway.

## Thứ tự đọc

| Tài liệu | Vai trò |
|---|---|
| [SRS](../SRS_Inventory_Warehouse_Transfer_System_VI.md) | Mục tiêu, phạm vi, vai trò, yêu cầu và tiêu chí nghiệm thu |
| [Kế hoạch](../plan.md) | Stack, kiến trúc triển khai, tiến độ, kiểm thử và nhật ký quyết định |
| [Database tổng quan](./database-overview.md) | Quyền sở hữu dữ liệu, quan hệ và ranh giới transaction |
| [Sơ đồ DBML](./database.dbml) | Sơ đồ để mở bằng dbdiagram |
| [Database Auth](./auth-database-design.md) | Thiết kế tài khoản, quyền bổ sung và audit |
| [Chạy local](./local-development.md) | Cấu hình, migration, seed, khởi động và kiểm tra |
| [API Guide](./api-guide.md) | Gọi API qua Gateway, xác thực và xử lý lỗi |
| [OpenAPI Auth](./api/auth.openapi.json) | Hợp đồng login và tài khoản hiện hành |
| [Quy ước commit](./COMMIT_CONVENTION.md) | Chia commit và viết thông điệp |

## Phạm vi tài liệu hiện có

- BRD: mục tiêu, phạm vi và đối tượng sử dụng nằm trong SRS; chưa tách file.
- Use cases: SRS có tổng quan và luồng nghiệp vụ; tương tác chi tiết bổ sung cùng từng chức năng.
- Kiến trúc: nằm trong SRS và kế hoạch; ranh giới dữ liệu nằm trong database tổng quan.
- Database: có tổng quan năm service và thiết kế chi tiết Auth. Phần chưa triển khai được ghi rõ là đề xuất.
- API: OpenAPI hiện chỉ mô tả login và `/api/auth/me`; các API khác trong SRS chưa mặc nhiên khả dụng.
- UI/UX: chưa có bộ wireframe hoặc UI Guidelines riêng. Hai giao diện dùng tông carton; thiết kế chi tiết bổ sung khi cần.

## Quy tắc duy trì

- SRS là nguồn yêu cầu và tiêu chí nghiệm thu; `plan.md` tổng hợp tiến độ và lịch sử quyết định.
- OpenAPI là nguồn chi tiết request/response đã triển khai. API Guide giải thích cách sử dụng, không sao chép toàn bộ schema.
- Database tổng quan và DBML mô tả thiết kế; Prisma schema và migration thể hiện cấu trúc đã triển khai.
- Hướng dẫn local mô tả cách chạy hiện hành, không ghi lại từng lần cài đặt.
- README của từng thành phần giữ trách nhiệm, cấu trúc và liên kết tới tài liệu chung.
- Khi gộp hoặc đổi tên tài liệu, chuyển đủ thông tin và cập nhật liên kết trước khi xóa file cũ.
- Không đưa mật khẩu, token hoặc khóa ký vào tài liệu.
