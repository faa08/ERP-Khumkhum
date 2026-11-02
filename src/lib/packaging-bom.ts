import type { PackagingBomStandard } from '@/types/database';
/**
 * KhumKhum Snack Manufacturing ERP
 * Packaging Bill of Materials (BOM Level 3) Engine
 *
 * Logika Standar Komposisi Kemasan:
 * Netto Kemasan = Bobot Jamur Crispy Matang (g) + Bobot Bumbu Tabur (g)
 * Contoh: 75g Balado = 71g Jamur Matang + 4g Bumbu Tabur = 75g Netto
 *         75g Original = 75g Jamur Matang + 0g Bumbu Tabur = 75g Netto
 */

export interface PackagingBomComposition {
  nettoGram: number;
  seasoningGram: number;
  mushroomGram: number;
  isOriginal: boolean;
}

/**
 * Rasio / default gram bumbu tabur untuk ukuran kemasan populer KhumKhum
 * Disesuaikan dengan takaran sendok saji / timbangan SOP pabrik
 */
export const DEFAULT_PACKAGING_BOM_MAP: Record<string, number> = {
  '30g': 2,    // 30g pack: 2g bumbu, 28g jamur
  '50g': 3,    // 50g pack: 3g bumbu, 47g jamur
  '60g': 3.5,  // 60g pack: 3.5g bumbu, 56.5g jamur
  '75g': 4,    // 75g pack: 4g bumbu, 71g jamur (Standard KhumKhum)
  '100g': 5,   // 100g pack: 5g bumbu, 95g jamur
  '150g': 8,   // 150g pack: 8g bumbu, 142g jamur
  '250g': 13,  // 250g pack: 13g bumbu, 237g jamur
  '500g': 25,  // 500g pack: 25g bumbu, 475g jamur
};

/**
 * Mengekstrak angka berat bersih (gram) dari string kemasan (e.g. "75g", "100 gram", "1 kg")
 */
export function parseNettoGram(weightString?: string | null): number {
  if (!weightString) return 60;
  const cleaned = weightString.replace(/\s+/g, '').toLowerCase();

  if (cleaned.includes('kg')) {
    const kgMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*kg/i);
    const num = kgMatch ? parseFloat(kgMatch[1]) : parseFloat(cleaned.replace(/[^\d.]/g, ''));
    return isNaN(num) || num <= 0 ? 1000 : Math.round(num * 1000);
  }

  // Cari angka spesifik di dekat gram/gr/g
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram)/i);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num) && num > 0) return Math.round(num);
  }

  const num = parseFloat(cleaned.replace(/[^\d.]/g, ''));
  return isNaN(num) || num <= 0 ? 60 : Math.round(num);
}

/**
 * Memeriksa apakah varian rasa adalah Original / Polos (tanpa bumbu tabur)
 */
export function isOriginalFlavor(flavor?: string | null): boolean {
  if (!flavor) return true;
  const f = flavor.toLowerCase().trim();
  return (
    f === 'original' ||
    f === 'ori' ||
    f === 'polos' ||
    f.includes('original') ||
    f.includes('polos') ||
    f.includes('tanpa bumbu')
  );
}

/**
 * Mendapatkan takaran bumbu tabur default berdasarkan ukuran kemasan & rasa
 */
export function getDefaultSeasoningGram(weightString?: string | null, flavor?: string | null): number {
  if (isOriginalFlavor(flavor)) return 0;
  const netto = parseNettoGram(weightString);
  const cleanKey = `${netto}g`;

  if (DEFAULT_PACKAGING_BOM_MAP[cleanKey] !== undefined) {
    return DEFAULT_PACKAGING_BOM_MAP[cleanKey];
  }

  // Standar rasio ~5.3% dari netto kemasan (dibulatkan ke 0.5 terdekat, minimal 1g)
  const calc = netto * 0.0533;
  return Math.max(1, Math.round(calc * 2) / 2);
}

