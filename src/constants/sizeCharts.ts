// Brand-specific size charts
// Each row: { uk, us, eu, cm }
// Brands without their own chart fall back to NIKE_CHART (Jordan, Converse, Vans, Puma, Reebok)

export interface SizeRow {
  uk: string;
  us: string;
  eu: string;
  cm: string;
}

export interface BrandSizeChart {
  men: SizeRow[];
  women?: SizeRow[];
  kids?: SizeRow[];
}

// ─── APPAREL SIZE CHARTS ────────────────────────────────────────────────────
// Each row: { size, length, shoulder, chest, sleeve, hem } (all measurements in cm)

export interface ApparelSizeRow {
  size: string;
  length: string;
  shoulder: string;
  chest: string;
  sleeve: string;
  hem: string;
}

export interface ApparelBrandSizeChart {
  rows: ApparelSizeRow[];
}

// Generic apparel size chart (standard streetwear / oversized fit)
const GENERIC_APPAREL_CHART: ApparelBrandSizeChart = {
  rows: [
    { size: "XS", length: "68", shoulder: "46", chest: "106", sleeve: "20",   hem: "106" },
    { size: "S",  length: "70", shoulder: "48", chest: "110", sleeve: "21",   hem: "110" },
    { size: "M",  length: "72", shoulder: "50", chest: "114", sleeve: "22",   hem: "114" },
    { size: "L",  length: "74", shoulder: "52", chest: "118", sleeve: "23",   hem: "118" },
    { size: "XL", length: "76", shoulder: "54", chest: "122", sleeve: "24",   hem: "122" },
    { size: "XXL",length: "78", shoulder: "56", chest: "126", sleeve: "25",   hem: "126" },
    { size: "XXXL",length:"80", shoulder: "58", chest: "130", sleeve: "26",   hem: "130" },
  ],
};

// CLOT apparel size chart (from official CLOT size reference)
const CLOT_APPAREL_CHART: ApparelBrandSizeChart = {
  rows: [
    { size: "S",   length: "72", shoulder: "50", chest: "114", sleeve: "22.5", hem: "114" },
    { size: "M",   length: "74", shoulder: "52", chest: "118", sleeve: "23.5", hem: "118" },
    { size: "L",   length: "76", shoulder: "54", chest: "122", sleeve: "24.5", hem: "122" },
    { size: "XL",  length: "78", shoulder: "56", chest: "126", sleeve: "25.5", hem: "126" },
    { size: "XXL", length: "80", shoulder: "58", chest: "130", sleeve: "26.5", hem: "130" },
  ],
};

// Supreme apparel size chart
const SUPREME_APPAREL_CHART: ApparelBrandSizeChart = {
  rows: [
    { size: "S",   length: "70", shoulder: "47", chest: "108", sleeve: "21",   hem: "108" },
    { size: "M",   length: "72", shoulder: "49", chest: "112", sleeve: "22",   hem: "112" },
    { size: "L",   length: "74", shoulder: "51", chest: "116", sleeve: "23",   hem: "116" },
    { size: "XL",  length: "76", shoulder: "53", chest: "120", sleeve: "24",   hem: "120" },
    { size: "XXL", length: "78", shoulder: "55", chest: "124", sleeve: "25",   hem: "124" },
  ],
};

// Essentials / Fear of God apparel size chart (relaxed fit)
const FOG_APPAREL_CHART: ApparelBrandSizeChart = {
  rows: [
    { size: "XS",  length: "69", shoulder: "46", chest: "108", sleeve: "20",   hem: "108" },
    { size: "S",   length: "71", shoulder: "48", chest: "112", sleeve: "21",   hem: "112" },
    { size: "M",   length: "73", shoulder: "50", chest: "116", sleeve: "22",   hem: "116" },
    { size: "L",   length: "75", shoulder: "52", chest: "120", sleeve: "23",   hem: "120" },
    { size: "XL",  length: "77", shoulder: "54", chest: "124", sleeve: "24",   hem: "124" },
    { size: "XXL", length: "79", shoulder: "56", chest: "128", sleeve: "25",   hem: "128" },
  ],
};

const APPAREL_BRAND_CHART_MAP: Record<string, ApparelBrandSizeChart> = {
  clot:          CLOT_APPAREL_CHART,
  supreme:       SUPREME_APPAREL_CHART,
  "fear of god": FOG_APPAREL_CHART,
  essentials:    FOG_APPAREL_CHART,
  kith:          GENERIC_APPAREL_CHART,
  "off-white":   GENERIC_APPAREL_CHART,
  "stone island":GENERIC_APPAREL_CHART,
  nike:          GENERIC_APPAREL_CHART,
  adidas:        GENERIC_APPAREL_CHART,
};

