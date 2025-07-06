const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('✅ Image to Video Server is running');
});

app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  try {
    console.log('🔥 Nhận yêu cầu tạo video');
    const timestamp = Date.now();
    const output = `output_${timestamp}.mp4`;

    const inputImages = req.files.map(file => file.path);
    const listPath = `list_${timestamp}.txt`;
    const listContent = inputImages.map(p => `file '${path.resolve(p)}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const cmd = `ffmpeg -f concat -safe 0 -i ${listPath} -vsync vfr -pix_fmt yuv420p ${output}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ FFmpeg error:', stderr);
        return res.status(500).send('Video creation failed.');
      }

      const videoBuffer = fs.readFileSync(output);
      res.setHeader('Content-Type', 'video/mp4');
      res.send(videoBuffer);

      // Xóa file tạm
      fs.unlinkSync(listPath);
      fs.unlinkSync(output);
      inputImages.forEach(p => fs.unlinkSync(p));
    });
  } catch (err) {
    console.error('❌ Lỗi xử lý:', err);
    res.status(500).json({ message: 'Lỗi xử lý server.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