/**
 * Format string tag BOM untuk disimpan di deskripsi atau metadata produk
 * Format: [BOM: Jamur 71g, Bumbu 4g]
 */
export function formatBomTag(mushroomGram: number, seasoningGram: number): string {
  return `[BOM: Jamur ${mushroomGram}g, Bumbu ${seasoningGram}g]`;
}

/**
 * Parse tag BOM dari string deskripsi
 */
export function parseBomTag(description?: string | null): { mushroomGram?: number; seasoningGram?: number } | null {
  if (!description) return null;
  const match = description.match(/\[BOM:\s*Jamur\s*([\d.]+)\s*g,\s*Bumbu\s*([\d.]+)\s*g\]/i);
  if (match) {
    const mushroom = parseFloat(match[1]);
    const seasoning = parseFloat(match[2]);
    if (!isNaN(mushroom) && !isNaN(seasoning)) {
      return { mushroomGram: mushroom, seasoningGram: seasoning };
    }
  }
  return null;
}

/**
 * Mendapatkan komposisi resep kemasan lengkap (Netto, Bumbu, Jamur)
 */
export function getPackingBomComposition(params: {
  name?: string | null;
  package_weight?: string | null;
  flavor_variant?: string | null;
  seasoning_gram?: number | null;
  mushroom_gram?: number | null;
  description?: string | null;
  standards?: PackagingBomStandard[];
}): PackagingBomComposition {
  const flavor = params.flavor_variant || params.name;
  const isOriginal = isOriginalFlavor(flavor);
  const rawWeight = params.package_weight || params.name;
  const nettoGram = parseNettoGram(rawWeight);

  if (isOriginal) {
    return {
      nettoGram,
      seasoningGram: 0,
      mushroomGram: nettoGram,
      isOriginal: true,
    };
  }

  const maxAllowedSeasoning = Math.round((nettoGram / 2) * 10) / 10;

  // 1. Jika ada explicit seasoning_gram
  if (params.seasoning_gram !== undefined && params.seasoning_gram !== null && !isNaN(Number(params.seasoning_gram))) {
    const sGram = Math.min(Math.max(0, Number(params.seasoning_gram)), maxAllowedSeasoning);
    const mGram =
      params.mushroom_gram !== undefined && params.mushroom_gram !== null && !isNaN(Number(params.mushroom_gram))
        ? Math.max(0, nettoGram - sGram)
        : Math.max(0, nettoGram - sGram);
    return {
      nettoGram,
      seasoningGram: sGram,
      mushroomGram: mGram,
      isOriginal: false,
    };
  }

  // 2. Jika ada tag [BOM: Jamur Xg, Bumbu Yg] di deskripsi produk
  const parsed = parseBomTag(params.description);
  if (parsed && parsed.seasoningGram !== undefined && parsed.mushroomGram !== undefined) {
    return {
      nettoGram,
      seasoningGram: parsed.seasoningGram,
      mushroomGram: parsed.mushroomGram,
      isOriginal: false,
    };
  }

  // 3. Jika ada standar dari database / settings (PackagingBomStandard)
  if (params.standards && params.standards.length > 0) {
    const key = `${nettoGram}g`;
    const matched = params.standards.find(
      s => parseNettoGram(s.package_size) === nettoGram || s.package_size?.toLowerCase() === key
    );
    if (matched) {
      const sGram = Math.min(Math.max(0, Number(matched.seasoning_gram) || 0), maxAllowedSeasoning);
      const mGram = Math.max(0, nettoGram - sGram);
      return {
        nettoGram,
        seasoningGram: sGram,
        mushroomGram: mGram,
        isOriginal: false,
      };
    }
  }

  // 4. Fallback ke resep standar default
  const defaultSeasoning = getDefaultSeasoningGram(params.package_weight, params.flavor_variant);
  const mushroomGram = Math.max(0, nettoGram - defaultSeasoning);
  return {
    nettoGram,
    seasoningGram: defaultSeasoning,
    mushroomGram,
    isOriginal: false,
  };
}

