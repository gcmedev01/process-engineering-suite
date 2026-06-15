"use client";

import {
    Box,
    Typography,
    Chip,
    useTheme,
    IconButton,
    Tooltip,
    Button,
    Paper,
    Stack,
    TextField,
    InputAdornment,
    MenuItem,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Menu,
} from "@mui/material";
import {
    Security,
    Adjust,
    Air,
    Add,
    Search,
    ArrowBack,
    Sort,
    Check,
    ArrowUpward,
    ArrowDownward,
} from "@mui/icons-material";
import { useMemo, useState } from "react";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ProtectiveSystemType, ProtectiveSystem } from "@/data/types";
import { getWorkflowStatusColor, getWorkflowStatusLabel } from "@/lib/statusColors";
import { SortConfig, sortByGetter } from "@/lib/sortUtils";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { formatPressureGauge } from "@/lib/projectUnits";
import { PsvCreationWizard } from "./PsvCreationWizard";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "./shared";

export function ProtectiveSystemList() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { unitSystem } = useProjectUnitSystem();
    const psvList = usePsvStore((state) => state.psvList);
    const selectPsv = usePsvStore((state) => state.selectPsv);
    const selectedProject = usePsvStore((state) => state.selectedProject);
    const selectProject = usePsvStore((state) => state.selectProject);
    const canEdit = useAuthStore((state) => state.canEdit());
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in_review' | 'approved' | 'issued'>('all');
    const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

    type SortKey = 'tag' | 'name' | 'status' | 'setPressure' | 'mawp' | 'designCode' | 'fluidPhase' | 'type';
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey>>({
        key: 'tag',
        direction: 'asc',
    });
    const [wizardOpen, setWizardOpen] = useState(false);

    const filteredPsvs = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        let result = psvList;

        if (query) {
            result = result.filter((psv) => {
                const haystack = [
                    psv.tag,
                    psv.name,
                    psv.type,
                    psv.designCode,
                    psv.fluidPhase,
                    psv.status,
                    psv.serviceFluid,
                    ...(psv.tags ?? []),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            });
        }

        if (statusFilter !== 'all') {
            result = result.filter((psv) => psv.status === statusFilter);
        }

        return result;
    }, [psvList, searchText, statusFilter]);

    const getSortValue = (psv: ProtectiveSystem, key: SortKey): string | number => {
        switch (key) {
            case 'tag': return psv.tag;
            case 'name': return psv.name;
            case 'status': return psv.status;
            case 'type': return psv.type;
            case 'designCode': return psv.designCode;
            case 'fluidPhase': return psv.fluidPhase;
            case 'setPressure': return psv.setPressure;
            case 'mawp': return psv.mawp;
            default: return '';
        }
    };

    const sortedPsvs = useMemo(
        () => sortByGetter(filteredPsvs, sortConfig, getSortValue),
        [filteredPsvs, sortConfig]
    );

    const pagination = usePagination(sortedPsvs, { totalItems: sortedPsvs.length, itemsPerPage: 10 });

    // Status counts
    const draftCount = psvList.filter(p => p.status === 'draft').length;
    const inReviewCount = psvList.filter(p => p.status === 'in_review').length;
    const approvedCount = psvList.filter(p => p.status === 'approved').length;
    const issuedCount = psvList.filter(p => p.status === 'issued').length;

    const getTypeIcon = (type: ProtectiveSystemType) => {
        switch (type) {
            case 'psv': return <Security fontSize="small" />;
            case 'rupture_disc': return <Adjust fontSize="small" />;
            case 'vent_system':
            case 'tank_vent':
            case 'breather_valve': return <Air fontSize="small" />;
            default: return <Security fontSize="small" />;
        }
    };

    const getTypeLabel = (type: ProtectiveSystemType) => {
        switch (type) {
            case 'psv': return 'PSV';
            case 'rupture_disc': return 'RD';
            case 'vent_system': return 'Vent';
            case 'tank_vent': return 'Tank Vent';
            case 'breather_valve': return 'Breather';
            case 'flame_arrestor': return 'Flame Arrestor';
            case 'control_valve': return 'CV';
            case 'prv': return 'PRV';
            default: return (type as string).replace('_', ' ');
        }
    };

    const sortOptions: { key: SortKey; label: string }[] = [
        { key: 'tag', label: 'Tag' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'type', label: 'Type' },
        { key: 'fluidPhase', label: 'Phase' },
        { key: 'setPressure', label: 'Set Pressure' },
    ];

    const handleSortSelect = (key: SortKey) => {
        const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction: newDirection });
        setSortMenuAnchor(null);
    };

    if (!selectedProject) {
        return null;
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Context Block Header */}
            <Paper
                sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    bgcolor: isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.03)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconButton onClick={() => selectProject(null)} size="small" sx={{ mr: 2 }} aria-label="Back to projects">
                        <ArrowBack />
                    </IconButton>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography
                            variant="h6"
                            fontWeight={600}
                            sx={{
                                textDecoration: selectedProject.isActive === false ? 'line-through' : 'none',
                                color: selectedProject.isActive === false ? 'text.secondary' : 'inherit',
                                opacity: selectedProject.isActive === false ? 0.7 : 1
                            }}
                        >
                            {selectedProject.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {selectedProject.code} • {selectedProject.phase}
                        </Typography>
                    </Box>
                    <Box sx={{ width: 40 }} />
                </Box>
            </Paper>

            {/* Search Bar + New Button */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Paper
                    sx={{
                        flex: 1,
                        borderRadius: '6px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                        overflow: 'hidden',
                        boxShadow: 'none',
                    }}
                >
                    <TextField
                        placeholder="Search by tag, name, type, or fluid..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiInputBase-root': { borderRadius: '6px', height: 40 },
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                </Paper>
                {canEdit && (
                    <Tooltip title={selectedProject?.isActive === false ? "Activate project to add PSVs/RDs" : ""}>
                        <span>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => setWizardOpen(true)}
                                disabled={selectedProject?.isActive === false}
                                sx={{ textTransform: 'none', height: 40, whiteSpace: 'nowrap' }}
                            >
                                New PSV/RD
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </Stack>

            {/* Table Container */}
            <Paper
                sx={{
                    borderRadius: '6px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                    overflow: 'hidden',
                }}
            >
                {/* Table Header Row */}
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1,
                    }}
                >
                    {/* Filter Tabs */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        <Button
                            size="small"
                            variant={statusFilter === 'all' ? 'contained' : 'text'}
                            onClick={() => setStatusFilter('all')}
                            sx={{ textTransform: 'none', fontWeight: statusFilter === 'all' ? 600 : 400 }}
                        >
                            All {psvList.length}
                        </Button>
                        <Button
                            size="small"
                            variant={statusFilter === 'draft' ? 'contained' : 'text'}
                            color={statusFilter === 'draft' ? 'primary' : 'inherit'}
                            onClick={() => setStatusFilter('draft')}
                            sx={{ textTransform: 'none', fontWeight: statusFilter === 'draft' ? 600 : 400 }}
                        >
                            Draft {draftCount}
                        </Button>
                        <Button
                            size="small"
                            variant={statusFilter === 'in_review' ? 'contained' : 'text'}
                            color={statusFilter === 'in_review' ? 'warning' : 'inherit'}
                            onClick={() => setStatusFilter('in_review')}
                            sx={{ textTransform: 'none', fontWeight: statusFilter === 'in_review' ? 600 : 400 }}
                        >
                            In Review {inReviewCount}
                        </Button>
                        <Button
                            size="small"
                            variant={statusFilter === 'approved' ? 'contained' : 'text'}
                            color={statusFilter === 'approved' ? 'success' : 'inherit'}
                            onClick={() => setStatusFilter('approved')}
                            sx={{ textTransform: 'none', fontWeight: statusFilter === 'approved' ? 600 : 400 }}
                        >
                            Approved {approvedCount}
                        </Button>
                        <Button
                            size="small"
                            variant={statusFilter === 'issued' ? 'contained' : 'text'}
                            color={statusFilter === 'issued' ? 'info' : 'inherit'}
                            onClick={() => setStatusFilter('issued')}
                            sx={{ textTransform: 'none', fontWeight: statusFilter === 'issued' ? 600 : 400 }}
                        >
                            Issued {issuedCount}
                        </Button>
                    </Stack>

                    {/* Sort & Add */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            size="small"
                            startIcon={<Sort />}
                            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                            sx={{ textTransform: 'none' }}
                        >
                            {sortOptions.find(o => o.key === sortConfig.key)?.label}
                        </Button>
                        <Menu
                            anchorEl={sortMenuAnchor}
                            open={Boolean(sortMenuAnchor)}
                            onClose={() => setSortMenuAnchor(null)}
                            sx={{ '& .MuiPaper-root': { minWidth: 180 }, '& .MuiMenuItem-root': { fontSize: '0.875rem', minHeight: 36 } }}
                        >
                            <Typography variant="caption" sx={{ px: 2, py: 0.75, display: 'block', color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
                                Sort by
                            </Typography>
                            {sortOptions.map((opt) => (
                                <MenuItem
                                    key={opt.key}
                                    onClick={() => {
                                        setSortConfig(prev => ({ ...prev, key: opt.key }));
                                        setSortMenuAnchor(null);
                                    }}
                                    sx={{ pl: 2 }}
                                >
                                    <Box sx={{ width: 20, display: 'flex', alignItems: 'center' }}>
                                        {sortConfig.key === opt.key && (
                                            <Check sx={{ fontSize: 16 }} />
                                        )}
                                    </Box>
                                    {opt.label}
                                </MenuItem>
                            ))}
                            <Box sx={{ my: 0.75, borderTop: 1, borderColor: 'divider' }} />
                            <Typography variant="caption" sx={{ px: 2, py: 0.75, display: 'block', color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
                                Order
                            </Typography>
                            <MenuItem
                                onClick={() => {
                                    setSortConfig(prev => ({ ...prev, direction: 'asc' }));
                                    setSortMenuAnchor(null);
                                }}
                                sx={{ pl: 2 }}
                            >
                                <Box sx={{ width: 20, display: 'flex', alignItems: 'center' }}>
                                    {sortConfig.direction === 'asc' && (
                                        <Check sx={{ fontSize: 16 }} />
                                    )}
                                </Box>
                                <ArrowUpward sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                Ascending
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setSortConfig(prev => ({ ...prev, direction: 'desc' }));
                                    setSortMenuAnchor(null);
                                }}
                                sx={{ pl: 2 }}
                            >
                                <Box sx={{ width: 20, display: 'flex', alignItems: 'center' }}>
                                    {sortConfig.direction === 'desc' && (
                                        <Check sx={{ fontSize: 16 }} />
                                    )}
                                </Box>
                                <ArrowDownward sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                Descending
                            </MenuItem>
                        </Menu>

                    </Stack>
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table>
                        <TableBody>
                            {pagination.pageItems.map((psv) => (
                                <TableRow
                                    key={psv.id}
                                    onClick={() => selectPsv(psv.id)}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.04)',
                                        },
                                        '&:last-child td': {
                                            borderBottom: 'none',
                                        },
                                    }}
                                >
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '6px',
                                                    bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'primary.main',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {getTypeIcon(psv.type)}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    sx={{
                                                        color: (psv.isActive === false) ? 'text.secondary' : 'text.primary',
                                                        fontWeight: 600,
                                                        fontSize: '0.95rem',
                                                        textDecoration: (psv.isActive === false) ? 'line-through' : 'none',
                                                        opacity: (psv.isActive === false) ? 0.7 : 1,
                                                    }}
                                                >
                                                    {psv.tag} : {psv.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                                    {(psv.isActive === false) ? (
                                                        <Chip
                                                            label="Inactive"
                                                            size="small"
                                                            color="default"
                                                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            label={getWorkflowStatusLabel(psv.status)}
                                                            size="small"
                                                            color={getWorkflowStatusColor(psv.status)}
                                                            sx={{ textTransform: 'capitalize', height: 22, fontSize: '0.75rem' }}
                                                        />
                                                    )}
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                        {getTypeLabel(psv.type)}, {psv.fluidPhase?.toUpperCase() || 'N/A'}, Set Pressure: {formatPressureGauge(psv.setPressure, unitSystem, 1)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}


                            {pagination.pageItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Box sx={{ py: 6, textAlign: 'center' }}>
                                            <Security sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                            <Typography variant="h6" color="text.secondary">
                                                {searchText.trim() ? 'No devices match your search' : 'No protective systems found'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {searchText.trim()
                                                    ? 'Try a different search term'
                                                    : 'Add a PSV or rupture disc to get started'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    pageNumbers={pagination.pageNumbers}
                    onPageChange={pagination.goToPage}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                />
            </Paper>

            {/* PSV Creation Wizard */}
            {selectedProject && (
                <PsvCreationWizard
                    open={wizardOpen}
                    onClose={() => setWizardOpen(false)}
                    projectId={selectedProject.id}
                />
            )}
        </Box>
    );
}
