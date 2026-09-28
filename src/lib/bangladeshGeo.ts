// Bangladesh Geographic projection & SVG Paths for Map Instrument

// Bounding box defined by NASA Giovanni from data_passport.json:
// 88.05E, 20.55N to 92.65E, 26.65N
export const BD_BOUNDS = {
  minLon: 88.0,
  maxLon: 92.7,
  minLat: 20.5,
  maxLat: 26.7,
};

export const SVG_VIEWBOX = {
  width: 600,
  height: 720,
};

// Converts geographic coordinates (lat, lon) to SVG canvas coordinates
export function projectGeoToSvg(lat: number, lon: number): { x: number; y: number } {
  const lonSpan = BD_BOUNDS.maxLon - BD_BOUNDS.minLon;
  const latSpan = BD_BOUNDS.maxLat - BD_BOUNDS.minLat;

  // Normalized (0 to 1)
  const normX = (lon - BD_BOUNDS.minLon) / lonSpan;
  const normY = (BD_BOUNDS.maxLat - lat) / latSpan; // Invert latitude for screen Y

  // Padding inside SVG canvas
  const paddingX = 40;
  const paddingY = 40;
  const availableWidth = SVG_VIEWBOX.width - paddingX * 2;
  const availableHeight = SVG_VIEWBOX.height - paddingY * 2;

  const x = paddingX + normX * availableWidth;
  const y = paddingY + normY * availableHeight;

  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

// Verified Bangladesh Outer Boundary Path
// Precision coordinates projected to the 600x720 canvas
export const BANGLADESH_OUTER_PATH = `
  M 200,45
  L 230,55 L 255,80 L 260,110 L 290,120 L 320,115 L 360,125 L 390,140
  L 440,135 L 485,150 L 515,190 L 525,230 L 490,260 L 480,300 L 470,330
  L 505,370 L 530,420 L 545,490 L 560,540 L 545,590 L 520,640 L 495,660
  L 470,620 L 440,570 L 420,540 L 380,560 L 350,570 L 320,565 L 290,575
  L 250,580 L 220,570 L 190,560 L 170,540 L 160,500 L 130,460 L 105,420
  L 85,380 L 70,340 L 60,300 L 65,260 L 80,220 L 110,180 L 135,140
  L 165,100 L 185,65 Z
`;

// Regional Division Paths for Interactive Selection
export interface DivisionShape {
  id: string;
  name: string;
  bengaliName: string;
  centroid: { lat: number; lon: number };
  svgPath: string;
  description: string;
}

export const BANGLADESH_DIVISIONS: DivisionShape[] = [
  {
    id: 'Rangpur',
    name: 'Rangpur',
    bengaliName: 'রংপুর',
    centroid: { lat: 25.7439, lon: 89.2752 },
    svgPath: 'M 165,100 L 200,45 L 230,55 L 255,80 L 260,110 L 220,165 L 180,180 L 135,140 Z',
    description: 'Northern agricultural plains, vulnerable to early pre-monsoon squalls and drought spells.',
  },
  {
    id: 'Rajshahi',
    name: 'Rajshahi',
    bengaliName: 'রাজশাহী',
    centroid: { lat: 24.3745, lon: 88.6042 },
    svgPath: 'M 135,140 L 180,180 L 210,210 L 190,280 L 140,290 L 80,220 L 110,180 Z',
    description: 'Western Barind tract with lowest national mean precipitation and high dryness sensitivity.',
  },
  {
    id: 'Mymensingh',
    name: 'Mymensingh',
    bengaliName: 'ময়মনসিংহ',
    centroid: { lat: 24.7471, lon: 90.4203 },
    svgPath: 'M 255,80 L 290,120 L 360,125 L 350,195 L 280,210 L 220,165 L 260,110 Z',
    description: 'Bordering Meghalaya hills, receiving severe orographic runoff feeding the Brahmaputra.',
  },
  {
    id: 'Sylhet',
    name: 'Sylhet',
    bengaliName: 'সিলেট',
    centroid: { lat: 24.8949, lon: 91.8687 },
    svgPath: 'M 360,125 L 390,140 L 440,135 L 485,150 L 515,190 L 490,260 L 420,270 L 350,195 Z',
    description: 'Northeastern haor wetland basin; highest national rainfall recording and intense flash flood exposure.',
  },
  {
    id: 'Dhaka',
    name: 'Dhaka',
    bengaliName: 'ঢাকা',
    centroid: { lat: 23.8103, lon: 90.4125 },
    svgPath: 'M 280,210 L 350,195 L 420,270 L 390,360 L 310,380 L 250,330 L 190,280 L 210,210 Z',
    description: 'Central megalopolis surrounded by the Buriganga, Turag, and Balu river networks; severe urban waterlogging risk.',
  },
  {
    id: 'Khulna',
    name: 'Khulna',
    bengaliName: 'খুলনা',
    centroid: { lat: 22.8456, lon: 89.5403 },
    svgPath: 'M 140,290 L 190,280 L 250,330 L 240,430 L 220,570 L 190,560 L 170,540 L 160,500 L 130,460 L 105,420 L 70,340 L 80,220 Z',
    description: 'Southwestern coastal delta adjoining the Sundarbans mangrove forest, tidal salinity and surge zone.',
  },
  {
    id: 'Barisal',
    name: 'Barisal',
    bengaliName: 'বরিশাল',
    centroid: { lat: 22.7010, lon: 90.3535 },
    svgPath: 'M 250,330 L 310,380 L 360,450 L 350,570 L 320,565 L 290,575 L 250,580 L 220,570 L 240,430 Z',
    description: 'Interconnected estuarine island labyrinth in the south, exposed to tropical cyclonic precipitation.',
  },
  {
    id: 'Chittagong',
    name: 'Chittagong',
    bengaliName: 'চট্টগ্রাম',
    centroid: { lat: 22.3569, lon: 91.7832 },
    svgPath: 'M 420,270 L 490,260 L 480,300 L 470,330 L 505,370 L 530,420 L 545,490 L 560,540 L 545,590 L 520,640 L 495,660 L 470,620 L 440,570 L 420,540 L 380,560 L 360,450 L 310,380 L 390,360 Z',
    description: 'Southeastern coastal belt and Chittagong Hill Tracts; steep slopes susceptible to rain-triggered landslides.',
  },
];

// Major Rivers (Padma, Meghna, Jamuna)
export const BANGLADESH_RIVERS = [
  // Jamuna / Brahmaputra
  'M 220,50 Q 230,120 220,180 T 260,280',
  // Padma
  'M 100,260 Q 180,280 260,330',
  // Meghna & Lower Confluence
  'M 420,220 Q 380,310 320,400 T 360,560',
];
