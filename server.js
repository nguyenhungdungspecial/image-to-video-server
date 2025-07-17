// Multer cấu hình để lưu ảnh
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Route tạo video dùng danh sách ảnh cụ thể
app.post('/create-video', upload.array('images'), async (req, res) => {
  const files = req.files;
  const description = req.body.description || '';

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Không có ảnh nào được tải lên.' });
  }

  const listFilePath = `uploads/list_${Date.now()}.txt`;
  const outputPath = `uploads/output_${Date.now()}.mp4`;

  // Tạo danh sách ảnh dạng: file 'path/to/file.jpg'
  const listContent = files
    .map((f) => `file '${path.resolve(f.path).replace(/\\/g, '/')}'`)
    .join('\n');
  fs.writeFileSync(listFilePath, listContent);

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -vf "fps=1,format=yuv420p" -c:v libx264 "${outputPath}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ FFmpeg error:', error);
      return res.status(500).json({ error: 'Không thể tạo video.' });
    }

    return res.json({
      videoUrl: `https://${req.headers.host}/${outputPath}`,
    });
  });
});

// Cho phép truy cập thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Route mặc định
app.get('/', (req, res) => {
  res.send('✅ Image to Video Server is running');
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});

