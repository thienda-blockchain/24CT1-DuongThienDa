import mongoose from 'mongoose';

// Lệnh đọc giá trị của biến MONGODB được viết trong file .env.local
const MONGODB_URI = process.env.MONGODB_URI;

// Nếu quên chưa tạo file .env.cocal hoặc điền đường link thì báo lỗi ngay
if (!MONGODB_URI) {
  throw new Error('Vui lòng định nghĩa biến MONGODB_URI trong file .env.local');
}

// Global là đối tượng bộ nhớ toàn cầu của môi trường Node.js
// Các biến khai báo thường sẽ bị xóa khi Next.js reload lại trang
// còn biến global thì giữ lại suốt time máy run

// global as any: Cú pháp TypyScript thông báo cho Tp bỏ qua check data biến mongoose
let cached = (global as any).mongoose;

// conn: Biến lưu trữ đối tượng sau khi connect thành công
// Promise: Biến lưu trạng thái "Đang kết nối", để nếu 2-3 người cùng truy cập 1 lúc,
// hệ thóng không tạo 2-3 kết nối trùng
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
// Kiểm tra đã connect xong chưa, nếu đã có sẵn cached.com khác null
// hàm trả về kết nối ngay mà không gọi lại MongoDB
  if (cached.conn) {
    return cached.conn;
  }

  // Nếu chưa có kết nối thì gọi dưới kia
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    // dưới đây nè
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log('✅ Đã kết nối thành công tới MongoDB Atlas (Tuyên Sơn DB)');
      return mongooseInstance;
    });
  }

  try {
    // Chờ việc connect done thì lưu vào cached.conn
    cached.conn = await cached.promise;
  } catch (e) {
    // Nếu nhập sai mật khẩu database or mất mạng thì hủy bỏ ....
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;