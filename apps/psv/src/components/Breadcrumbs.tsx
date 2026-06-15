"use client";

import { Box, Link, Typography, useTheme, Tooltip } from "@mui/material";
import { Home } from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";

export function Breadcrumbs() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const {
        selectedCustomer,
        selectedPlant,
        selectedUnit,
        selectedArea,
        selectedProject,
        selectedPsv,
        selectCustomer,
        selectPlant,
        selectUnit,
        selectArea,
        selectProject,
        setCurrentPage,
        clearSelection,
    } = usePsvStore();

    // Build breadcrumb items array
    type BreadcrumbItem = { label: string; onClick?: () => void; isCurrent: boolean };
    const items: BreadcrumbItem[] = [];

    // Home is always added separately (icon)

    if (selectedCustomer) {
        items.push({
            label: selectedCustomer.name,
            onClick: selectedPlant ? () => selectCustomer(selectedCustomer.id) : undefined,
            isCurrent: !selectedPlant,
        });
    }

    if (selectedPlant) {
        items.push({
            label: selectedPlant.name,
            onClick: selectedUnit ? () => selectPlant(selectedPlant.id) : undefined,
            isCurrent: !selectedUnit,
        });
    }

    if (selectedUnit) {
        items.push({
            label: selectedUnit.name,
            onClick: selectedArea ? () => selectUnit(selectedUnit.id) : undefined,
            isCurrent: !selectedArea,
        });
    }

    if (selectedArea) {
        items.push({
            label: selectedArea.name,
            onClick: selectedProject ? () => selectArea(selectedArea.id) : undefined,
            isCurrent: !selectedProject,
        });
    }

    if (selectedProject) {
        items.push({
            label: selectedProject.name,
            onClick: selectedPsv ? () => selectProject(selectedProject.id) : undefined,
            isCurrent: !selectedPsv,
        });
    }

    if (selectedPsv) {
        items.push({
            label: selectedPsv.tag,
            onClick: undefined,
            isCurrent: true,
        });
    }

    const handleHomeClick = () => {
        clearSelection();
        setCurrentPage(null);
    };

    // Truncation styles for breadcrumb text
    const truncateStyles = {
        maxWidth: { xs: 80, sm: 120, md: 160, lg: 200 },
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 1,
                px: 2,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.95)',
                borderRadius: '14px',
                backdropFilter: 'blur(12px)',
                border: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                boxShadow: isDark
                    ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.08)',
                maxWidth: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Home Icon Button */}
            <Tooltip title="Home" arrow>
                <Box
                    onClick={handleHomeClick}
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                        },
                    }}
                >
                    <Home sx={{ fontSize: 18 }} />
                </Box>
            </Tooltip>

            {/* Breadcrumb Items */}
            {items.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {/* Separator */}
                    <Typography
                        sx={{
                            fontSize: '1.4rem',
                            color: 'text.disabled',
                            flexShrink: 0,
                            userSelect: 'none',
                        }}
                    >
                        /
                    </Typography>

                    {/* Breadcrumb Label with Tooltip */}
                    <Tooltip title={item.label} arrow placement="bottom">
                        {item.onClick ? (
                            <Link
                                onClick={item.onClick}
                                sx={{
                                    cursor: 'pointer',
                                    color: 'text.secondary',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    transition: 'color 0.2s ease',
                                    '&:hover': {
                                        color: 'primary.main',
                                        textDecoration: 'none',
                                    },
                                    ...truncateStyles,
                                }}
                                underline="none"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    color: 'primary.main',
                                    ...truncateStyles,
                                }}
                            >
                                {item.label}
                            </Typography>
                        )}
                    </Tooltip>
                </Box>
            ))}

            {/* Show Home label if no items */}
            {items.length === 0 && (
                <>
                    <Typography
                        sx={{
                            fontSize: '1rem',
                            color: 'text.disabled',
                            flexShrink: 0,
                            userSelect: 'none',
                        }}
                    >
                        /
                    </Typography>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: 'primary.main',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Home
                    </Typography>
                </>
            )}
        </Box>
    );
}
