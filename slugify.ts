// Arabic-aware slug generator
export default function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Arabic to transliterated slug
    .replace(/[\u0600-\u06FF]/g, (char) => {
      const map: Record<string, string> = {
        '\u0623': 'a', '\u0625': 'i', '\u0627': 'a', '\u0628': 'b', '\u062A': 't',
        '\u062B': 'th', '\u062C': 'j', '\u062D': 'h', '\u062E': 'kh', '\u062F': 'd',
        '\u0630': 'dh', '\u0631': 'r', '\u0632': 'z', '\u0633': 's', '\u0634': 'sh',
        '\u0635': 's', '\u0636': 'd', '\u0637': 't', '\u0638': 'z', '\u0639': 'a',
        '\u063A': 'gh', '\u0641': 'f', '\u0642': 'q', '\u0643': 'k', '\u0644': 'l',
        '\u0645': 'm', '\u0646': 'n', '\u0647': 'h', '\u0648': 'w', '\u064A': 'y',
        '\u0629': 'h', '\u0649': 'a',
      };
      return map[char] || '';
    })
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    || 'course';
}
