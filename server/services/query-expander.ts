/**
 * Server-side query expansion, synonym resolution, and Arabic normalization.
 * Mirrors the client-side search-data.ts logic and makes it available for
 * FTS / trigram queries in PostgreSQL.
 */

// ── Brand synonyms (English key → Arabic/Kurdish/common-misspelling variants) ──
export const BRAND_SYNONYMS: Record<string, string[]> = {
  "omega": ["أوميغا", "اوميغا", "اوميجا", "أوميجا", "اومیغا", "اومیجا"],
  "rolex": ["رولكس", "رولکس", "روليكس", "رولیکس"],
  "seiko": ["سيكو", "سایکو", "سیکو", "سيکو"],
  "casio": ["كاسيو", "کاسیو", "كازيو", "كاسیو"],
  "tag heuer": ["تاغ هوير", "تاج هوير", "تاغ هيور", "تاج هيور", "تاغهوير"],
  "patek philippe": ["باتيك فيليب", "باتک فیلیپ", "باتيك فيلب", "باتیک فیلیپ"],
  "audemars piguet": ["أوديمار بيغيه", "اوديمار بيغيه", "اودیمار پیگه", "أوديمار بيجيه"],
  "cartier": ["كارتييه", "کارتیه", "كارتير", "کارتیر"],
  "breitling": ["بريتلينغ", "بریتلینگ", "بريتلنج", "برایتلینگ"],
  "tissot": ["تيسو", "تیسو", "تيسوت", "تیسوت"],
  "citizen": ["سيتيزن", "سیتیزن", "ستيزن", "ستیزن"],
  "hamilton": ["هاميلتون", "هامیلتون", "هاملتون", "هاملتن"],
  "longines": ["لونجين", "لونجینز", "لونجينز", "لونگینز"],
  "apple": ["آبل", "ابل", "أبل", "ایفون"],
  "samsung": ["سامسونج", "سامسونگ", "سامسنگ"],
  "nike": ["نايكي", "نایکی", "نايك"],
  "adidas": ["اديداس", "ادیداس"],
  "louis vuitton": ["لويس فيتون", "لویس ڤیتون", "لوي فيتون"],
  "gucci": ["غوتشي", "گوچی", "قوتشي"],
  "toyota": ["تويوتا", "تۆیۆتا"],
  "mercedes": ["مرسيدس", "مرسیدس"],
  "bmw": ["بي ام دبليو", "بی ئێم دەبلیو"],
  "iphone": ["آيفون", "ايفون", "أيفون"],
};

// ── Model synonyms ──
export const MODEL_SYNONYMS: Record<string, { brand: string; aliases: string[] }> = {
  "seamaster": { brand: "omega", aliases: ["سيماستر", "سیماستر", "سيمستر", "سی ماستر", "sea master"] },
  "speedmaster": { brand: "omega", aliases: ["سبيدماستر", "سبید ماستر", "سبيد ماستر", "speed master"] },
  "constellation": { brand: "omega", aliases: ["كونستيليشن", "کونستلیشن", "كونستلاشن"] },
  "submariner": { brand: "rolex", aliases: ["سابمارينر", "سابمارینر", "صب مارينر", "sub mariner"] },
  "datejust": { brand: "rolex", aliases: ["ديتجست", "دیتجست", "ديت جست", "date just"] },
  "daytona": { brand: "rolex", aliases: ["دايتونا", "دایتونا", "ديتونا"] },
  "presage": { brand: "seiko", aliases: ["بريساج", "پریساژ", "بريساچ"] },
  "prospex": { brand: "seiko", aliases: ["بروسبكس", "پروسپکس", "بروسبيكس"] },
  "royal oak": { brand: "audemars piguet", aliases: ["رويال اوك", "رویال اوک", "رويل أوك"] },
  "nautilus": { brand: "patek philippe", aliases: ["ناوتيلس", "ناوتیلس", "نوتيلوس"] },
  "carrera": { brand: "tag heuer", aliases: ["كاريرا", "کاریرا", "كريرا"] },
  "monaco": { brand: "tag heuer", aliases: ["موناكو", "موناکو", "مونكو"] },
  "tank": { brand: "cartier", aliases: ["تانك", "تانک", "طانك"] },
  "santos": { brand: "cartier", aliases: ["سانتوس", "سانتوز", "سانتس"] },
};

