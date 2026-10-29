export type ContentType = 'Module' | 'News' | 'Social';

export const CONTENT_TYPES: ContentType[] = ['Module', 'News', 'Social'];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    Module: 'Module',
    News: 'News',
    Social: 'Social',
};

export const CONTENT_TYPE_HINTS: Record<ContentType, string> = {
    Module: 'Appears in the app’s Modules tab and opens as a full learning page.',
    News: 'Appears on the app’s Home screen and opens as a full page when tapped.',
    Social: 'Appears inline on the app’s Home feed as a social post. It does not open a page.',
};

// Keep in sync with lib/topic-categories.ts in the mobile app (LearningReactNative).
// The app's Topics tab groups and filters modules by these. "General" is the fallback.
export const TOPIC_CATEGORIES = [
    'Getting Started',
    'Study Skills',
    'Wellbeing',
    'Careers & Employability',
    'Campus Life',
    'Money & Finance',
    'General',
];

export const DEFAULT_TOPIC_CATEGORY = 'General';

export const NEWS_CATEGORIES = [
    'Announcement',
    'Event',
    'Deadline',
    'Opportunity',
    'Campus',
];

export function normaliseContentType(value: unknown): ContentType {
    return value === 'News' || value === 'Social' ? value : 'Module';
}
