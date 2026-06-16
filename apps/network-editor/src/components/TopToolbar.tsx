"use client";

import { Assignment, Timeline, MoreVert as MoreVertIcon, FileUpload as ImportIcon, Refresh as RefreshIcon, CloudUpload as CloudSaveIcon, CloudDownload as CloudLoadIcon } from "@mui/icons-material";
import { Button, ButtonGroup, Tooltip, IconButton, useTheme, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText as MuiListItemText, Typography, CircularProgress, Box } from "@mui/material";
import { useState } from "react";
import { SharedUserMenu, TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useColorMode } from "@/contexts/ColorModeContext";
import { NetworkState, ProjectDetails } from "@/lib/types";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSavedDesigns } from "@/hooks/useSavedDesigns";

type Props = {
    network: NetworkState;
    onNetworkChange: (updatedNetwork: NetworkState) => void;
    onReset: () => void;
    onImportExcel: () => void;
};

export function TopToolbar({
    network,
    onNetworkChange,
    onReset,
    onImportExcel,
}: Props) {
    const homeHref = process.env.NEXT_PUBLIC_WEB_URL?.trim() || "http://localhost:3000";
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const { isMobile } = useIsMobile();
    const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
    const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

    // Cloud save/load state
    const { save: cloudSave, fetchList, savedItems, isSaving, isLoading } = useSavedDesigns();
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);

    const handleCloudSave = async () => {
        if (!saveName.trim()) return;
        try {
            await cloudSave(
                saveName.trim(),
                network as unknown as Record<string, unknown>,
                network.nodes?.length ?? 0,
                network.pipes?.length ?? 0,
            );
            setSaveDialogOpen(false);
            setSaveName("");
        } catch {
            // error shown via useSavedDesigns hook
        }
    };

    const handleOpenLoadDialog = async () => {
        setLoadDialogOpen(true);
        await fetchList();
    };

    const handleLoadDesign = (design: (typeof savedItems)[number]) => {
        onNetworkChange(design.networkData as unknown as NetworkState);
        setLoadDialogOpen(false);
    };

    const handleSaveProjectDetails = (details: ProjectDetails) => {
        onNetworkChange({
            ...network,
            projectDetails: details
        });
    };

    return (
        <>
            <TopFloatingToolbar
                title="Pipeline Network Builder"
                subtitle={isMobile ? undefined : "Sketch networks, edit properties, print summary table and export network as PNG."}
                // leadingAction={
                //     <Tooltip title="Back to Dashboard">
                //         <IconButton
                //             onClick={() => window.location.href = '/'}
                //             size="small"
                //             sx={{
                //                 color: 'text.primary',
                //                 '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                //             }}
                //         >
                //             <ArrowBack />
                //         </IconButton>
                //     </Tooltip>
                // }
                icon={<Timeline />}
                homeHref={homeHref}
                actions={
                    isMobile ? (
                        // Mobile: Single More button
                        <>
                            <Tooltip title="More Actions">
                                <IconButton onClick={(e) => setMoreMenuAnchor(e.currentTarget)}>
                                    <MoreVertIcon />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={moreMenuAnchor}
                                open={Boolean(moreMenuAnchor)}
                                onClose={() => setMoreMenuAnchor(null)}
                            >
                                <MenuItem onClick={() => { onReset(); setMoreMenuAnchor(null); }}>
                                    <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Load Example</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => { setProjectDetailsOpen(true); setMoreMenuAnchor(null); }}>
                                    <ListItemIcon><Assignment fontSize="small" /></ListItemIcon>
                                    <ListItemText>Project Details</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => { onImportExcel(); setMoreMenuAnchor(null); }}>
                                    <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Import Excel</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        // Desktop: Full button group
                        <>
                            <ButtonGroup variant="outlined">
                                <Tooltip title="Load example network">
                                    <Button onClick={onReset} color="warning">
                                        Load Example
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Edit Project Details">
                                    <Button onClick={() => setProjectDetailsOpen(true)} startIcon={<Assignment />}>
                                        Project Details
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Import network from Excel">
                                    <Button onClick={onImportExcel} color="success">
                                        Import Excel
                                    </Button>
                                </Tooltip>
                            </ButtonGroup>
                            {/* Cloud save/load — separate group to distinguish from local file ops */}
                            <ButtonGroup variant="outlined" sx={{ ml: 1 }}>
                                <Tooltip title="Save network to cloud database">
                                    <Button
                                        onClick={() => { setSaveName(network.projectDetails?.projectName ?? ""); setSaveDialogOpen(true); }}
                                        startIcon={isSaving ? <CircularProgress size={14} /> : <CloudSaveIcon />}
                                        disabled={isSaving}
                                        color="primary"
                                    >
                                        Save
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Load network from cloud database">
                                    <Button
                                        onClick={handleOpenLoadDialog}
                                        startIcon={<CloudLoadIcon />}
                                        color="primary"
                                    >
                                        Load
                                    </Button>
                                </Tooltip>
                            </ButtonGroup>
                        </>
                    )
                }
                onToggleTheme={toggleColorMode}
                isDarkMode={isDark}
                userAction={
                    <SharedUserMenu
                        homeHref={homeHref}
                        apiBaseUrl={process.env.NEXT_PUBLIC_AUTH_API_URL}
                        backendStatusApiBaseUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
                    />
                }
            />

            <ProjectDetailsDialog
                open={projectDetailsOpen}
                onClose={() => setProjectDetailsOpen(false)}
                initialDetails={network.projectDetails}
                onSave={handleSaveProjectDetails}
            />

            {/* Cloud Save dialog */}
            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Save to Cloud</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="body2" color="text.secondary" mb={1.5}>
                            Give this network design a name.
                        </Typography>
                        <input
                            autoFocus
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: 6,
                                border: `1px solid ${theme.palette.divider}`,
                                background: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                fontSize: 14,
                            }}
                            placeholder="e.g. Cooling Water Ring Main Rev 2"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCloudSave(); }}
                        />
                    </Box>
                </DialogContent>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 3, pb: 2 }}>
                    <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCloudSave}
                        disabled={!saveName.trim() || isSaving}
                        startIcon={isSaving ? <CircularProgress size={14} /> : undefined}
                    >
                        Save
                    </Button>
                </Box>
            </Dialog>

            {/* Cloud Load dialog */}
            <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Load from Cloud</DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {isLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : savedItems.length === 0 ? (
                        <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">
                            No saved designs yet.
                        </Typography>
                    ) : (
                        <List dense>
                            {savedItems.map((design) => (
                                <ListItem key={design.id} disablePadding>
                                    <ListItemButton onClick={() => handleLoadDesign(design)}>
                                        <MuiListItemText
                                            primary={design.name}
                                            secondary={`${design.nodeCount ?? 0} nodes · ${design.pipeCount ?? 0} pipes · ${design.createdAt ? new Date(design.createdAt).toLocaleDateString() : ""}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <Box sx={{ display: "flex", justifyContent: "flex-end", px: 3, pb: 2 }}>
                    <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
                </Box>
            </Dialog>
        </>
    );
}
