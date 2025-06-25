const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Image to Video Server is running.');
});

app.post('/create-video', upload.array('images', 10), async (req, res) => {
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
        return res.status(500).send('Video creation failed.');
      }

      res.download(output, () => {
        // Clean up
        fs.unlinkSync(output);
        inputImages.forEach(f => fs.unlinkSync(f));
        fs.unlinkSync(listPath);
      });
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('Internal server error.');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
