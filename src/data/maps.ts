import { MapId, MapMeta } from '../types/game';

export const MAPS: MapMeta[] = [
  {
    id: 'desert_town',
    index: 1,
    name: 'Cho\'l shaharchasi',
    region: 'Qumli vodiy',
    description: 'Qumli ko\'chalar, qadimiy g\'ishtli binolar, bozor rastalari va tor yo\'laklardan iborat issiq shaharcha.',
    atmosphere: 'Quyoshli issiq kun · Qum changi',
    skyColor: '#D8B384',
    fogColor: '#D6B182',
    accentColor: '#F59E0B',
  },
  {
    id: 'industrial_zone',
    index: 2,
    name: 'Sanoat zonasi',
    region: 'Yuk terminali',
    description: 'Katta omborlar, metall konteynerlar, zavod quvurlari va kranlar joylashgan yirik sanoat majmuasi.',
    atmosphere: 'Bulutli osmon · Mexanik shovqin',
    skyColor: '#6E7A85',
    fogColor: '#66717C',
    accentColor: '#F97316',
  },
  {
    id: 'snow_base',
    index: 3,
    name: 'Qorli baza',
    region: 'Shimoliy tizma',
    description: 'Tog\'lar bilan o\'ralgan, radar antennalari va muzlagan angarlarga ega qorli harbiy tadqiqot bazasi.',
    atmosphere: 'Qor yog\'ishi · Muzdek shamol',
    skyColor: '#BFD3E6',
    fogColor: '#C5D8EA',
    accentColor: '#38BDF8',
  },
  {
    id: 'city_center',
    index: 4,
    name: 'Shahar markazi',
    region: 'Markaziy maydon',
    description: 'Tosh binolar, keng xiyobonlar, markaziy favvora va shahar ko\'chalaridan iborat zamonaviy Yevropa uslubidagi hudud.',
    atmosphere: 'Kunduzgi yorug\'lik · Shahar sadosi',
    skyColor: '#8FBCE6',
    fogColor: '#9AC2E6',
    accentColor: '#EAB308',
  },
  {
    id: 'abandoned_factory',
    index: 5,
    name: 'Tashlandiq zavod',
    region: 'Eski korxona',
    description: 'Yarim qorong\'i sexlar, zanglagan stanoklar va sinib tushgan tomlardan tushuvchi dramatik nurlar.',
    atmosphere: 'Dramatik yoritish · Aks-sado',
    skyColor: '#252930',
    fogColor: '#22262D',
    accentColor: '#FB923C',
    isIndoor: true,
  },
  {
    id: 'tropical_island',
    index: 6,
    name: 'Tropik orol',
    region: 'Janubiy ko\'rfaz',
    description: 'Oltin qumli sohillar, palma daraxtlari, yog\'och prichal va zamonaviy orol villalari.',
    atmosphere: 'Moviy osmon · Dengiz shabadasi',
    skyColor: '#6EC8F5',
    fogColor: '#8CD7F7',
    accentColor: '#14B8A6',
  },
  {
    id: 'underground_facility',
    index: 7,
    name: 'Yer osti majmuasi',
    region: 'Bunker sektori',
    description: 'Futuristik yer osti tadqiqot laboratoriyasi, yorug\' reaktor yadrosi, metall ko\'priklar va server xonalari.',
    atmosphere: 'Futuristik yorug\'lik · Reaktor g\'o\'ng\'illashi',
    skyColor: '#0E1622',
    fogColor: '#101B29',
    accentColor: '#06B6D4',
    isIndoor: true,
  },
  {
    id: 'harbor',
    index: 8,
    name: 'Bandargoh',
    region: 'Dengiz porti',
    description: 'Kema to\'xtash joyi, ulkan port kranlari, rang-barang yuk konteynerlari va omborxonalar.',
    atmosphere: 'Tonggi tuman · Port shovqini',
    skyColor: '#8CA3B8',
    fogColor: '#92A9BD',
    accentColor: '#F97316',
  },
  {
    id: 'mountain_village',
    index: 9,
    name: 'Tog\' qishlog\'i',
    region: 'Baland qoya',
    description: 'Tosh uylar, tor tosh yotqizilgan ko\'chalar, yog\'och ko\'prik va qarag\'aylar bilan o\'ralgan tog\' qishlog\'i.',
    atmosphere: 'Musaffo havo · Tog\' shamoli',
    skyColor: '#9DC5E8',
    fogColor: '#AECFE8',
    accentColor: '#84CC16',
  },
  {
    id: 'night_city',
    index: 10,
    name: 'Tungi shahar',
    region: 'Neon kvartal',
    description: 'Neon yozuvlar bilan bezatilgan osmono\'par binolar, nam asfalt va tungi chiroqlar bilan yoritilgan ko\'chalar.',
    atmosphere: 'Tungi osmon · Neon jilo',
    skyColor: '#090D18',
    fogColor: '#0C1222',
    accentColor: '#EC4899',
    isNight: true,
  },
];