export function getApparelSizeChart(brand: string): ApparelBrandSizeChart {
  const key = brand?.toLowerCase().trim();
  return APPAREL_BRAND_CHART_MAP[key] ?? GENERIC_APPAREL_CHART;
}

// ─── NIKE ──────────────────────────────────────────────────────────────────
const NIKE_CHART: BrandSizeChart = {
  men: [
    { uk: "6",    us: "7",    eu: "40",   cm: "25"   },
    { uk: "7",    us: "8",    eu: "41",   cm: "26"   },
    { uk: "7.5",  us: "8.5",  eu: "42",   cm: "26.5" },
    { uk: "8",    us: "9",    eu: "42.5", cm: "27"   },
    { uk: "8.5",  us: "9.5",  eu: "43",   cm: "27.5" },
    { uk: "9",    us: "10",   eu: "44",   cm: "28"   },
    { uk: "9.5",  us: "10.5", eu: "44.5", cm: "28.5" },
    { uk: "10",   us: "11",   eu: "45",   cm: "29"   },
    { uk: "10.5", us: "11.5", eu: "45.5", cm: "29.5" },
    { uk: "11",   us: "12",   eu: "46",   cm: "30"   },
    { uk: "12",   us: "13",   eu: "47",   cm: "31"   },
  ],
  women: [
    { uk: "2.5",  us: "5",    eu: "35.5", cm: "22"   },
    { uk: "3",    us: "5.5",  eu: "36",   cm: "22.5" },
    { uk: "3.5",  us: "6",    eu: "36.5", cm: "23"   },
    { uk: "4",    us: "6.5",  eu: "37.5", cm: "23.5" },
    { uk: "4.5",  us: "7",    eu: "38",   cm: "24"   },
    { uk: "5",    us: "7.5",  eu: "38.5", cm: "24.5" },  // ≈ corrected interpolation
    { uk: "5.5",  us: "8",    eu: "39",   cm: "25"   },
    { uk: "6",    us: "8.5",  eu: "40",   cm: "25.5" },
    { uk: "6.5",  us: "9",    eu: "40.5", cm: "26"   },
    { uk: "7",    us: "9.5",  eu: "41",   cm: "26.5" },
    { uk: "7.5",  us: "10",   eu: "42",   cm: "27"   },
  ],
  kids: [
    { uk: "7.5",  us: "8C",   eu: "25",   cm: "15"   },
    { uk: "8.5",  us: "9C",   eu: "26",   cm: "16"   },
    { uk: "9.5",  us: "10C",  eu: "27",   cm: "17"   },
    { uk: "10.5", us: "11C",  eu: "28",   cm: "18"   },
    { uk: "11.5", us: "12C",  eu: "29",   cm: "19"   },
    { uk: "12.5", us: "13C",  eu: "30",   cm: "20"   },
    { uk: "13.5", us: "1Y",   eu: "31",   cm: "21"   },
    { uk: "1.5",  us: "2Y",   eu: "33.5", cm: "22"   },
    { uk: "2.5",  us: "3Y",   eu: "35",   cm: "23"   },
  ],
};

