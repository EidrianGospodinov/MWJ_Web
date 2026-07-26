import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '../client';

export type AuditSection =
    | 'Content'
    | 'Rewards'
    | 'Societies'
    | 'Resources'
    | 'User Management'
    | 'Points';

export function logAudit(
    section: AuditSection,
    action: string,
    itemName: string,
    detail?: string
): void {
    void (async () => {
        try {
            if (!client.models.AuditLog) return;
            const actor = await getCurrentUser()
                .then((u) => u.signInDetails?.loginId ?? u.username)
                .catch(() => 'unknown');
            await client.models.AuditLog.create({
                section,
                action,
                itemName,
                detail: detail ?? null,
                actor,
            });
        } catch (err) {
            console.warn('Audit log write failed', err);
        }
    })();
}
