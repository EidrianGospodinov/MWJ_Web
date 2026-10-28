// Keep in sync with lib/parse-links.ts in the mobile app.
// Turns plain text into text + link segments.
// Supported:
//   [Book an appointment](https://example.com)   -> link with custom label
//   [Email us](someone@westminster.ac.uk)        -> mailto link with custom label
//   https://example.com  /  www.example.com      -> link shown as typed
//   someone@westminster.ac.uk                    -> mailto link shown as typed
export type LinkSegment = { text: string; url?: string };

const TOKEN_RE =
    /\[([^\]\n]+)\]\(\s*([^)\s]+)\s*\)|((?:https?:\/\/|www\.)[^\s<>()]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;

// Only web, email and phone links are allowed to open.
export function toHref(raw: string): string | null {
    const target = raw.trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(target)) return target;
    if (/^www\./i.test(target)) return `https://${target}`;
    if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(target)) return `mailto:${target}`;
    return null;
}

export function parseLinks(text: string): LinkSegment[] {
    const segments: LinkSegment[] = [];
    let plainStart = 0;
    const pushPlain = (end: number) => {
        if (end > plainStart) segments.push({ text: text.slice(plainStart, end) });
    };

    TOKEN_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOKEN_RE.exec(text)) !== null) {
        const [whole, label, target, bareUrl, email] = match;
        const start = match.index;

        if (label !== undefined) {
            const href = toHref(target);
            if (!href) continue; // not a link we allow: leave it as plain text
            pushPlain(start);
            segments.push({ text: label, url: href });
            plainStart = start + whole.length;
        } else if (bareUrl !== undefined) {
            const cleaned = bareUrl.replace(TRAILING_PUNCTUATION, '');
            pushPlain(start);
            segments.push({ text: cleaned, url: toHref(cleaned)! });
            plainStart = start + cleaned.length;
        } else if (email !== undefined) {
            pushPlain(start);
            segments.push({ text: email, url: `mailto:${email}` });
            plainStart = start + email.length;
        }
    }
    pushPlain(text.length);
    return segments;
}
