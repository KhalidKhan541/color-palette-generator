// ===== State =====
let currentPalette = [];
let lockedIndices = new Set();
let currentFormat = 'hex';
let currentExportType = 'css';
let selectedColorIndex = null;

// ===== Color Generation Helpers =====
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToCmyk(r, g, b) {
  if (r === 0 && g === 0 && b === 0) return [0, 0, 0, 100];
  const c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255;
  const k = Math.min(c, m, y);
  return [
    Math.round(((c - k) / (1 - k)) * 100),
    Math.round(((m - k) / (1 - k)) * 100),
    Math.round(((y - k) / (1 - k)) * 100),
    Math.round(k * 100)
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function formatColor(r, g, b, fmt) {
  switch (fmt) {
    case 'hex': return rgbToHex(r, g, b);
    case 'rgb': return `rgb(${r}, ${g}, ${b})`;
    case 'hsl': { const [h, s, l] = rgbToHsl(r, g, b); return `hsl(${h}, ${s}%, ${l}%)`; }
    case 'cmyk': { const [c, m, y, k] = rgbToCmyk(r, g, b); return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`; }
    default: return rgbToHex(r, g, b);
  }
}

function randomHue() { return Math.floor(Math.random() * 360); }
function randomSat() { return 50 + Math.floor(Math.random() * 40); }
function randomLit() { return 35 + Math.floor(Math.random() * 35); }

// ===== Palette Generation =====
function generateHarmony(type) {
  const base = randomHue();
  const sat = randomSat();
  const lit = randomLit();
  const hues = [];

  switch (type) {
    case 'monochromatic':
      return Array.from({ length: 5 }, (_, i) => {
        const h = base + (Math.random() * 10 - 5);
        const s = sat + (i - 2) * 8;
        const l = 20 + i * 15;
        return hslToRgb(h, Math.max(20, Math.min(95, s)), Math.max(15, Math.min(85, l)));
      });
    case 'analogous':
      for (let i = 0; i < 5; i++) hues.push(base + (i - 2) * 30);
      return hues.map(h => hslToRgb(((h % 360) + 360) % 360, sat, lit + (Math.random() * 10 - 5)));
    case 'complementary':
      return [0, 1, 2, 3, 4].map(i => {
        const h = i < 3 ? base : base + 180;
        return hslToRgb((h + (i % 3) * 15) % 360, sat + (i * 5), lit + (i - 2) * 12);
      });
    case 'triadic':
      return [0, 1, 2, 3, 4].map(i => {
        const h = base + (i % 3) * 120 + Math.floor(i / 3) * 30;
        return hslToRgb(h % 360, sat, lit + (i - 2) * 10);
      });
    case 'split-complementary':
      return [0, 1, 2, 3, 4].map(i => {
        const offsets = [0, 150, 210, 30, 330];
        return hslToRgb((base + offsets[i]) % 360, sat, lit + (i - 2) * 10);
      });
    default:
      return Array.from({ length: 5 }, () => hslToRgb(randomHue(), randomSat(), randomLit()));
  }
}

function generatePalette() {
  const type = document.getElementById('harmony-select').value;
  const newColors = generateHarmony(type);

  currentPalette = currentPalette.length === 5
    ? currentPalette.map((c, i) => lockedIndices.has(i) ? c : newColors[i])
    : newColors;

  renderPalette();
  updateExport();
  updateHeroBg();
}

function updateHeroBg() {
  const hero = document.getElementById('hero-section');
  const colors = currentPalette.map(c => rgbToHex(...c));
  hero.style.background = `linear-gradient(135deg, ${colors[0]}22, ${colors[2]}15, ${colors[4]}10)`;
}

// ===== Rendering =====
function renderPalette() {
  const container = document.getElementById('palette-display');
  container.innerHTML = '';

  currentPalette.forEach((rgb, i) => {
    const hex = rgbToHex(...rgb);
    const col = document.createElement('div');
    col.className = `color-column${lockedIndices.has(i) ? ' locked' : ''}`;
    col.style.background = hex;
    col.setAttribute('data-index', i);

    const textColor = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 150 ? '#000' : '#fff';

    col.innerHTML = `
      <span class="lock-indicator">${lockedIndices.has(i) ? '&#128274;' : ''}</span>
      <span class="color-label" style="color:${textColor}">${formatColor(...rgb, currentFormat)}</span>
      <div class="color-actions">
        <button class="color-action-btn" title="Lock" onclick="event.stopPropagation(); toggleLock(${i})" style="color:${textColor}">${lockedIndices.has(i) ? '&#128274;' : '&#128275;'}</button>
        <button class="color-action-btn" title="Details" onclick="event.stopPropagation(); openDetail(${i})" style="color:${textColor}">&#9432;</button>
      </div>
    `;
    col.addEventListener('click', () => copyColor(rgb));
    container.appendChild(col);
  });
}

// ===== Lock / Unlock =====
function toggleLock(index) {
  if (lockedIndices.has(index)) lockedIndices.delete(index);
  else lockedIndices.add(index);
  renderPalette();
}

// ===== Copy =====
function copyColor(rgb) {
  const text = formatColor(...rgb, currentFormat);
  navigator.clipboard.writeText(text).then(() => showToast(`Copied: ${text}`));
}

// ===== Format Switching =====
function updateDisplayFormats() {
  currentFormat = document.getElementById('format-select').value;
  renderPalette();
}

// ===== Detail Panel =====
function openDetail(index) {
  selectedColorIndex = index;
  const [r, g, b] = currentPalette[index];
  const hex = rgbToHex(r, g, b);
  const panel = document.getElementById('detail-panel');

  document.getElementById('detail-preview').style.background = hex;
  document.getElementById('detail-title').textContent = `Color ${index + 1}`;
  document.getElementById('color-picker').value = hex;

  const formats = ['hex', 'rgb', 'hsl', 'cmyk'];
  document.getElementById('detail-formats').innerHTML = formats.map(f => `
    <div class="format-card" onclick="copyDetailFormat('${f}')">
      <div class="format-label">${f.toUpperCase()}</div>
      <div class="format-value">${formatColor(r, g, b, f)}</div>
    </div>
  `).join('');

  // Accessibility contrast check
  const whiteRatio = getContrastRatio(r, g, b, 255, 255, 255);
  const blackRatio = getContrastRatio(r, g, b, 0, 0, 0);
  document.getElementById('detail-contrast').innerHTML = `
    <div style="margin-bottom:8px;font-weight:600;color:#fff">Accessibility Check</div>
    <div>vs White: <strong>${whiteRatio.toFixed(2)}:1</strong>
      <span class="contrast-badge ${whiteRatio >= 4.5 ? 'contrast-pass' : 'contrast-fail'}">${whiteRatio >= 4.5 ? 'AA Pass' : 'AA Fail'}</span>
    </div>
    <div style="margin-top:6px">vs Black: <strong>${blackRatio.toFixed(2)}:1</strong>
      <span class="contrast-badge ${blackRatio >= 4.5 ? 'contrast-pass' : 'contrast-fail'}">${blackRatio >= 4.5 ? 'AA Pass' : 'AA Fail'}</span>
    </div>
  `;

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });
}

function closeDetail() {
  document.getElementById('detail-panel').style.display = 'none';
  selectedColorIndex = null;
}

function copyDetailFormat(fmt) {
  if (selectedColorIndex === null) return;
  const rgb = currentPalette[selectedColorIndex];
  const text = formatColor(...rgb, fmt);
  navigator.clipboard.writeText(text).then(() => showToast(`Copied: ${text}`));
}

function pickerChanged(e) {
  if (selectedColorIndex === null) return;
  const rgb = hexToRgb(e.target.value);
  currentPalette[selectedColorIndex] = rgb;
  renderPalette();
  openDetail(selectedColorIndex);
  updateExport();
}

// ===== Contrast Ratio =====
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(r1, g1, b1, r2, g2, b2) {
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ===== Export =====
function switchExport(type) {
  currentExportType = type;
  document.querySelectorAll('.export-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  updateExport();
}

function updateExport() {
  const colors = currentPalette.map(c => rgbToHex(...c));
  const names = ['primary', 'secondary', 'accent', 'highlight', 'muted'];
  let code = '';

  switch (currentExportType) {
    case 'css':
      code = `:root {\n${colors.map((c, i) => `  --color-${names[i]}: ${c};`).join('\n')}\n}`;
      break;
    case 'scss':
      code = colors.map((c, i) => `$${names[i]}: ${c};`).join('\n');
      break;
    case 'tailwind':
      code = `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${colors.map((c, i) => `        '${names[i]}': '${c}',`).join('\n')}\n      }\n    }\n  }\n}`;
      break;
    case 'json':
      const obj = {};
      colors.forEach((c, i) => obj[names[i]] = c);
      code = JSON.stringify(obj, null, 2);
      break;
  }

  document.getElementById('export-code').textContent = code;
}

function copyExport() {
  const code = document.getElementById('export-code').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('Export code copied!'));
}

// ===== Favorites =====
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('palette_favorites') || '[]'); }
  catch { return []; }
}

function saveFavorites(list) {
  localStorage.setItem('palette_favorites', JSON.stringify(list));
}

function saveFavorite() {
  const colors = currentPalette.map(c => rgbToHex(...c));
  const favs = getFavorites();
  const exists = favs.some(f => JSON.stringify(f.colors) === JSON.stringify(colors));
  if (exists) { showToast('Already in favorites!'); return; }
  favs.unshift({ colors, name: `Palette #${favs.length + 1}`, date: Date.now() });
  if (favs.length > 20) favs.pop();
  saveFavorites(favs);
  showToast('Saved to favorites!');
}

