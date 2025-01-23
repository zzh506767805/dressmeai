const fs = require('fs');
const path = require('path');

// 确保目录存在
const imagesDir = path.join(process.cwd(), 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 生成SVG占位图
function generatePlaceholderSVG(width, height, text) {
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#6b7280" text-anchor="middle" dy=".3em">${text}</text>
</svg>
`;
}

// 生成试穿对比图
const beforeAfterPairs = [
  {
    before: 'Casual Look',
    after: 'Professional Style',
    number: 1
  },
  {
    before: 'Basic Outfit',
    after: 'Perfect Fit',
    number: 2
  },
  {
    before: 'Original Style',
    after: 'AI Makeover',
    number: 3
  }
];

beforeAfterPairs.forEach(pair => {
  // 生成before图片
  const beforeSVG = generatePlaceholderSVG(900, 1200, `${pair.before}\n(Before ${pair.number})`);
  fs.writeFileSync(path.join(imagesDir, `before-${pair.number}.svg`), beforeSVG);

  // 生成after图片
  const afterSVG = generatePlaceholderSVG(900, 1200, `${pair.after}\n(After ${pair.number})`);
  fs.writeFileSync(path.join(imagesDir, `after-${pair.number}.svg`), afterSVG);
});

// 生成穿搭推荐图
const outfits = [
  'Business Casual\nOutfit',
  'Weekend Chic\nOutfit',
  'Evening Elegance\nOutfit'
];

outfits.forEach((outfit, index) => {
  const svg = generatePlaceholderSVG(800, 1000, outfit);
  fs.writeFileSync(path.join(imagesDir, `outfit-${index + 1}.svg`), svg);
});

console.log('Placeholder images generated successfully!'); 