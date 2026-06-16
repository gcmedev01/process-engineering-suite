"use client";

import { useMemo, useState } from "react";
import {
    Autocomplete,
    Box,
    IconButton,
    TextField,
    Typography,
    useTheme,
    useMediaQuery,
    Tooltip,
} from "@mui/material";
import {
    Air,
    Apartment,
    ArrowRightAlt,
    AutoFixHigh,
    Business,
    Calculate,
    Category,
    Close,
    Description,
    Domain,
    ElectricBolt,
    FolderSpecial,
    Science,
    Search,
    Settings,
    Shield,
    Storage,
    Thermostat,
    Timeline,
    Tune,
} from "@mui/icons-material";
import { QuickAccessMenu, SharedUserMenu, TopFloatingToolbar, useSharedAuth } from "@eng-suite/ui-kit";
import { useColorMode } from "@/contexts/ColorModeContext";
import { PsvIcon } from "./PsvIcon";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { usePsvStore } from "@/store/usePsvStore";
import { StatusIndicator } from "@/components/StatusIndicator";

const APP_ITEMS = [
    { title: "Network Editor", icon: <Timeline />, href: "/network-editor", color: "linear-gradient(135deg, #0ea5e9, #0284c7)", status: "active" as const, requiresAuth: true },
    { title: "PSV Sizing", icon: <Shield />, href: "/psv", color: "linear-gradient(135deg, #ef4444, #b91c1c)", status: "active" as const },
    { title: "Design Agents", icon: <AutoFixHigh />, href: "/design-agents", color: "linear-gradient(135deg, #8b5cf6, #6d28d9)", status: "active" as const, requiresAuth: true },
    { title: "Tank Venting", icon: <Air />, href: "/venting-calculation/calculator", color: "linear-gradient(135deg, #14b8a6, #0d9488)", status: "active" as const },
    { title: "Vessel Sizing", icon: <Storage />, href: "/vessels-calculation/calculator", color: "linear-gradient(135deg, #64748b, #334155)", status: "active" as const },
    { title: "Pump Sizing", icon: <ElectricBolt />, href: "/pump-calculation/calculator", color: "linear-gradient(135deg, #3b82f6, #1d4ed8)", status: "active" as const },
    { title: "Heat Transfer", icon: <Thermostat />, href: "/heat-transfer-calculation/calculator", color: "linear-gradient(135deg, #f97316, #c2410c)", status: "active" as const },
    { title: "Control Valve", icon: <Tune />, href: "/control-valve-calculation/calculator", color: "linear-gradient(135deg, #22c55e, #15803d)", status: "active" as const },
    { title: "Docs", icon: <Description />, href: "/docs", color: "linear-gradient(135deg, #94a3b8, #475569)", status: "active" as const },
    { title: "Orifice Calc", icon: <Calculate />, color: "linear-gradient(135deg, #cbd5e1, #94a3b8)", status: "coming_soon" as const },
    { title: "Fluid Props", icon: <Science />, color: "linear-gradient(135deg, #cbd5e1, #94a3b8)", status: "coming_soon" as const },
];

interface TopToolbarProps {
    title?: string;
    onBack?: () => void;
}

type GlobalSearchKind = 'customer' | 'plant' | 'unit' | 'area' | 'project' | 'psv' | 'equipment';
type GlobalSearchOption = {
    kind: GlobalSearchKind;
    id: string;
    label: string;
    secondary: string;
};