function showFavorites() {
  const section = document.getElementById('favorites-section');
  const trending = document.getElementById('trending-section');
  trending.style.display = 'none';
  section.style.display = 'block';
  renderFavorites();
  section.scrollIntoView({ behavior: 'smooth' });
}

function hideFavorites() {
  document.getElementById('favorites-section').style.display = 'none';
}

function renderFavorites() {
  const favs = getFavorites();
  const grid = document.getElementById('favorites-grid');
  const empty = document.getElementById('empty-favorites');

  if (favs.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = favs.map((fav, idx) => `
    <div class="palette-card" onclick="loadPalette(${idx})">
      <div class="palette-card-colors">
        ${fav.colors.map(c => `<div style="background:${c}"></div>`).join('')}
      </div>
      <div class="palette-card-info">
        <span class="palette-card-name">${fav.name}</span>
        <button class="palette-card-delete" onclick="event.stopPropagation(); deleteFavorite(${idx})" title="Delete">&#10005;</button>
      </div>
    </div>
  `).join('');
}

function loadPalette(index) {
  const favs = getFavorites();
  if (!favs[index]) return;
  currentPalette = favs[index].colors.map(hex => hexToRgb(hex));
  lockedIndices.clear();
  renderPalette();
  updateExport();
  updateHeroBg();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Palette loaded!');
}

function deleteFavorite(index) {
  const favs = getFavorites();
  favs.splice(index, 1);
  saveFavorites(favs);
  renderFavorites();
  showToast('Removed from favorites');
}

// ===== Trending =====
const trendingPalettes = [
  { name: 'Sunset Vibes', colors: ['#ff6b6b', '#ee5a24', '#f0932b', '#ffbe76', '#badc58'] },
  { name: 'Ocean Breeze', colors: ['#0984e3', '#74b9ff', '#00cec9', '#81ecec', '#dfe6e9'] },
  { name: 'Forest Walk', colors: ['#00b894', '#00cec9', '#55efc4', '#81ecec', '#a29bfe'] },
  { name: 'Neon Nights', colors: ['#e056fd', '#686de0', '#30336b', '#22a6b3', '#7ed6df'] },
  { name: 'Berry Fields', colors: ['#6c5ce7', '#a29bfe', '#fd79a8', '#e84393', '#d63031'] },
  { name: 'Arctic Glow', colors: ['#dfe6e9', '#b2bec3', '#636e72', '#74b9ff', '#0984e3'] },
  { name: 'Desert Sand', colors: ['#fab1a0', '#e17055', '#d63031', '#fdcb6e', '#ffeaa7'] },
  { name: 'Electric Dream', colors: ['#6c5ce7', '#00cec9', '#fdcb6e', '#e17055', '#d63031'] },
];

function showTrending() {
  const section = document.getElementById('trending-section');
  const favs = document.getElementById('favorites-section');
  favs.style.display = 'none';
  section.style.display = 'block';

  const grid = document.getElementById('trending-grid');
  grid.innerHTML = trendingPalettes.map((p, idx) => `
    <div class="palette-card" onclick="loadTrending(${idx})">
      <div class="palette-card-colors">
        ${p.colors.map(c => `<div style="background:${c}"></div>`).join('')}
      </div>
      <div class="palette-card-info">
        <span class="palette-card-name">${p.name}</span>
      </div>
    </div>
  `).join('');

  section.scrollIntoView({ behavior: 'smooth' });
}

function loadTrending(index) {
  const p = trendingPalettes[index];
  currentPalette = p.colors.map(hex => hexToRgb(hex));
  lockedIndices.clear();
  renderPalette();
  updateExport();
  updateHeroBg();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Loaded "${p.name}"`);
}

// ===== Toast =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===== Keyboard =====
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    generatePalette();
  }
});

// ===== Init =====
generatePalette();
updateExport();