// ─── ADIDAS ────────────────────────────────────────────────────────────────
// Source: Adidas official size guide (UK / EU / US Men / US Women)
const ADIDAS_CHART: BrandSizeChart = {
  men: [
    { uk: "3.5",  us: "4",    eu: "36",   cm: "22"   },
    { uk: "4",    us: "4.5",  eu: "37",   cm: "22.5" },
    { uk: "4.5",  us: "5",    eu: "37.5", cm: "23"   },
    { uk: "5",    us: "5.5",  eu: "38",   cm: "23.5" },
    { uk: "5.5",  us: "6",    eu: "38.5", cm: "24"   },
    { uk: "6",    us: "6.5",  eu: "39.5", cm: "24.5" },
    { uk: "6.5",  us: "7",    eu: "40",   cm: "25"   },
    { uk: "7",    us: "7.5",  eu: "40.5", cm: "25.5" },
    { uk: "7.5",  us: "8",    eu: "41.5", cm: "26"   },
    { uk: "8",    us: "8.5",  eu: "42",   cm: "26.5" },
    { uk: "8.5",  us: "9",    eu: "42.5", cm: "27"   },
    { uk: "9",    us: "9.5",  eu: "43",   cm: "27.5" },
    { uk: "9.5",  us: "10",   eu: "44",   cm: "28"   },
    { uk: "10",   us: "10.5", eu: "44.5", cm: "28.5" },
    { uk: "10.5", us: "11",   eu: "45",   cm: "29"   },
    { uk: "11",   us: "11.5", eu: "45.5", cm: "29.5" },
    { uk: "11.5", us: "12",   eu: "46.5", cm: "30"   },
    { uk: "12",   us: "12.5", eu: "47",   cm: "30.5" },
    { uk: "12.5", us: "13",   eu: "47.5", cm: "31"   },
    { uk: "13.5", us: "14",   eu: "49",   cm: "32"   },
    { uk: "14.5", us: "15",   eu: "50",   cm: "33"   },
    { uk: "15.5", us: "16",   eu: "51",   cm: "34"   },
    { uk: "16.5", us: "17",   eu: "52",   cm: "35"   },
    { uk: "17.5", us: "18",   eu: "53",   cm: "36"   },
  ],
  women: [
    { uk: "2.5",  us: "4",    eu: "35",   cm: "21.5" },
    { uk: "3",    us: "4.5",  eu: "35.5", cm: "22"   },
    { uk: "3.5",  us: "5",    eu: "36",   cm: "22.5" },
    { uk: "4",    us: "5.5",  eu: "36.5", cm: "23"   },
    { uk: "4.5",  us: "6",    eu: "37.5", cm: "23.5" },
    { uk: "5",    us: "6.5",  eu: "38",   cm: "24"   },
    { uk: "5.5",  us: "7",    eu: "38.5", cm: "24.5" },
    { uk: "6",    us: "7.5",  eu: "39.5", cm: "25"   },
    { uk: "6.5",  us: "8",    eu: "40",   cm: "25.5" },
    { uk: "7",    us: "8.5",  eu: "40.5", cm: "26"   },
    { uk: "7.5",  us: "9",    eu: "41.5", cm: "26.5" },
    { uk: "8",    us: "9.5",  eu: "42",   cm: "27"   },
    { uk: "8.5",  us: "10",   eu: "42.5", cm: "27.5" },
  ],
};

// ─── NEW BALANCE ───────────────────────────────────────────────────────────
// Source: New Balance Men's Sizing & Conversion Guide
const NEW_BALANCE_CHART: BrandSizeChart = {
  men: [
    { uk: "3.5",  us: "4",    eu: "36",   cm: "22"   },
    { uk: "4",    us: "4.5",  eu: "37",   cm: "22.5" },
    { uk: "4.5",  us: "5",    eu: "37.5", cm: "23"   },
    { uk: "5",    us: "5.5",  eu: "38",   cm: "23.5" },
    { uk: "5.5",  us: "6",    eu: "38.5", cm: "24"   },
    { uk: "6",    us: "6.5",  eu: "39.5", cm: "24.5" },
    { uk: "6.5",  us: "7",    eu: "40",   cm: "25"   },
    { uk: "7",    us: "7.5",  eu: "40.5", cm: "25.5" },
    { uk: "7.5",  us: "8",    eu: "41.5", cm: "26"   },
    { uk: "8",    us: "8.5",  eu: "42",   cm: "26.5" },
    { uk: "8.5",  us: "9",    eu: "42.5", cm: "27"   },
    { uk: "9",    us: "9.5",  eu: "43",   cm: "27.5" },
    { uk: "9.5",  us: "10",   eu: "44",   cm: "28"   },
    { uk: "10",   us: "10.5", eu: "44.5", cm: "28.5" },
    { uk: "10.5", us: "11",   eu: "45",   cm: "29"   },
    { uk: "11",   us: "11.5", eu: "45.5", cm: "29.5" },
    { uk: "11.5", us: "12",   eu: "46.5", cm: "30"   },
    { uk: "12",   us: "12.5", eu: "47",   cm: "30.5" },
    { uk: "12.5", us: "13",   eu: "47.5", cm: "31"   },
    { uk: "13.5", us: "14",   eu: "49",   cm: "32"   },
    { uk: "14.5", us: "15",   eu: "50",   cm: "33"   },
    { uk: "15.5", us: "16",   eu: "51",   cm: "34"   },
    { uk: "16.5", us: "17",   eu: "52",   cm: "35"   },
    { uk: "17.5", us: "18",   eu: "53",   cm: "36"   },
  ],
  women: [
    { uk: "2.5",  us: "4",    eu: "35",   cm: "21.5" },
    { uk: "3",    us: "4.5",  eu: "35.5", cm: "22"   },
    { uk: "3.5",  us: "5",    eu: "36",   cm: "22.5" },
    { uk: "4",    us: "5.5",  eu: "36.5", cm: "23"   },
    { uk: "4.5",  us: "6",    eu: "37.5", cm: "23.5" },
    { uk: "5",    us: "6.5",  eu: "38",   cm: "24"   },
    { uk: "5.5",  us: "7",    eu: "38.5", cm: "24.5" },
    { uk: "6",    us: "7.5",  eu: "39.5", cm: "25"   },
    { uk: "6.5",  us: "8",    eu: "40",   cm: "25.5" },
    { uk: "7",    us: "8.5",  eu: "40.5", cm: "26"   },
    { uk: "7.5",  us: "9",    eu: "41.5", cm: "26.5" },
    { uk: "8",    us: "9.5",  eu: "42",   cm: "27"   },
    { uk: "8.5",  us: "10",   eu: "42.5", cm: "27.5" },
  ],
};