// ── General concept synonyms (word → equivalents) ──
export const CONCEPT_SYNONYMS: Record<string, string[]> = {
  "phone": ["smartphone", "هاتف", "موبايل", "جوال", "تلفون", "mobile"],
  "smartphone": ["phone", "هاتف", "موبايل", "جوال", "تلفون", "mobile"],
  "هاتف": ["phone", "smartphone", "موبايل", "جوال", "تلفون"],
  "موبايل": ["phone", "smartphone", "هاتف", "جوال", "تلفون"],
  "laptop": ["لابتوب", "حاسوب", "لاب توب", "notebook"],
  "لابتوب": ["laptop", "حاسوب", "لاب توب", "notebook"],
  "computer": ["كمبيوتر", "حاسوب", "كمبيوتر"],
  "كمبيوتر": ["computer", "حاسوب"],
  "watch": ["ساعة", "ساعات", "timepiece", "wristwatch"],
  "ساعة": ["watch", "ساعات", "timepiece"],
  "ساعات": ["watch", "ساعة", "watches"],
  "car": ["سيارة", "سيارات", "vehicle", "مركبة", "auto"],
  "سيارة": ["car", "سيارات", "vehicle"],
  "jewelry": ["مجوهرات", "jewellery", "ذهب"],
  "مجوهرات": ["jewelry", "jewellery", "ذهب"],
  "shoes": ["حذاء", "أحذية", "footwear"],
  "حذاء": ["shoes", "أحذية", "footwear"],
  "bag": ["حقيبة", "شنطة", "bags"],
  "حقيبة": ["bag", "شنطة", "bags"],
  "headphones": ["سماعات", "earphones", "earbuds"],
  "سماعات": ["headphones", "earphones", "earbuds"],
  "tablet": ["تابلت", "آيباد", "ipad"],
  "تابلت": ["tablet", "آيباد", "ipad"],
};

// ── Category keywords ──
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "ساعات": ["watch", "watches", "ساعة", "ساعات", "وقت", "timepiece", "wristwatch"],
  "إلكترونيات": ["electronics", "الكترونيات", "جهاز", "أجهزة", "phone", "laptop", "computer", "هاتف", "لابتوب", "كمبيوتر"],
  "ملابس": ["clothing", "clothes", "ملابس", "لبس", "fashion", "أزياء", "dress", "فستان"],
  "تحف وأثاث": ["antiques", "furniture", "تحف", "أثاث", "انتيك", "vintage", "فينتاج"],
  "سيارات": ["car", "cars", "سيارة", "سيارات", "vehicle", "مركبة", "auto"],
  "مجوهرات": ["jewelry", "jewellery", "مجوهرات", "ذهب", "gold", "diamond", "ألماس"],
  "أحذية": ["shoes", "shoe", "حذاء", "أحذية", "footwear", "sneakers", "سنيكرز", "بوط", "boots", "sandals", "صندل"],
};

/**
 * Normalize Arabic text: unify hamza variants, taa-marbuta, diacritics etc.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ی")
    .replace(/[ة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ی")
    .replace(/[\u064B-\u065F]/g, "") // strip diacritics
    .trim();
}

/**
 * Compute Levenshtein (edit) distance between two strings.
 * Used for fuzzy matching of brand/model names against user input.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/**
 * Maximum allowed edit distance for fuzzy matching, scaled by word length.
 * Short words (<=4 chars): 1 edit. Longer words: ~1 edit per 4 chars.
 */
function fuzzyThreshold(wordLength: number): number {
  return Math.max(1, Math.floor(wordLength / 4));
}

/**
 * Result of query expansion.
 */
export interface ExpandedQuery {
  /** Original raw query (trimmed) */
  raw: string;
  /** Normalized (Arabic-safe) version */
  normalized: string;
  /** All terms to search for (original + synonyms) */
  allTerms: string[];
  /** Detected brand (English key) if any */
  brand: string | null;
  /** Detected model if any */
  model: string | null;
  /** Detected category if any */
  category: string | null;
  /** Terms joined with ' | ' for use in to_tsquery */
  tsqueryString: string;
}

/**
 * Expand a raw search query into synonyms, detected brand/model/category,
 * and a tsquery string suitable for PostgreSQL full-text search.
 */
