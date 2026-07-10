import type { ITokenEstimator } from '../shared/types';

// ~450 common English character pairs ordered by frequency
// Derived from English corpus bigram frequencies + tech/math symbols
const COMMON_PAIRS = [
  // top English bigrams (by frequency)
  'th','he','in','er','an','re','on','at','en','nd','ti','es','or','te','of',
  'ed','is','it','al','ar','st','to','nt','ng','se','ha','ou','io','le','ve',
  'co','me','de','hi','ri','ro','ic','ne','ea','ra','ce','li','ch','ll','be',
  'ma','si','om','ur','ca','el','ta','la','ns','di','fo','ho','pe','ec','tr',
  'ut','il','ct','pr','no','ss','ac','pa','lo','po','sh','us','mo','ai','ol',
  'os','ig','nc','ad','ci','im','na','ab','em','so','nc','rt','un','am','fi',
  'pl','ot','op','ex','su','bl','do','av','ee','gr','vi','wo','ap','id','ck',
  'ow','fe','up','cr','ry','ke','sp','ev','ag','eg','cl','gh','mp','wa','ep',
  'ob','ir','fu','tu','ld','ff','oc','qu','ip','iv','ay','od','ge','ru','ye',
  'tw','ye','ru','ge','od','ay','iv','ip','qu','oc','ff','ld','tu','fu','ir',
  'ob','ep','wa','mp','gh','cl','eg','ag','ev','sp','ke','ry','cr','up','fe',
  'ow','ck','id','ap','wo','vi','gr','ee','av','do','bl','su','ex','op','ot',
  'pl','fi','am','un','rt','nc','so','em','ab','na','im','ci','ad','nc','ig',
  'os','ol','ai','mo','us','sh','po','lo','pa','ac','ss','no','pr','ct','il',
  'ut','tr','ec','pe','ho','fo','di','ns','la','ta','el','ca','ur','om','si',
  'ma','be','ll','ch','li','ce','ra','ea','ne','ic','ro','ri','hi','de','me',
  'co','ve','le','io','ou','ha','se','ng','nt','to','st','ar','al','it','is',
  'ed','of','te','or','es','ti','nd','en','at','on','re','an','er','in','he',
  // punctuation and symbol combos (for code/math)
  'e ','s ','t ','d ','n ','. ',' a',' t',' i',' o','\n\n','...','.,',
  'qu','ua','ui','ue','uo','au','eu','iu','ou',
  // math/code common
  '=\\','\\t','\\f','\\m','_{','}^','\\s','\\l','\\r','te','xt','_i','_j',
  '^T','\\d','\\c','\\a','\\e','\\p','do','ts','..','$$',
  // numbers
  '12','10','11','20','23','25','30','50','00','01','02','03','04','05',
  '06','07','08','09','19','18','17','16','15','14','13','21','22','24',
  '26','27','28','29','31','32','33','34','35','36','37','38','39','40',
  '42','45','48','51','52','56','60','64','70','75','80','84','90','99',
  '100','200','300','400','500','512','600','700','800','900',
  // common word fragments / trigrams
  'the','and','ing','ion','ent','tio','for','nde','has','nce','edt','tis',
  'oft','sth','men','ons','res','com','ver','pro','pre','tra','con','est',
  'dis','are','ere','ine','per','int','ess','ati','ter','cti','ica','der',
  'ine','cal','ble','ple','man','tor','tiv','ive','tio','ous','ful','cle',
  'ine','ure','age','ate','tic','ant','ist','ity','ise','ize','ify','acy',
  'enc','anc','ary','ery','ory','log','gra','phy','ica','ism','ist','oid',
];

const VOCAB: Map<string, number> = new Map();
for (let i = 0; i < COMMON_PAIRS.length; i++) {
  VOCAB.set(COMMON_PAIRS[i], i);
}

const BYTE_TO_STR: Record<number, string> = {};
for (let i = 0; i < 256; i++) {
  BYTE_TO_STR[i] = String.fromCodePoint(i);
}

export class BPEstimator implements ITokenEstimator {
  estimate(text: string): number {
    if (text.length === 0) return 0;

    const tokens: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 256) {
        tokens.push(BYTE_TO_STR[code]);
      } else {
        tokens.push(text[i]);
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      let bestPair: [number, number] | null = null;
      let bestRank = Infinity;

      for (let i = 0; i < tokens.length - 1; i++) {
        const pairKey = tokens[i] + tokens[i + 1];
        const rank = VOCAB.get(pairKey);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestPair = [i, i + 1];
        }
      }

      if (bestPair !== null) {
        const merged = tokens[bestPair[0]] + tokens[bestPair[1]];
        tokens.splice(bestPair[0], 2, merged);
        // After a merge, try 3-char pair
        if (bestPair[0] > 0) {
          const prev3 = tokens[bestPair[0] - 1] + merged;
          if (!VOCAB.has(prev3) && merged.length >= 2) {
            // no-op: the loop handles this on next iteration
          }
        }
        changed = true;
      }
    }

    return tokens.length;
  }
}
