const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，僅接受 PDF / DOCX / TXT / MD'));
    }
  },
});

router.post('/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });

  try {
    let text = '';
    const { mimetype, buffer } = req.file;

    if (mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // TXT / MD
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) return res.status(422).json({ error: '文件內容為空，無法解析' });
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(422).json({ error: '文件解析失敗：' + err.message });
  }
});

// multer 錯誤處理（文件過大 / 格式不對）
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件超過 10MB 限制' });
  }
  res.status(400).json({ error: err.message });
});

module.exports = router;
