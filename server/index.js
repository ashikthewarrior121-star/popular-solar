const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { PDFDocument, rgb } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 4000;
const HEADER_PATH = path.join(__dirname, '..', 'public', 'header.png');
const FOOTER_PATH = path.join(__dirname, '..', 'public', 'footer.png');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname !== 'pdf' || file.mimetype !== 'application/pdf') {
      return cb(new Error('Please upload a PDF document.'));
    }
    cb(null, true);
  }
});

app.get('/api/health', async (_req, res) => {
  const imageStatus = async (filePath) => {
    try {
      const stat = await fs.stat(filePath);
      return { exists: stat.isFile() && stat.size > 8, size: stat.size };
    } catch {
      return { exists: false, size: 0 };
    }
  };
  const header = await imageStatus(HEADER_PATH);
  const footer = await imageStatus(FOOTER_PATH);
  res.json({
    ok: true, appVersion: 'separate-header-footer-v8',
    headerExists: header.exists, footerExists: footer.exists,
    headerBytes: header.size, footerBytes: footer.size, pdfOnlyUpload: true
  });
});

// Separate cropped header.png and footer.png files are read from the public folder and applied to every page.
app.post('/api/replace', upload.single('pdf'), async (req, res, next) => {
  try {
    const pdfFile = req.file;
    if (!pdfFile) return res.status(400).json({ error: 'Upload a PDF first.' });

    const sourceDoc = await PDFDocument.load(pdfFile.buffer, { ignoreEncryption: false });
    const sourcePages = sourceDoc.getPages();
    if (!sourcePages.length) return res.status(400).json({ error: 'This PDF has no pages.' });

    const outputDoc = await PDFDocument.create();
    const [headerBytes, footerBytes] = await Promise.all([
      fs.readFile(HEADER_PATH).catch(() => { throw new Error('Missing public/header.png. Add your cropped header image with this exact name.'); }),
      fs.readFile(FOOTER_PATH).catch(() => { throw new Error('Missing public/footer.png. Add your cropped footer image with this exact name.'); })
    ]);
    // Detect actual image bytes instead of trusting the extension. This also handles
    // a JPG accidentally saved as header.png/footer.png.
    const embedImage = async (bytes, filename) => {
      if (!bytes || bytes.length < 8) throw new Error(`${path.basename(filename)} is empty. Replace it with your actual cropped image.`);
      const isPng = bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
      if (isPng) return outputDoc.embedPng(bytes);
      if (isJpeg) return outputDoc.embedJpg(bytes);
      throw new Error(`${path.basename(filename)} is not a valid PNG or JPG image. Export it as PNG/JPG and replace the file.`);
    };
    const header = await embedImage(headerBytes, HEADER_PATH);
    const footer = await embedImage(footerBytes, FOOTER_PATH);
    // Copy every original page directly; this preserves the complete page count and page content.
    const copiedPages = await outputDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
    for (const page of copiedPages) outputDoc.addPage(page);

    const pages = outputDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();

      // Preserve each image's aspect ratio. Limit its height so footer/header can never
      // become oversized just because the cropped source image has unusual dimensions.
      const maxBandHeight = height * 0.16;
      const imageSize = (image) => {
        const scale = Math.min(width / image.width, maxBandHeight / image.height);
        return { width: image.width * scale, height: image.height * scale };
      };
      const hs = imageSize(header);
      const fs = imageSize(footer);
      const headerX = (width - hs.width) / 2;
      const footerX = (width - fs.width) / 2;

      // Clear only the exact display bands, not a fixed 19% of the page.
      page.drawRectangle({
        x: 0, y: height - hs.height, width, height: hs.height,
        color: rgb(1, 1, 1), opacity: 1, borderWidth: 0
      });
      page.drawRectangle({
        x: 0, y: 0, width, height: fs.height,
        color: rgb(1, 1, 1), opacity: 1, borderWidth: 0
      });

      page.drawImage(header, {
        x: headerX, y: height - hs.height, width: hs.width, height: hs.height
      });
      page.drawImage(footer, {
        x: footerX, y: 0, width: fs.width, height: fs.height
      });
    }

    const bytes = await outputDoc.save();
    const baseName = path.basename(pdfFile.originalname, path.extname(pdfFile.originalname))
      .replace(/[^a-z0-9-_]/gi, '_').slice(0, 80) || 'document';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}-popular-solar-letterhead.pdf"`);
    res.setHeader('X-PDF-Page-Count', String(sourcePages.length));
    res.send(Buffer.from(bytes));
  } catch (err) {
    if (err?.name === 'EncryptedPDFError' || /encrypt/i.test(err?.message || '')) {
      return res.status(400).json({ error: 'This PDF may be password-protected. Remove the password and try again.', details: err.message, appVersion: 'separate-header-footer-v8' });
    }
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error('[PDF Letterhead Studio]', err.stack || err.message);
  const status = err instanceof multer.MulterError ? 400 : 500;
  const detail = err?.message || String(err) || 'Unknown processing error';
  res.status(status).json({
    error: status === 400 ? detail : `Could not process this PDF: ${detail}`,
    details: detail, appVersion: 'separate-header-footer-v8'
  });
});

app.listen(PORT, () => console.log(`PDF processing API running at http://localhost:${PORT}`));
