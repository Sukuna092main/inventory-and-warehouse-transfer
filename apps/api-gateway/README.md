# API Gateway

**Trạng thái:** Chưa triển khai.

Điểm vào chung cho web và Android qua `/api/...`: định tuyến tới các service, xác thực JWT sơ bộ, xử lý CORS và correlation ID. Service đích vẫn kiểm tra quyền hiện hành. Gateway không sở hữu database nghiệp vụ.

Công nghệ dự kiến: NestJS với HTTP proxy.

Thư mục hiện chỉ giữ chỗ. Khởi tạo ứng dụng và cài dependency khi bắt đầu phần này theo [kế hoạch](../../plan.md).
