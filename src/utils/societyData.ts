export type CommitteeMember = {
    id: string;
    role: string;
    name: string;
};

export type TimetableSession = {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    campus: string;
    location: string;
};

export const DEFAULT_ROLES = [
    'President',
    'Vice Captain',
    'Social Media',
    'Treasurer',
];

export const DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

export const CAMPUSES = [
    'Marylebone',
    'Regent Street',
    'Cavendish',
    'Harrow',
    'Online',
    'Other',
];

function parseJsonArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (typeof raw === 'string' && raw.trim() !== '') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as T[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

export function parseCommittee(raw: unknown, legacyText?: string | null): CommitteeMember[] {
    const parsed = parseJsonArray<CommitteeMember>(raw)
        .filter((m) => m && (m.role || m.name))
        .map((m) => ({
            id: m.id || crypto.randomUUID(),
            role: m.role ?? '',
            name: m.name ?? '',
        }));
    if (parsed.length > 0) return parsed;

    return (legacyText ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const match = line.match(/^(.*?)\s*[-–—:]\s*(.*)$/);
            return {
                id: crypto.randomUUID(),
                role: match ? match[1].trim() : '',
                name: match ? match[2].trim() : line,
            };
        });
}

export function parseTimetable(raw: unknown): TimetableSession[] {
    return parseJsonArray<TimetableSession>(raw)
        .filter((s) => s && (s.day || s.campus || s.location))
        .map((s) => ({
            id: s.id || crypto.randomUUID(),
            day: s.day ?? DAYS[0],
            startTime: s.startTime ?? '',
            endTime: s.endTime ?? '',
            campus: s.campus ?? '',
            location: s.location ?? '',
        }));
}

export function committeeToText(members: CommitteeMember[]): string {
    return members
        .filter((m) => m.name.trim() !== '' || m.role.trim() !== '')
        .map((m) => (m.role.trim() ? `${m.role.trim()} - ${m.name.trim()}` : m.name.trim()))
        .join('\n');
}

export function sessionLabel(s: TimetableSession): string {
    const time = [s.startTime, s.endTime].filter(Boolean).join('–');
    const place = [s.campus, s.location].filter(Boolean).join(', ');
    return [s.day, time, place].filter(Boolean).join(' · ');
}
