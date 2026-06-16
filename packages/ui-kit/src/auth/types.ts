export type SharedUserRole =
    | 'engineer'
    | 'lead'
    | 'approver'
    | 'viewer'
    | 'division_manager'
    | 'admin';

export interface SharedUser {
    id: string;
    username?: string;
    name: string;
    initials?: string;
    email: string;
    role: SharedUserRole;
    status: 'active' | 'inactive';
    avatarUrl?: string;
}

export interface SharedCredential {
    userId: string;
    username: string;
    password: string;
}

export interface SharedAuthSession {
    user: SharedUser;
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    source: 'api' | 'fallback';
}

export interface StoredSharedAuthSession {
    user: SharedUser;
    accessToken: string;
    tokenType: string;
    source: 'api' | 'fallback';
    sessionExpiresAt: number;
}
