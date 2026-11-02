/**
 * words.ts — how TripWise's feature names read. "Indian" (the default) uses the Hindi/Sanskrit
 * names, each shown with a plain-English line where it first appears; "English" uses plain words
 * everyone understands — older travellers and Gen Z alike (no slang, no Hindi).
 */

/** The two ways names can read. */
export type NameStyle = 'indian' | 'english';

/** Every feature name the screens show. */
export interface Words {
  toli: string;
  tolis: string;
  sahyatri: string;
  sahyatris: string;
  sahyatra: string;
  /** The Sahyatra's tab (short). */
  sahyatraTab: string;
  sutradhar: string;
  sah: string;
  sujhav: string;
  sujhavs: string;
  tithi: string;
  chaupal: string;
  /** The Chaupal's tab (short). */
  chaupalTab: string;
  anurodh: string;
  lekha: string;
  yatraMarks: string;
  dhara: string;
  dharas: string;
  sangam: string;
  kushal: string;
  potli: string;
}

/** Both sets of names. */
export const WORDS: Record<NameStyle, Words> = {
  indian: {
    toli: 'Toli',
    tolis: 'Tolis',
    sahyatri: 'Sahyatri',
    sahyatris: 'Sahyatris',
    sahyatra: 'Sahyatra',
    sahyatraTab: 'Sahyatra',
    sutradhar: 'Sutradhar',
    sah: 'Sah-Sutradhar',
    sujhav: 'Sujhav',
    sujhavs: 'Sujhavs',
    tithi: 'Tithi',
    chaupal: 'Chaupal',
    chaupalTab: 'Chaupal',
    anurodh: 'Anurodh',
    lekha: 'Lekha',
    yatraMarks: 'Yatra marks',
    dhara: 'Dhara',
    dharas: 'Dharas',
    sangam: 'Sangam',
    kushal: 'Kushal',
    potli: 'Potli',
  },
  english: {
    toli: 'Group',
    tolis: 'Groups',
    sahyatri: 'Member',
    sahyatris: 'Members',
    sahyatra: 'Group trip',
    sahyatraTab: 'Trip',
    sutradhar: 'Leader',
    sah: 'Co-leader',
    sujhav: 'Suggestion',
    sujhavs: 'Suggestions',
    tithi: 'Dates',
    chaupal: 'Group chat',
    chaupalTab: 'Chat',
    anurodh: 'Raise hand',
    lekha: 'Money',
    yatraMarks: 'Travel badges',
    dhara: 'Split group',
    dharas: 'Split groups',
    sangam: 'Meet-up',
    kushal: 'Family check-in',
    potli: 'Packing list',
  },
};

/** "a"/"an" before a word ("a Toli", "an Anurodh"). */
export function article(word: string) {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}
