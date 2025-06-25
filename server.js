const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

// Cho phép gọi từ app
app.use(cors());
app.use(express.json());

// Tạo thư mục uploads nếu chưa có
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.get('/', (req, res) => {
  res.send('✅ Image to Video Server is running.');
});

// API nhận ảnh và tạo video
app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  try {
    const timestamp = Date.now();
    const output = `output_${timestamp}.mp4`;
    const inputImages = req.files.map(file => file.path);

    const listPath = `list_${timestamp}.txt`;
    const listContent = inputImages.map(p => `file '${p}'\nduration 1`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const cmd = `ffmpeg -f concat -safe 0 -i ${listPath} -vsync vfr -pix_fmt yuv420p ${output}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg error:', stderr);
        return res.status(500).json({ error: 'Video creation failed' });
      }

      // Trả về đường dẫn tạm (nếu cần), hoặc link Render nếu triển khai
      res.json({ videoUrl: `https://image-to-video-server.onrender.com/videos/${output}` });

      // Gửi sau mới xoá, đảm bảo video đã tải về client
      setTimeout(() => {
        fs.unlinkSync(output);
        inputImages.forEach(f => fs.unlinkSync(f));
        fs.unlinkSync(listPath);
      }, 60000); // xoá sau 60 giây
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Internal server error.');
  }
});

// Phục vụ video tĩnh
app.use('/videos', express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
