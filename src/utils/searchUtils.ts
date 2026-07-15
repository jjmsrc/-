/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GlossaryItem } from '../types';

// Standard Hangul Jamo lists
const CHO_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];
const JUNG_LIST = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];
const JONG_LIST = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// Map for typing English keys to Korean Jamo
const ENG_TO_KOR_MAP: Record<string, string> = {
  q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ',
  a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
  z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
  Q: 'ㅃ', W: 'ㅉ', E: 'ㄷ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ'
};

// Map for typing Korean Jamo to English keys
const KOR_TO_ENG_MAP: Record<string, string> = {
  'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't', 'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm',
  'ㅃ': 'Q', 'ㅉ': 'W', 'ㄸ': 'E', 'ㄲ': 'R', 'ㅆ': 'T', 'ㅒ': 'O', 'ㅖ': 'P'
};

/**
 * Disassembles a string containing Hangul into individual Korean Jamos.
 * E.g., "패밀리" -> "ㅍㅐㅁㅣㄹㅣ"
 */
export function disassembleHangul(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // If it's a valid Hangul syllable range (0xAC00 ~ 0xD7A3)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00;
      const choIndex = Math.floor(syllableIndex / 588);
      const jungIndex = Math.floor((syllableIndex % 588) / 28);
      const jongIndex = syllableIndex % 28;

      result += CHO_LIST[choIndex] + JUNG_LIST[jungIndex] + JONG_LIST[jongIndex];
    } else {
      result += char.toLowerCase();
    }
  }
  return result;
}

/**
 * Converts English keystrokes into Korean Jamo representations
 * E.g., "voalfl" -> "ㅍㅐㅁㅣㄹㅣ"
 */
export function convertEngToKorLayout(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (ENG_TO_KOR_MAP[char]) {
      result += ENG_TO_KOR_MAP[char];
    } else if (ENG_TO_KOR_MAP[char.toLowerCase()]) {
      result += ENG_TO_KOR_MAP[char.toLowerCase()];
    } else {
      result += char.toLowerCase();
    }
  }
  return result;
}

/**
 * Converts Korean Jamos/Hangul characters to English keystrokes
 * E.g., "ㅐㅏㄱ" -> "okr"
 */
export function convertKorToEngLayout(text: string): string {
  const decompressed = disassembleHangul(text);
  let result = '';
  for (let i = 0; i < decompressed.length; i++) {
    const char = decompressed[i];
    if (KOR_TO_ENG_MAP[char]) {
      result += KOR_TO_ENG_MAP[char];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Disassembles Hangul into only Initial Consonants (초성).
 * E.g., "제품 요구사항 정의서" -> "ㅈㅍ ㅇㄱㅅㅎ ㄷㅇㅅ"
 * Used for consonant quizzes.
 */
export function getHangulConsonants(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00;
      const choIndex = Math.floor(syllableIndex / 588);
      result += CHO_LIST[choIndex];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Match a glossary item with a given query, supporting English/Korean layout error correction.
 */
export function matchGlossary(item: GlossaryItem, query: string): boolean {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return true;

  // Search targets for the glossary item (all disassembled or lowercased)
  const termJamo = disassembleHangul(item.term);
  const abbrevLower = item.abbreviation.toLowerCase();
  const defJamo = disassembleHangul(item.definition);
  const deptLower = item.departments.map(d => d.toLowerCase()).join(' ');

  // Query variations
  // 1. Original query disassembled
  const queryJamo = disassembleHangul(cleanQuery);
  // 2. Query converted from English layout to Korean Jamo (in case user typed in English keyboard by mistake)
  const queryAsKorJamo = disassembleHangul(convertEngToKorLayout(cleanQuery));
  // 3. Query converted from Korean layout to English keys (in case user typed in Korean keyboard by mistake)
  const queryAsEngKeys = convertKorToEngLayout(cleanQuery).toLowerCase();

  // Helper to check substring matching
  const includesAny = (target: string) => {
    return (
      target.includes(queryJamo) ||
      target.includes(queryAsKorJamo) ||
      target.includes(queryAsEngKeys) ||
      target.includes(cleanQuery)
    );
  };

  // Check if any match in Term, Abbrev, Definition, or Department
  return (
    includesAny(termJamo) ||
    includesAny(abbrevLower) ||
    includesAny(defJamo) ||
    includesAny(deptLower)
  );
}
