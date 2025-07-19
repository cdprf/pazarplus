const express = require("express");
const router = express.Router();

// Generate a simple placeholder image (SVG)
router.get("/:width/:height", (req, res) => {
  const { width, height } = req.params;
  const w = parseInt(width) || 300;
  const h = parseInt(height) || 200;

  // Create a simple SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
      ${w} × ${h}
    </text>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
  res.send(svg);
});

module.exports = router;