export function getMapMeta(id: MapId): MapMeta {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

// Generate deterministic high-contrast tactical miniature map thumbnails via Canvas 2D
const thumbnailCache = new Map<MapId, string>();

export function getMapThumbnailUrl(map: MapMeta): string {
  const existing = thumbnailCache.get(map.id);
  if (existing) return existing;
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky / backdrop gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 270);
  skyGrad.addColorStop(0, map.isNight ? '#060913' : map.isIndoor ? '#12161D' : map.skyColor);
  skyGrad.addColorStop(0.55, map.fogColor);
  skyGrad.addColorStop(1, '#181B22');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 480, 270);

  // Sun / moon / ceiling light glow
  const glow = ctx.createRadialGradient(360, 62, 6, 360, 62, 110);
  glow.addColorStop(0, map.accentColor);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(200, 0, 280, 200);
  ctx.globalAlpha = 1;

  // Map-specific architectural silhouette
  ctx.fillStyle = map.isNight ? '#0B0F1A' : 'rgba(18, 22, 28, 0.72)';
  if (map.id === 'desert_town') {
    ctx.fillStyle = '#B88D5B';
    ctx.fillRect(0, 170, 480, 100);
    ctx.fillStyle = '#8F6A40';
    ctx.fillRect(30, 110, 95, 75);
    ctx.fillRect(150, 95, 110, 90);
    ctx.fillRect(320, 115, 120, 70);
    ctx.fillStyle = '#5E4325';
    ctx.fillRect(185, 138, 34, 47);
  } else if (map.id === 'industrial_zone' || map.id === 'harbor') {
    ctx.fillStyle = '#36414C';
    ctx.fillRect(0, 175, 480, 95);
    ctx.fillStyle = '#C2410C';
    ctx.fillRect(40, 125, 110, 50);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(165, 130, 95, 45);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(310, 70, 18, 110);
    ctx.fillRect(260, 70, 150, 12);
  } else if (map.id === 'snow_base' || map.id === 'mountain_village') {
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(90, 75);
    ctx.lineTo(190, 150);
    ctx.lineTo(290, 60);
    ctx.lineTo(410, 145);
    ctx.lineTo(480, 90);
    ctx.lineTo(480, 180);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = map.id === 'snow_base' ? '#E2E8F0' : '#4D7C0F';
    ctx.fillRect(0, 175, 480, 95);
    ctx.fillStyle = '#334155';
    ctx.fillRect(180, 128, 120, 52);
  } else if (map.id === 'tropical_island') {
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(0, 165, 480, 105);
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.ellipse(240, 195, 180, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(185, 135, 110, 42);
  } else if (map.id === 'night_city' || map.id === 'city_center') {
    const heights = [120, 160, 95, 175, 130, 155, 110];
    heights.forEach((h, i) => {
      ctx.fillStyle = map.isNight ? '#0F172A' : '#475569';
      ctx.fillRect(20 + i * 64, 185 - h, 52, h);
      ctx.fillStyle = map.isNight ? map.accentColor : '#CBD5E1';
      for (let r = 0; r < 5; r++) {
        ctx.fillRect(30 + i * 64, 195 - h + r * 22, 10, 8);
        ctx.fillRect(48 + i * 64, 195 - h + r * 22, 10, 8);
      }
    });
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 185, 480, 85);
  } else {
    // Indoor factory / underground
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(35, 40, 45, 160);
    ctx.fillRect(400, 40, 45, 160);
    ctx.fillStyle = map.accentColor;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(210, 75, 60, 110);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(0, 195, 480, 75);
  }

  // Subtle tactical grid horizon lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 480; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 185);
    ctx.lineTo(x + (x - 240) * 0.4, 270);
    ctx.stroke();
  }

  const url = canvas.toDataURL('image/jpeg', 0.86);
  thumbnailCache.set(map.id, url);
  return url;
}
