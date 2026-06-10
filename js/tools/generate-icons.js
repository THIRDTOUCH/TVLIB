/**
 * 生成 SVG 图标（适配 PWA 所需各种尺寸）
 * 使用方式：node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="film-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fde68a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- 背景 -->
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.18)}" ry="${Math.floor(size * 0.18)}" fill="url(#bg-${size})"/>
  <!-- 电影胶片外框 -->
  <rect x="${size * 0.15}" y="${size * 0.22}" width="${size * 0.7}" height="${size * 0.56}" rx="${size * 0.04}" fill="url(#film-${size})" stroke="#fcd34d" stroke-width="${size * 0.02}"/>
  <!-- 胶片左侧孔洞 -->
  <circle cx="${size * 0.22}" cy="${size * 0.30}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.22}" cy="${size * 0.40}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.22}" cy="${size * 0.50}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.22}" cy="${size * 0.60}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.22}" cy="${size * 0.70}" r="${size * 0.025}" fill="#7c3aed"/>
  <!-- 胶片右侧孔洞 -->
  <circle cx="${size * 0.78}" cy="${size * 0.30}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.78}" cy="${size * 0.40}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.78}" cy="${size * 0.50}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.78}" cy="${size * 0.60}" r="${size * 0.025}" fill="#7c3aed"/>
  <circle cx="${size * 0.78}" cy="${size * 0.70}" r="${size * 0.025}" fill="#7c3aed"/>
  <!-- 画面屏幕 -->
  <rect x="${size * 0.30}" y="${size * 0.32}" width="${size * 0.40}" height="${size * 0.36}" rx="${size * 0.02}" fill="#1a1b26" stroke="#8b5cf6" stroke-width="${size * 0.01}"/>
  <!-- 戏剧脸谱 / 演员剪影（简化为戏剧面具） -->
  <!-- 左面具：喜剧笑脸 -->
  <circle cx="${size * 0.40}" cy="${size * 0.48}" r="${size * 0.06}" fill="#fde68a" stroke="#f59e0b" stroke-width="${size * 0.015}"/>
  <circle cx="${size * 0.385}" cy="${size * 0.46}" r="${size * 0.008}" fill="#1a1b26"/>
  <circle cx="${size * 0.415}" cy="${size * 0.46}" r="${size * 0.008}" fill="#1a1b26"/>
  <path d="M ${size * 0.38} ${size * 0.51} Q ${size * 0.40} ${size * 0.53} ${size * 0.42} ${size * 0.51}" stroke="#1a1b26" stroke-width="${size * 0.015}" fill="none" stroke-linecap="round"/>
  <!-- 右面具：戏剧严肃 -->
  <circle cx="${size * 0.60}" cy="${size * 0.48}" r="${size * 0.06}" fill="#fbbf24" stroke="#d97706" stroke-width="${size * 0.015}"/>
  <circle cx="${size * 0.585}" cy="${size * 0.46}" r="${size * 0.008}" fill="#1a1b26"/>
  <circle cx="${size * 0.615}" cy="${size * 0.46}" r="${size * 0.008}" fill="#1a1b26"/>
  <path d="M ${size * 0.58} ${size * 0.52} Q ${size * 0.60} ${size * 0.50} ${size * 0.62} ${size * 0.52}" stroke="#1a1b26" stroke-width="${size * 0.015}" fill="none" stroke-linecap="round"/>
  <!-- 底部文字：创作 -->
  <rect x="${size * 0.30}" y="${size * 0.73}" width="${size * 0.40}" height="${size * 0.14}" rx="${size * 0.02}" fill="#7c3aed"/>
  <text x="${size * 0.50}" y="${size * 0.835}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${size * 0.08}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">创作</text>
</svg>`;
}

sizes.forEach(size => {
  const content = generateIconSvg(size);
  const filePath = path.join(iconDir, `icon-${size}.svg`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ 已生成: icons/icon-${size}.svg (${size}x${size})`);
});

// 同时生成一个 favicon（使用 192 版本）
fs.copyFileSync(path.join(iconDir, 'icon-192.svg'), path.join(__dirname, 'favicon.svg'));
console.log('✅ 已生成: favicon.svg');

console.log('\n🎉 所有图标生成完成！');
