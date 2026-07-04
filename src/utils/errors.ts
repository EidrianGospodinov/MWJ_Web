const PATTERNS: [RegExp, string][] = [
    [/network|failed to fetch|timeout/i, 'Connection problem. Check your internet and try again.'],
    [/not authorized|unauthorized|forbidden|access denied/i, 'You do not have permission to do this.'],
    [/token.*(expired|revoked)|session.*expired/i, 'Your session has expired. Please sign in again.'],
    [/user does not exist|usernotfound/i, 'That user could not be found. They may have been deleted.'],
    [/limit ?exceeded|too many requests|throttl/i, 'Too many requests. Wait a moment and try again.'],
    [/conditionalcheckfailed/i, 'This student has no app profile yet, so points cannot be adjusted.'],
];

export function friendlyError(err: unknown, fallback: string): string {
    const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
    if (!raw) return fallback;
    for (const [pattern, message] of PATTERNS) {
        if (pattern.test(raw)) return message;
    }
    if (/^[A-Z]/.test(raw) && raw.length <= 140 && !/exception|arn:|stack ?trace/i.test(raw)) {
        return raw;
    }
    return fallback;
}
