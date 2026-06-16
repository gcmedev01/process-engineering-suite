'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { Add, Delete, Edit, Lock } from '@mui/icons-material';
import {
    useSharedAuth,
    isFallbackSession,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    type ApiUser,
    type CreateUserPayload,
} from '@eng-suite/ui-kit';

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:8000';

const ROLES = ['engineer', 'lead', 'approver', 'division_manager', 'admin', 'viewer'] as const;
type Role = (typeof ROLES)[number];

function roleLabel(r: string) {
    return { engineer: 'Engineer', lead: 'Lead', approver: 'Approver', division_manager: 'Division Manager', admin: 'Admin', viewer: 'Viewer' }[r] ?? r;
}

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

function ProfileTab() {
    const { currentUser } = useSharedAuth();
    const [name, setName] = useState(currentUser?.name ?? '');
    const [initials, setInitials] = useState(currentUser?.initials ?? '');
    const [email, setEmail] = useState(currentUser?.email ?? '');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Password fields
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSaveProfile = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const { updateMyProfile } = await import('@eng-suite/ui-kit');
            await updateMyProfile(API_BASE, { name: name.trim(), initials: initials.trim() || undefined, email: email.trim() });
            setMsg({ type: 'success', text: 'Profile updated.' });
        } catch (e) {
            setMsg({ type: 'error', text: (e as Error).message });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPw !== confirmPw) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPw.length < 8) {
            setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }
        setPwSaving(true);
        setPwMsg(null);
        try {
            const { changeMyPassword } = await import('@eng-suite/ui-kit');
            await changeMyPassword(API_BASE, currentPw, newPw);
            setPwMsg({ type: 'success', text: 'Password changed successfully.' });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
        } catch (e) {
            setPwMsg({ type: 'error', text: (e as Error).message });
        } finally {
            setPwSaving(false);
        }
    };

    const isOffline = isFallbackSession();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {isOffline && (
                <Alert severity="warning">
                    You are signed in with a local fallback account. Profile changes require a backend connection.
                </Alert>
            )}

            {/* Profile info */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    Profile
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: '1.25rem', fontWeight: 700 }}>
                        {(initials || name || '?').slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography fontWeight={600}>{currentUser?.name}</Typography>
                        <Chip label={roleLabel(currentUser?.role ?? '')} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} />
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Display name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        disabled={isOffline}
                    />
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                        disabled={isOffline}
                    />
                    <TextField
                        label="Initials"
                        value={initials}
                        onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                        fullWidth
                        disabled={isOffline}
                        inputProps={{ maxLength: 4 }}
                        helperText="Up to 4 characters shown in the avatar"
                    />
                    {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveProfile}
                            disabled={saving || isOffline}
                            startIcon={saving ? <CircularProgress size={14} /> : undefined}
                        >
                            Save profile
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Password change */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    Change password
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Current password"
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        fullWidth
                        disabled={isOffline}
                        autoComplete="current-password"
                    />
                    <TextField
                        label="New password"
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        fullWidth
                        disabled={isOffline}
                        autoComplete="new-password"
                    />
                    <TextField
                        label="Confirm new password"
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        fullWidth
                        disabled={isOffline}
                        autoComplete="new-password"
                    />
                    {pwMsg && <Alert severity={pwMsg.type}>{pwMsg.text}</Alert>}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleChangePassword}
                            disabled={pwSaving || isOffline || !currentPw || !newPw || !confirmPw}
                            startIcon={pwSaving ? <CircularProgress size={14} /> : <Lock />}
                        >
                            Change password
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// User Management tab (admin only)
// ---------------------------------------------------------------------------

interface UserDialogProps {
    open: boolean;
    onClose: () => void;
    user?: ApiUser | null;
    onSaved: () => void;
}