export function TopToolbar({ title = "PSV Sizing", onBack }: TopToolbarProps) {
    const homeHref = process.env.NEXT_PUBLIC_WEB_URL?.trim() || "http://localhost:3000";
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const { isAuthenticated, isRestored } = useSharedAuth();
    const showSearch = !isRestored || isAuthenticated;
    // Treat tablet and below as "mobile" for the compact search UX.
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const router = useRouter();
    const [searchText, setSearchText] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const {
        customers,
        plants,
        units,
        areas,
        projects,
        protectiveSystems,
        equipment,
        selectCustomer,
        selectPlant,
        selectUnit,
        selectArea,
        selectProject,
        selectPsv,
        setCurrentPage,
        setDashboardTab,
    } = usePsvStore();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const getKindLabel = (kind: GlobalSearchKind) => {
        switch (kind) {
            case 'customer':
                return 'Customers';
            case 'plant':
                return 'Plants';
            case 'unit':
                return 'Units';
            case 'area':
                return 'Areas';
            case 'project':
                return 'Projects';
            case 'psv':
                return 'PSVs';
            case 'equipment':
                return 'Equipment';
            default:
                return 'Results';
        }
    };

    const getKindIcon = (kind: GlobalSearchKind) => {
        switch (kind) {
            case 'customer':
                return <Business fontSize="small" />;
            case 'plant':
                return <Apartment fontSize="small" />;
            case 'unit':
                return <Category fontSize="small" />;
            case 'area':
                return <Domain fontSize="small" />;
            case 'project':
                return <FolderSpecial fontSize="small" />;
            case 'psv':
                return <Shield fontSize="small" />;
            case 'equipment':
                return <Settings fontSize="small" />;
            default:
                return <Search fontSize="small" />;
        }
    };

    const getHierarchyPathFromAreaId = (areaId: string): string => {
        const area = areas.find((a) => a.id === areaId);
        if (!area) return '';
        const unit = units.find((u) => u.id === area.unitId);
        const plant = unit ? plants.find((p) => p.id === unit.plantId) : undefined;
        const customer = plant ? customers.find((c) => c.id === plant.customerId) : undefined;
        return [customer?.name, plant?.name, unit?.name, area?.name].filter(Boolean).join(' / ');
    };

    const options = useMemo((): GlobalSearchOption[] => {
        const query = searchText.trim().toLowerCase();
        if (!query) return [];

        const matches = (...fields: Array<string | undefined | null>) =>
            fields.some((f) => (f ?? '').toLowerCase().includes(query));

        const results: GlobalSearchOption[] = [];

        for (const customer of customers) {
            if (matches(customer.name, customer.code, customer.status)) {
                results.push({
                    kind: 'customer',
                    id: customer.id,
                    label: `${customer.name}`,
                    secondary: customer.code,
                });
            }
        }

        for (const plant of plants) {
            const customer = customers.find((c) => c.id === plant.customerId);
            if (matches(plant.name, plant.code, plant.location, plant.status, customer?.name)) {
                results.push({
                    kind: 'plant',
                    id: plant.id,
                    label: `${plant.name}`,
                    secondary: [plant.code, customer?.name].filter(Boolean).join(' • '),
                });
            }
        }

        for (const unit of units) {
            const plant = plants.find((p) => p.id === unit.plantId);
            const customer = plant ? customers.find((c) => c.id === plant.customerId) : undefined;
            if (matches(unit.name, unit.code, unit.service, unit.status, plant?.name, customer?.name)) {
                results.push({
                    kind: 'unit',
                    id: unit.id,
                    label: `${unit.name}`,
                    secondary: [unit.code, plant?.name, customer?.name].filter(Boolean).join(' • '),
                });
            }
        }

        for (const area of areas) {
            const unit = units.find((u) => u.id === area.unitId);
            const plant = unit ? plants.find((p) => p.id === unit.plantId) : undefined;
            const customer = plant ? customers.find((c) => c.id === plant.customerId) : undefined;
            if (matches(area.name, area.code, area.status, unit?.name, plant?.name, customer?.name)) {
                results.push({
                    kind: 'area',
                    id: area.id,
                    label: `${area.name}`,
                    secondary: [area.code, unit?.name, plant?.name].filter(Boolean).join(' • '),
                });
            }
        }

        for (const project of projects) {
            const path = getHierarchyPathFromAreaId(project.areaId);
            if (matches(project.name, project.code, project.phase, project.status, path)) {
                results.push({
                    kind: 'project',
                    id: project.id,
                    label: `${project.name}`,
                    secondary: [project.code, project.phase, path].filter(Boolean).join(' • '),
                });
            }
        }

        for (const psv of protectiveSystems) {
            const path = getHierarchyPathFromAreaId(psv.areaId);
            if (matches(psv.tag, psv.name, psv.type, psv.status, psv.serviceFluid, psv.designCode, psv.fluidPhase, path)) {
                results.push({
                    kind: 'psv',
                    id: psv.id,
                    label: `${psv.tag} — ${psv.name}`,
                    secondary: [psv.status.replace('_', ' '), path].filter(Boolean).join(' • '),
                });
            }
        }

        for (const equip of equipment) {
            const path = getHierarchyPathFromAreaId(equip.areaId);
            if (matches(equip.tag, equip.name, equip.type, equip.status, path)) {
                results.push({
                    kind: 'equipment',
                    id: equip.id,
                    label: `${equip.tag} — ${equip.name}`,
                    secondary: [equip.type, path].filter(Boolean).join(' • '),
                });
            }
        }

        return results.slice(0, 80);
    }, [
        areas,
        customers,
        equipment,
        plants,
        projects,
        protectiveSystems,
        searchText,
        units,
    ]);

    const handleNavigate = async (option: GlobalSearchOption) => {
        const safeSelect = async (fn: () => Promise<unknown> | unknown) => {
            const out = fn();
            if (out instanceof Promise) await out;
        };

        const selectAreaChain = async (areaId: string) => {
            const area = areas.find((a) => a.id === areaId);
            if (!area) return;
            const unit = units.find((u) => u.id === area.unitId);
            const plant = unit ? plants.find((p) => p.id === unit.plantId) : undefined;
            const customer = plant ? customers.find((c) => c.id === plant.customerId) : undefined;

            setCurrentPage(null);
            if (customer) await safeSelect(() => selectCustomer(customer.id));
            if (plant) await safeSelect(() => selectPlant(plant.id));
            if (unit) await safeSelect(() => selectUnit(unit.id));
            await safeSelect(() => selectArea(area.id));
        };

        try {
            if (option.kind === 'customer') {
                setCurrentPage(null);
                await safeSelect(() => selectCustomer(option.id));
            }

            if (option.kind === 'plant') {
                const plant = plants.find((p) => p.id === option.id);
                if (!plant) return;
                setCurrentPage(null);
                await safeSelect(() => selectCustomer(plant.customerId));
                await safeSelect(() => selectPlant(plant.id));
            }

            if (option.kind === 'unit') {
                const unit = units.find((u) => u.id === option.id);
                if (!unit) return;
                const plant = plants.find((p) => p.id === unit.plantId);
                if (!plant) return;
                setCurrentPage(null);
                await safeSelect(() => selectCustomer(plant.customerId));
                await safeSelect(() => selectPlant(plant.id));
                await safeSelect(() => selectUnit(unit.id));
            }

            if (option.kind === 'area') {
                await selectAreaChain(option.id);
            }

            if (option.kind === 'project') {
                const project = projects.find((p) => p.id === option.id);
                if (!project) return;
                await selectAreaChain(project.areaId);
                await safeSelect(() => selectProject(project.id));
            }

            if (option.kind === 'psv') {
                const psv = protectiveSystems.find((p) => p.id === option.id);
                if (!psv) return;
                await selectAreaChain(psv.areaId);

                const projectId = psv.projectIds?.[0];
                if (projectId) {
                    const project = projects.find((p) => p.id === projectId);
                    if (project) await safeSelect(() => selectProject(project.id));
                }

                await safeSelect(() => selectPsv(psv.id));
            }

            if (option.kind === 'equipment') {
                setDashboardTab('Equipment');
                setCurrentPage('dashboard');
            }

            setSearchText('');
            if (isMobile) {
                setIsSearchOpen(false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <TopFloatingToolbar
            title={title}
            subtitle={title === "PSV Sizing" ? "Pressure Safety Valve Sizing" : undefined}
            icon={<PsvIcon width={24} height={24} />}
            homeHref={homeHref}
            actions={
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                    }}
                >
                    {/* Search */}
                    {showSearch && (!isMobile || isSearchOpen) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                                borderRadius: '999px',
                                px: 2,
                                py: 0.5,
                                width: isMobile ? '55vw' : { xs: 220, sm: 300, md: 400, lg: 480 },
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)',
                                    borderColor: theme.palette.primary.main,
                                },
                            }}
                        >
                            <Autocomplete
                                fullWidth
                                size="small"
                                options={options}
                                groupBy={(opt) => getKindLabel(opt.kind)}
                                getOptionLabel={(opt) => opt.label}
                                filterOptions={(x) => x}
                                inputValue={searchText}
                                onInputChange={(_e, value) => setSearchText(value)}
                                onChange={(_e, value) => {
                                    if (value) void handleNavigate(value);
                                }}
                                renderOption={(props, option) => {
                                    const { key, ...otherProps } = props;
                                    return (
                                        <Box
                                            key={key}
                                            component="li"
                                            {...otherProps}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                py: 1,
                                            }}
                                        >
                                            <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                                                {getKindIcon(option.kind)}
                                            </Box>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                    {option.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {option.secondary}
                                                </Typography>
                                            </Box>
                                            <ArrowRightAlt fontSize="small" style={{ opacity: 0.5 }} />
                                        </Box>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Search customers, plants, units, areas, projects, PSVs, equipment..."
                                        variant="standard"
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        pr: 1,
                                                    }}
                                                >
                                                    <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                                                    {params.InputProps.startAdornment}
                                                </Box>
                                            ),
                                            disableUnderline: true,
                                            sx: {
                                                color: 'text.primary',
                                                fontSize: '0.875rem',
                                            },
                                        }}
                                    />
                                )}
                                sx={{
                                    '& .MuiInputBase-root': { p: 0 },
                                    '& .MuiAutocomplete-endAdornment': { right: 0 },
                                }}
                            />
                            {isMobile && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchText('');
                                    }}
                                    sx={{ ml: 0.5 }}
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    )}

                    {showSearch && isMobile && !isSearchOpen && (
                        <IconButton
                            size="small"
                            onClick={() => setIsSearchOpen(true)}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '999px',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.12)'}`,
                                bgcolor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.9)',
                            }}
                        >
                            <Search sx={{ fontSize: 20 }} />
                        </IconButton>
                    )}

                    <StatusIndicator />
                </Box>
            }
            quickAccess={<QuickAccessMenu items={APP_ITEMS} onToggleTheme={toggleColorMode} isDarkMode={isDark} />}
            userAction={
                <SharedUserMenu
                    apiBaseUrl={API_BASE_URL}
                    homeHref={process.env.NEXT_PUBLIC_WEB_URL?.trim() || "http://localhost:3000"}
                    showAccountSettings
                    onAccountSettings={() => {
                        setCurrentPage('account');
                    }}
                />
            }
        />
    );
}
