# Tích hợp AI nhẹ không yêu cầu API key

## Giới thiệu

Dự án hiện sử dụng dịch vụ AI nhẹ thông qua Puter.js, một giải pháp không yêu cầu API key, cho phép người dùng tận dụng các khả năng của AI mà không phải đăng ký hoặc trả phí API.

## Cách hoạt động

Hệ thống AI hoạt động theo hai cấp độ:

1. **Ưu tiên 1: OpenAI API (nếu có)** - Nếu API key OpenAI được định cấu hình, hệ thống sẽ sử dụng nó đầu tiên
2. **Ưu tiên 2: Puter.js AI** - Khi không có API key OpenAI, ứng dụng tự động chuyển sang sử dụng dịch vụ AI thay thế nhẹ
3. **Dự phòng: Nội dung tĩnh** - Trong trường hợp cả hai dịch vụ trên đều không khả dụng, hệ thống sẽ sử dụng dữ liệu mẫu

## Các tính năng AI có sẵn

- **AI Assistant** - Hỗ trợ lập trình, gợi ý code, giải quyết vấn đề
- **Tạo thử thách** - Tạo bài tập lập trình tự động
- **Phân tích mã** - Đánh giá và đưa ra gợi ý cải thiện mã

## Cách sử dụng

1. Không cần cài đặt thêm - AI đã được tích hợp sẵn
2. Khi gặp vấn đề về code, sử dụng nút "AI Help" trong giao diện trình soạn thảo
3. AI sẽ phân tích mã và đưa ra gợi ý

## Lợi ích

- **Không cần API key** - Không cần đăng ký dịch vụ bên ngoài
- **Nhẹ và nhanh** - Xử lý phía client, tối ưu hóa cho các thiết bị yếu
- **Hoạt động offline** (chế độ dự phòng) - Ngay cả khi mất kết nối vẫn có thể sử dụng các gợi ý cơ bản

## Công nghệ

- **Puter.js** - Thư viện JavaScript nhẹ tích hợp AI không cần API key
- **Client-side integration** - Tất cả xử lý AI đều diễn ra ở phía client
- **Progressive enhancement** - Ứng dụng vẫn hoạt động tốt ngay cả khi không có AI

## Cách dịch vụ AI chọn mô hình

Dịch vụ sẽ tự động chọn mô hình AI phù hợp dựa trên độ khó của nhiệm vụ:

- Nhiệm vụ đơn giản: Sử dụng mô hình nhẹ hơn (gpt-4o-mini/o1-mini)
- Nhiệm vụ phức tạp: Tự động nâng cấp lên mô hình mạnh hơn khi cần

## Giới hạn

- **Internet** - Kết nối internet vẫn cần thiết để sử dụng đầy đủ tính năng AI (nhưng có dự phòng offline)
- **Độ phức tạp** - Mô hình nhẹ có thể không hiệu quả với các vấn đề rất phức tạp
