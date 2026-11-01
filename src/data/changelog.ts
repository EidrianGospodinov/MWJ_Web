// Update log shown on the Update Log page (top-right menu → Update Log).
// Newest entry first. Keep APP_UPDATES in sync with lib/changelog.ts in the
// mobile app repo (LearningReactNative) — the app shows the same list under
// Settings → What's new.

export type UpdateEntry = {
    /** Build/version label. Web entries use the deploy date instead. */
    version?: string;
    /** ISO date, e.g. 2026-11-01 */
    date: string;
    title: string;
    items: string[];
};

export const WEB_UPDATES: UpdateEntry[] = [
    {
        date: '2026-11-01',
        title: 'Update log',
        items: [
            'New Update Log page (top-right menu) listing changes to the web portal and the mobile app.',
        ],
    },
    {
        date: '2026-10-29',
        title: 'Topic categories',
        items: [
            'Modules now have a Topic Category (Getting Started, Study Skills, Wellbeing, Careers & Employability, Campus Life, Money & Finance, General).',
            'The content list shows a Category column.',
            'Categories power the new filter on the app’s Topics tab.',
        ],
    },
    {
        date: '2026-10-28',
        title: 'Links in text',
        items: [
            'Text blocks support links: paste a URL or email address, or write [label](https://…) for a custom label.',
            'Links are rendered as clickable in the content preview and tappable in the app.',
        ],
    },
    {
        date: '2026-09-27',
        title: 'Content types',
        items: [
            'Content Manager supports three types: Module, News and Social post.',
            'News items get a category, cover image or video, and an optional call-to-action link.',
            'Social posts get hashtags and can be pinned to the top of the app’s home feed.',
        ],
    },
    {
        date: '2026-07-26',
        title: 'Accounts, settings and system logs',
        items: [
            'Profile and Settings pages: change password, rows-per-page preference, sign out everywhere.',
            'System Logs page listing audit events and account sign-ups across the app and the portal.',
            'Societies page layout tweaks.',
        ],
    },
    {
        date: '2026-07-22',
        title: 'Societies and resources',
        items: [
            'Societies page: add and edit societies with committee, timetable, logo and social links.',
            'Resources page connected to the live API.',
        ],
    },
    {
        date: '2026-07-14',
        title: 'User management',
        items: [
            'User Management separates app users from web admins.',
            'Content Manager scrolls to the top when editing an item.',
            'Fixed: adding content could save with empty data.',
        ],
    },
    {
        date: '2026-07-04',
        title: 'Dashboard, rewards and content tables',
        items: [
            'Dashboard overview with maintenance and system-health panels.',
            'Rewards tab adjustments; content and reward tables.',
            'Reward claims send an email notification.',
            'App users linked to User Management.',
        ],
    },
    {
        date: '2026-06-30',
        title: 'Live backend',
        items: [
            'Connected the portal to the live backend with media previews.',
            'Rewards admin UI with analytics and claim history.',
            'User management UI.',
        ],
    },
];

export const APP_UPDATES: UpdateEntry[] = [
    {
        version: '1.0.5 (6)',
        date: '2026-11-01',
        title: 'Tester feedback round 1',
        items: [
            'Links in topics, news, posts and society pages are now tappable (web links open in the browser, emails open your mail app).',
            'Topics tab: filter by category and by Completed / Not completed; completed topics show a Done badge.',
            'University dragon on the home screen.',
            'Dark mode: cards and the “Open” / email text are readable on the purple gradient.',
            'Fixed the white-on-white Retake Quiz button in dark mode.',
        ],
    },
    {
        version: '1.0.3 (4)',
        date: '2026-09-27',
        title: 'News and posts',
        items: [
            'Home feed shows News articles and Social posts with images and video.',
            'Chat to us and University Resources updated.',
            'Fixed sign-up emails.',
        ],
    },
    {
        version: '1.0.2 (3)',
        date: '2026-09-24',
        title: 'Societies and resources',
        items: [
            'Society logos and resource thumbnails.',
            'Tab bar respects the Android bottom inset.',
        ],
    },
    {
        version: '1.0.1 (2)',
        date: '2026-09-15',
        title: 'Internal testing release',
        items: [
            'First build on Google Play internal testing.',
            'Staff (@westminster.ac.uk) and student (@my.westminster.ac.uk) emails can sign up.',
        ],
    },
    {
        version: '1.0.0 (1)',
        date: '2026-09-02',
        title: 'First Android build',
        items: [
            'Topics with text, image, video and quiz blocks; points for quizzes (full points first attempt, half on the second).',
            'Profile, My Points and rewards, Theme (light / dark / system), Help & Support.',
            'Explore tab with societies, university resources and campus maps.',
        ],
    },
];
