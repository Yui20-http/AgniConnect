const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

const cropAdvice = asyncHandler(async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(503);
    throw new Error('Crop assistant is not configured. Add OPENAI_API_KEY to the backend environment.');
  }
  const question = String(req.body.question || '').trim();
  if (!question && !req.file) {
    res.status(400);
    throw new Error('Add a crop question or a leaf photo.');
  }
  const content = [{ type: 'text', text: `Help an Indian smallholder farmer understand possible crop pests or diseases. User question: ${question || 'Inspect the attached crop photo.'} Give cautious, practical next steps, ask for missing context if needed, suggest low-risk prevention, and recommend local KVK/agricultural officer confirmation. Do not claim certainty from an image or give pesticide dosage.` }];
  if (req.file) {
    const image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    content.push({ type: 'image_url', image_url: { url: image, detail: 'low' } });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_CROP_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content }], max_tokens: 500 }),
  });
  const result = await response.json();
  if (!response.ok) {
    res.status(502);
    throw new Error(result.error?.message || 'Crop assistant request failed.');
  }
  res.json({ success: true, answer: result.choices?.[0]?.message?.content || 'No advice was returned.' });
});

module.exports = { cropAdvice, cropPhotoUpload: upload.single('image') };
