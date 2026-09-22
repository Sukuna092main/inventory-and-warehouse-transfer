# Inventory Service

**Trạng thái:** Chưa triển khai.

Quản lý tồn thực tế, giữ chỗ, tồn khả dụng, khởi tạo/điều chỉnh và lịch sử biến động. Xử lý command từ Transfer qua RabbitMQ và trả kết quả; bảo đảm cập nhật tồn kho nguyên tử và chống xử lý trùng.

Database dự kiến: `inventory_db`, do service này sở hữu.

Thư mục hiện chỉ giữ chỗ. NestJS và dependency sẽ được khởi tạo khi bắt đầu phần này theo [kế hoạch](../../plan.md). Xem [thiết kế database tổng quan](../../docs/database-overview.md).
