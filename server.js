const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000; // Đặt cổng mặc định là 10000

app.use(cors()); // Cho phép CORS cho các yêu cầu từ bên ngoài
app.use(express.json()); // Hỗ trợ phân tích cú pháp JSON trong request body
app.use(express.urlencoded({ extended: true })); // Hỗ trợ phân tích cú pháp URL-encoded trong request body

// Đảm bảo thư mục 'uploads' tồn tại
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Multer cấu hình để lưu ảnh vào thư mục 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Sử dụng biến UPLOADS_DIR đã kiểm tra và tạo
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Route tạo video dùng danh sách ảnh cụ thể
app.post('/create-video', upload.array('images'), async (req, res) => {
  const files = req.files;
  const description = req.body.description || ''; // Biến này có thể dùng nếu bạn muốn thêm mô tả vào video

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Không có ảnh nào được tải lên.' });
  }

  const timestamp = Date.now();
  const listFilePath = path.join(UPLOADS_DIR, `list_${timestamp}.txt`);
  const outputPath = path.join(UPLOADS_DIR, `output_${timestamp}.mp4`);

  // Tạo danh sách ảnh dạng: file 'path/to/file.jpg' cho FFmpeg
  // Đảm bảo đường dẫn tuyệt đối và sử dụng dấu '/' cho tất cả hệ điều hành (kể cả Windows)
  const listContent = files
    .map((f) => `file '${path.resolve(f.path).replace(/\\/g, '/')}'`)
    .join('\n');
  fs.writeFileSync(listFilePath, listContent);

  // Lệnh FFmpeg để nối các ảnh thành video
  // -y: ghi đè file output nếu đã tồn tại
  // -f concat: định dạng đầu vào là danh sách file
  // -safe 0: cho phép sử dụng đường dẫn tuyệt đối trong danh sách file (quan trọng)
  // -i "${listFilePath}": chỉ định file danh sách đầu vào
  // -vf "fps=1,format=yuv420p": bộ lọc video, 1 khung hình/giây, định dạng pixel yuv420p (tương thích rộng)
  // -c:v libx264: codec video là H.264
  // "${outputPath}": chỉ định đường dẫn file video đầu ra
  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -vf "fps=1,format=yuv420p" -c:v libx264 "${outputPath}"`;

  exec(cmd, (error, stdout, stderr) => {
    // Luôn xóa các file ảnh tạm thời và file danh sách ngay sau khi FFmpeg hoàn tất
    files.forEach(f => {
      if (fs.existsSync(f.path)) {
        fs.unlinkSync(f.path);
      }
    });
    if (fs.existsSync(listFilePath)) {
      fs.unlinkSync(listFilePath);
    }

    if (error) {
      console.error('❌ FFmpeg error:', stderr); // stderr thường chứa thông báo lỗi chi tiết từ FFmpeg
      // Nếu có lỗi, xóa luôn file output nếu nó được tạo ra một phần
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      return res.status(500).json({ error: 'Không thể tạo video.' });
    }

    // Trả về URL của video đã tạo
    // Sử dụng process.env.RENDER_EXTERNAL_HOSTNAME nếu có (cho Render)
    // Nếu không, sử dụng req.headers.host (cho môi trường cục bộ hoặc các host khác)
    // path.basename(outputPath) chỉ lấy tên file (ví dụ: output_12345.mp4)
    const videoUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || req.headers.host}/uploads/${path.basename(outputPath)}`;
    return res.json({ videoUrl });

    // LƯU Ý VỀ DỌN DẸP VIDEO ĐÃ TẠO:
    // Hiện tại, video đã tạo ra (.mp4) không bị xóa ngay lập tức
    // để client có thể tải về từ videoUrl.
    // Nếu bạn muốn tự động xóa các video cũ để tiết kiệm dung lượng,
    // bạn cần thêm một cơ chế dọn dẹp riêng (ví dụ: một Cron Job trên Render
    // chạy định kỳ để xóa các file cũ hơn X giờ/ngày trong thư mục 'uploads').
  });
});

// Cho phép truy cập thư mục 'uploads' từ bên ngoài qua URL
// Ví dụ: https://your-render-app.onrender.com/uploads/output_12345.mp4
app.use('/uploads', express.static(UPLOADS_DIR));

// ✅ Route mặc định để kiểm tra server có đang chạy không
app.get('/', (req, res) => {
  res.send('✅ Image to Video Server is running');
});

// ✅ Khởi động server và lắng nghe trên cổng đã định nghĩa
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});