// ─── ON RUNNING ────────────────────────────────────────────────────────────
// Source: On Running size chart
const ON_CHART: BrandSizeChart = {
  men: [
    { uk: "6.5",  us: "7",    eu: "40",   cm: "25"   },
    { uk: "7",    us: "7.5",  eu: "40.5", cm: "25.5" },
    { uk: "7.5",  us: "8",    eu: "41",   cm: "26"   },
    { uk: "8",    us: "8.5",  eu: "42",   cm: "26.5" },
    { uk: "8.5",  us: "9",    eu: "42.5", cm: "27"   },
    { uk: "9",    us: "9.5",  eu: "43",   cm: "27.5" },
    { uk: "9.5",  us: "10",   eu: "44",   cm: "28"   },
    { uk: "10",   us: "10.5", eu: "44.5", cm: "28.5" },
    { uk: "10.5", us: "11",   eu: "45",   cm: "29"   },
    { uk: "11",   us: "11.5", eu: "46",   cm: "29.5" },
    { uk: "11.5", us: "12",   eu: "47",   cm: "30"   },
    { uk: "12.5", us: "13",   eu: "48",   cm: "31"   },
    { uk: "13.5", us: "14",   eu: "49",   cm: "31.5" },
  ],
  women: [
    { uk: "3",    us: "5",    eu: "36",   cm: "22"   },
    { uk: "3.5",  us: "5.5",  eu: "36.5", cm: "22.5" },
    { uk: "4",    us: "6",    eu: "37",   cm: "23"   },
    { uk: "4.5",  us: "6.5",  eu: "37.5", cm: "23.5" },
    { uk: "5",    us: "7",    eu: "38",   cm: "24"   },
    { uk: "5.5",  us: "7.5",  eu: "38.5", cm: "24.5" },
    { uk: "6",    us: "8",    eu: "39",   cm: "25"   },
    { uk: "6.5",  us: "8.5",  eu: "40",   cm: "25.5" },
    { uk: "7",    us: "9",    eu: "40.5", cm: "26"   },
    { uk: "7.5",  us: "9.5",  eu: "41",   cm: "26.5" },
    { uk: "8",    us: "10",   eu: "42",   cm: "27"   },
    { uk: "8.5",  us: "10.5", eu: "42.5", cm: "27.5" },
    { uk: "9",    us: "11",   eu: "43",   cm: "28"   },
  ],
};

// ─── BRAND → CHART LOOKUP ──────────────────────────────────────────────────
// Any brand not listed here falls back to NIKE_CHART
const BRAND_CHART_MAP: Record<string, BrandSizeChart> = {
  nike:        NIKE_CHART,
  jordan:      NIKE_CHART, // Jordan runs on Nike sizing
  converse:    NIKE_CHART,
  vans:        NIKE_CHART,
  puma:        NIKE_CHART,
  reebok:      NIKE_CHART,
  adidas:      ADIDAS_CHART,
  "new balance": NEW_BALANCE_CHART,
  on:          ON_CHART,
};

export function getSizeChart(brand: string): BrandSizeChart {
  const key = brand?.toLowerCase().trim();
  return BRAND_CHART_MAP[key] ?? NIKE_CHART;
}
