import { describe, expect, it } from 'bun:test';
import { loginWithLocalFallback } from './authClient';

describe('loginWithLocalFallback', () => {
    it('accepts the demo engineer account', async () => {
        const session = await loginWithLocalFallback('engineer', 'engineer');

        expect(session.user.username).toBe('engineer');
        expect(session.user.role).toBe('engineer');
        expect(session.source).toBe('fallback');
    });

    it('accepts the demo lead account', async () => {
        const session = await loginWithLocalFallback('lead', 'lead');

        expect(session.user.username).toBe('lead');
        expect(session.user.role).toBe('lead');
        expect(session.source).toBe('fallback');
    });
});