export function expandQuery(rawQuery: string): ExpandedQuery {
  const raw = rawQuery.trim();
  const normalized = normalizeArabic(raw.toLowerCase());
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);

  const allTerms = new Set<string>();
  allTerms.add(raw.toLowerCase());

  let brand: string | null = null;
  let model: string | null = null;
  let category: string | null = null;

  // Try to match the full query against brands
  for (const [brandKey, synonyms] of Object.entries(BRAND_SYNONYMS)) {
    const brandNorm = normalizeArabic(brandKey.toLowerCase());
    if (normalized === brandNorm || normalized.includes(brandNorm)) {
      brand = brandKey;
      allTerms.add(brandKey);
      synonyms.forEach(s => allTerms.add(s.toLowerCase()));
      break;
    }
    for (const syn of synonyms) {
      const synNorm = normalizeArabic(syn.toLowerCase());
      if (normalized === synNorm || normalized.includes(synNorm)) {
        brand = brandKey;
        allTerms.add(brandKey);
        synonyms.forEach(s => allTerms.add(s.toLowerCase()));
        break;
      }
    }
    if (brand) break;
  }

  // Try individual tokens against brands (for multi-word queries like "rolex submariner")
  if (!brand) {
    for (const token of tokens) {
      const tokenNorm = normalizeArabic(token);
      for (const [brandKey, synonyms] of Object.entries(BRAND_SYNONYMS)) {
        const brandNorm = normalizeArabic(brandKey.toLowerCase());
        if (tokenNorm === brandNorm) {
          brand = brandKey;
          allTerms.add(brandKey);
          synonyms.forEach(s => allTerms.add(s.toLowerCase()));
          break;
        }
        for (const syn of synonyms) {
          if (tokenNorm === normalizeArabic(syn.toLowerCase())) {
            brand = brandKey;
            allTerms.add(brandKey);
            synonyms.forEach(s => allTerms.add(s.toLowerCase()));
            break;
          }
        }
        if (brand) break;
      }
      if (brand) break;
    }
  }

  // Fuzzy second-pass for brands: catch misspellings like ستزن → citizen (via ستيزن)
  if (!brand) {
    let bestDist = Infinity;
    let bestBrandKey: string | null = null;
    for (const token of tokens) {
      if (token.length < 3) continue; // skip very short tokens to avoid false positives
      const tokenNorm = normalizeArabic(token);
      for (const [brandKey, synonyms] of Object.entries(BRAND_SYNONYMS)) {
        // Check against the English brand key
        const brandNorm = normalizeArabic(brandKey.toLowerCase());
        const distBrand = levenshteinDistance(tokenNorm, brandNorm);
        const threshBrand = fuzzyThreshold(brandNorm.length);
        if (distBrand <= threshBrand && distBrand < bestDist) {
          bestDist = distBrand;
          bestBrandKey = brandKey;
        }
        // Check against each synonym
        for (const syn of synonyms) {
          const synNorm = normalizeArabic(syn.toLowerCase());
          const distSyn = levenshteinDistance(tokenNorm, synNorm);
          const threshSyn = fuzzyThreshold(synNorm.length);
          if (distSyn <= threshSyn && distSyn < bestDist) {
            bestDist = distSyn;
            bestBrandKey = brandKey;
          }
        }
      }
    }
    if (bestBrandKey) {
      brand = bestBrandKey;
      allTerms.add(bestBrandKey);
      BRAND_SYNONYMS[bestBrandKey].forEach(s => allTerms.add(s.toLowerCase()));
    }
  }

  // Try to match models
  for (const token of tokens) {
    const tokenNorm = normalizeArabic(token);
    for (const [modelKey, data] of Object.entries(MODEL_SYNONYMS)) {
      const modelNorm = normalizeArabic(modelKey.toLowerCase());
      if (tokenNorm === modelNorm) {
        model = modelKey;
        if (!brand) brand = data.brand;
        allTerms.add(modelKey);
        data.aliases.forEach(a => allTerms.add(a.toLowerCase()));
        break;
      }
      for (const alias of data.aliases) {
        if (tokenNorm === normalizeArabic(alias.toLowerCase())) {
          model = modelKey;
          if (!brand) brand = data.brand;
          allTerms.add(modelKey);
          data.aliases.forEach(a => allTerms.add(a.toLowerCase()));
          break;
        }
      }
      if (model) break;
    }
    if (model) break;
  }

  // Also match full query against models (for "royal oak" as two words)
  if (!model) {
    for (const [modelKey, data] of Object.entries(MODEL_SYNONYMS)) {
      const modelNorm = normalizeArabic(modelKey.toLowerCase());
      if (normalized === modelNorm || normalized.includes(modelNorm)) {
        model = modelKey;
        if (!brand) brand = data.brand;
        allTerms.add(modelKey);
        data.aliases.forEach(a => allTerms.add(a.toLowerCase()));
        break;
      }
    }
  }

  // Fuzzy second-pass for models: catch misspellings
  if (!model) {
    let bestDist = Infinity;
    let bestModelKey: string | null = null;
    for (const token of tokens) {
      if (token.length < 3) continue;
      const tokenNorm = normalizeArabic(token);
      for (const [modelKey, data] of Object.entries(MODEL_SYNONYMS)) {
        const modelNorm = normalizeArabic(modelKey.toLowerCase());
        const distModel = levenshteinDistance(tokenNorm, modelNorm);
        const threshModel = fuzzyThreshold(modelNorm.length);
        if (distModel <= threshModel && distModel < bestDist) {
          bestDist = distModel;
          bestModelKey = modelKey;
        }
        for (const alias of data.aliases) {
          const aliasNorm = normalizeArabic(alias.toLowerCase());
          const distAlias = levenshteinDistance(tokenNorm, aliasNorm);
          const threshAlias = fuzzyThreshold(aliasNorm.length);
          if (distAlias <= threshAlias && distAlias < bestDist) {
            bestDist = distAlias;
            bestModelKey = modelKey;
          }
        }
      }
    }
    if (bestModelKey) {
      const data = MODEL_SYNONYMS[bestModelKey];
      model = bestModelKey;
      if (!brand) brand = data.brand;
      allTerms.add(bestModelKey);
      data.aliases.forEach(a => allTerms.add(a.toLowerCase()));
      if (brand && BRAND_SYNONYMS[brand]) {
        allTerms.add(brand);
        BRAND_SYNONYMS[brand].forEach(s => allTerms.add(s.toLowerCase()));
      }
    }
  }

  // Concept synonyms for each token
  for (const token of tokens) {
    const tokenLower = token.toLowerCase();
    const concepts = CONCEPT_SYNONYMS[tokenLower];
    if (concepts) {
      concepts.forEach(c => allTerms.add(c.toLowerCase()));
    }
    // Also try normalized Arabic
    const tokenNorm = normalizeArabic(tokenLower);
    if (tokenNorm !== tokenLower) {
      const conceptsNorm = CONCEPT_SYNONYMS[tokenNorm];
      if (conceptsNorm) {
        conceptsNorm.forEach(c => allTerms.add(c.toLowerCase()));
      }
    }
  }

  // Category detection
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const kwNorm = normalizeArabic(kw.toLowerCase());
      if (normalized.includes(kwNorm)) {
        category = cat;
        break;
      }
    }
    if (category) break;
  }

  // Build tsquery string: escape special chars and join with ' | '
  const tsTerms = Array.from(allTerms)
    .filter(t => t.length >= 2) // skip single-char terms
    .map(t => t.replace(/[&|!():*<>'\\]/g, "")) // strip tsquery special chars
    .filter(t => t.length >= 2);

  // Use a simplified approach: join individual words with |
  const tsqueryString = tsTerms.length > 0 ? tsTerms.join(" | ") : raw;

  return {
    raw,
    normalized,
    allTerms: Array.from(allTerms),
    brand,
    model,
    category,
    tsqueryString,
  };
}

/**
 * Build a search query string from Gemini image analysis results.
 * Used to route image search through the same text-search pipeline.
 */
export function buildSearchQueryFromAnalysis(analysis: {
  brand: string | null;
  model: string | null;
  itemType: string;
  category: string;
  keywords: string[];
  colors: string[];
  material: string | null;
}): string {
  const parts: string[] = [];

  if (analysis.brand) parts.push(analysis.brand);
  if (analysis.model) parts.push(analysis.model);
  if (parts.length === 0) {
    // No brand/model — use item type and top keywords
    if (analysis.itemType && analysis.itemType !== "unknown") {
      parts.push(analysis.itemType);
    }
    // Add up to 3 keywords for breadth
    const kws = (analysis.keywords || []).filter(k => k.length >= 2).slice(0, 3);
    parts.push(...kws);
  }

  return parts.join(" ");
}