function UserDialog({ open, onClose, user, onSaved }: UserDialogProps) {
    const isEdit = !!user;
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [initials, setInitials] = useState('');
    const [role, setRole] = useState<Role>('engineer');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setInitials(user.initials ?? '');
            setRole((user.role as Role) ?? 'engineer');
            setUsername('');
            setPassword('');
        } else {
            setName('');
            setUsername('');
            setEmail('');
            setInitials('');
            setRole('engineer');
            setPassword('');
        }
        setErr(null);
    }, [user, open]);

    const handleSave = async () => {
        setSaving(true);
        setErr(null);
        try {
            if (isEdit && user) {
                await updateUser(API_BASE, user.id, { name, initials: initials || undefined, email, role });
            } else {
                const payload: CreateUserPayload = { name, username, email, password, role, initials: initials || undefined };
                await createUser(API_BASE, payload);
            }
            onSaved();
            onClose();
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? 'Edit user' : 'New user'}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
                {!isEdit && (
                    <TextField
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        required
                        autoComplete="off"
                    />
                )}
                <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required />
                <TextField
                    label="Initials"
                    value={initials}
                    onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                    fullWidth
                    inputProps={{ maxLength: 4 }}
                />
                <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select value={role} onChange={(e) => setRole(e.target.value as Role)} label="Role">
                        {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>{roleLabel(r)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {!isEdit && (
                    <TextField
                        label="Initial password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        required
                        autoComplete="new-password"
                        helperText="Min 8 characters"
                    />
                )}
                {err && <Alert severity="error">{err}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || !name || !email || (!isEdit && (!username || !password))}
                    startIcon={saving ? <CircularProgress size={14} /> : undefined}
                >
                    {isEdit ? 'Save changes' : 'Create user'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function AdminTab() {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editUser, setEditUser] = useState<ApiUser | null>(null);
    const theme = useTheme();
    const isOffline = isFallbackSession();

    const load = async () => {
        setLoading(true);
        setErr(null);
        try {
            setUsers(await fetchUsers(API_BASE));
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOffline) void load();
        else setLoading(false);
    }, [isOffline]);

    const handleDeactivate = async (u: ApiUser) => {
        try {
            await deleteUser(API_BASE, u.id);
            void load();
        } catch (e) {
            setErr((e as Error).message);
        }
    };

    if (isOffline) {
        return (
            <Alert severity="warning">
                User management requires a live backend connection. You are currently using a local fallback session.
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>Users</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => { setEditUser(null); setDialogOpen(true); }}
                >
                    New user
                </Button>
            </Box>

            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Paper>
                    {users.map((u, idx) => (
                        <Box key={u.id}>
                            {idx > 0 && <Divider />}
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 1.5 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {(u.initials || u.name || '?').slice(0, 2).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} noWrap>{u.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{u.email}</Typography>
                                </Box>
                                <Chip
                                    label={roleLabel(u.role)}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem', minWidth: 60 }}
                                />
                                <Chip
                                    label={u.status}
                                    size="small"
                                    color={u.status === 'active' ? 'success' : 'default'}
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => { setEditUser(u); setDialogOpen(true); }}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Deactivate">
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="warning"
                                            onClick={() => handleDeactivate(u)}
                                            disabled={u.status === 'inactive'}
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))}
                    {users.length === 0 && (
                        <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">
                            No users found.
                        </Typography>
                    )}
                </Paper>
            )}

            <UserDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                user={editUser}
                onSaved={load}
            />
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountSettingsPage() {
    const { isAuthenticated, isRestored, currentUser } = useSharedAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isAdmin = currentUser?.role === 'admin';

    const initialTab = searchParams.get('tab') === 'admin' && isAdmin ? 1 : 0;
    const [tab, setTab] = useState(initialTab);

    // Guard — redirect to home if not logged in once the session is restored
    useEffect(() => {
        if (isRestored && !isAuthenticated) {
            router.replace('/');
        }
    }, [isRestored, isAuthenticated, router]);

    if (!isRestored || !isAuthenticated) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Account Settings
            </Typography>

            <Tabs value={tab} onChange={(_, v) => setTab(v as number)} sx={{ mb: 3 }}>
                <Tab label="Profile" />
                {isAdmin && <Tab label="User Management" />}
            </Tabs>

            {tab === 0 && <ProfileTab />}
            {tab === 1 && isAdmin && <AdminTab />}
        </Container>
    );
}
