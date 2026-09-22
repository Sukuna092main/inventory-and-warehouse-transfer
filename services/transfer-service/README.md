# Transfer Service

**Trạng thái:** Chưa triển khai.

Quản lý phiếu chuyển kho, dòng hàng, lịch sử và operation; điều phối tạo nháp, submit, approve, cancel, ship, receive và phục hồi. Gửi command cho Inventory qua RabbitMQ và cập nhật trạng thái theo kết quả; không trực tiếp sửa database của Inventory.

Database dự kiến: `transfer_db`, do service này sở hữu.

Thư mục hiện chỉ giữ chỗ. NestJS và dependency sẽ được khởi tạo khi bắt đầu phần này theo [kế hoạch](../../plan.md). Xem [thiết kế database tổng quan](../../docs/database-overview.md).
