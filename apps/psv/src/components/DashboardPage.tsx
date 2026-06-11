"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, IconButton, useTheme } from "@mui/material";
import {
  Business,
  Apartment,
  Category,
  Map,
  Folder,
  People,
  Close,
  Shield,
  Settings,
} from "@mui/icons-material";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";

import { CustomersTab } from "./CustomersTab";
import { PlantsTab } from "./PlantsTab";
import { UnitsTab } from "./UnitsTab";
import { AreasTab } from "./AreasTab";
import { ProjectsTab } from "./ProjectsTab";
import { PSVsTab } from "./PSVsTab";
import { EquipmentTab } from "./EquipmentTab";
import { UsersTab } from "./UsersTab";
import { SystemTab } from "./SystemTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: string;
  value: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const selectedTabBg = theme.palette.background.default;
  const { canManageHierarchy, canManageCustomer, canManageUsers } =
    useAuthStore();
  const { setCurrentPage, dashboardTab, setDashboardTab, fetchSummaryCounts } = usePsvStore();
  // Determine visible tabs based on role
  const tabs = useMemo(
    () => [
      { label: "Customers", icon: <Business />, visible: canManageCustomer() },
      { label: "Plants", icon: <Apartment />, visible: canManageHierarchy() },
      { label: "Units", icon: <Category />, visible: canManageHierarchy() },
      { label: "Areas", icon: <Map />, visible: canManageHierarchy() },
      { label: "Projects", icon: <Folder />, visible: true },
      { label: "Equipment", icon: <Settings />, visible: true },
      { label: "PSVs", icon: <Shield />, visible: true },
      { label: "Users", icon: <People />, visible: canManageUsers() },
      { label: "System", icon: <Settings />, visible: canManageUsers() },
    ],
    [canManageCustomer, canManageHierarchy, canManageUsers],
  );

  const visibleTabs = useMemo(() => tabs.filter((tab) => tab.visible), [tabs]);

  const firstVisibleTab = visibleTabs[0]?.label || "Customers";
  const [activeTabLabel, setActiveTabLabel] = useState<string>(firstVisibleTab);

  // Ensure activeTabLabel is always a visible tab
  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.label === activeTabLabel)) {
      setActiveTabLabel(firstVisibleTab);
    }
  }, [visibleTabs, activeTabLabel, firstVisibleTab]);

  useEffect(() => {
    fetchSummaryCounts();
  }, [fetchSummaryCounts]);

  useEffect(() => {
    if (!dashboardTab) return;
    if (visibleTabs.some((t) => t.label === dashboardTab)) {
      setActiveTabLabel(dashboardTab);
    }
  }, [dashboardTab, visibleTabs]);

  const handleClose = () => {
    setCurrentPage(null);
    setDashboardTab(null);
  };

  return (
    <Box
      sx={{ height: "100vh - 1px", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <Paper
        sx={{
          // ...glassCardStyles,
          p: { xs: 2, sm: 3 },
          border: "none",
          backgroundColor: "transparent",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0,
          flexWrap: { xs: "wrap", sm: "nowrap" },
          boxShadow: "none",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
          >
            Dashboard
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            Manage hierarchy and users
          </Typography>
        </Box>
        <IconButton onClick={handleClose} aria-label="close">
          <Close />
        </IconButton>
      </Paper>

      {/* Tabs - GitHub-style Folder Tab */}
      <Box
        sx={{
          position: "relative",
          // Underline extends to page edges by using negative margins
          mx: { xs: -2, sm: -3 },
          px: { xs: 2, sm: 3 },
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "1px",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.1)",
            pointerEvents: "none",
            zIndex: 0,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 0,
            flexWrap: "nowrap",
            overflowX: "auto",
            overflowY: "visible",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            position: "relative",
          }}
        >
          {visibleTabs.map((tab) => {
            const isSelected = activeTabLabel === tab.label;
            return (
              <Box
                key={tab.label}
                onClick={() => {
                  setActiveTabLabel(tab.label);
                  setDashboardTab(tab.label);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 2,
                  py: 1.2,
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  zIndex: isSelected ? 2 : 1,
                  marginBottom: "-1px", // Overlap the underline

                  // Borders
                  borderTop: isSelected
                    ? `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`
                    : "1px solid transparent",
                  borderLeft: isSelected
                    ? `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`
                    : "1px solid transparent",
                  borderRight: isSelected
                    ? `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`
                    : "1px solid transparent",
                  borderBottom: isSelected
                    ? `1px solid ${selectedTabBg}`
                    : "1px solid transparent",
                  borderRadius: isSelected ? "8px 8px 0 0" : "0",
                  backgroundColor: isSelected ? selectedTabBg : "transparent",

                  "&:hover": !isSelected
                    ? {
                        color: isDark ? "#fff" : "#000",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                        borderRadius: "8px 8px 0 0",
                      }
                    : {},
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: isSelected
                      ? isDark
                        ? "#fff"
                        : "#000"
                      : isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.45)",
                    transition: "color 0.2s",
                    "& .MuiSvgIcon-root": {
                      fontSize: "1rem",
                    },
                  }}
                >
                  {tab.icon}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                    color: isSelected
                      ? isDark
                        ? "#fff"
                        : "#000"
                      : isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.45)",
                    transition: "color 0.2s",
                  }}
                >
                  {tab.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, sm: 3 } }}>
        <TabPanel value={activeTabLabel} index="Projects">
          <ProjectsTab />
        </TabPanel>
        <TabPanel value={activeTabLabel} index="PSVs">
          <PSVsTab />
        </TabPanel>
        <TabPanel value={activeTabLabel} index="Equipment">
          <EquipmentTab />
        </TabPanel>
        {canManageHierarchy() && (
          <>
            <TabPanel value={activeTabLabel} index="Areas">
              <AreasTab />
            </TabPanel>
            <TabPanel value={activeTabLabel} index="Units">
              <UnitsTab />
            </TabPanel>
            <TabPanel value={activeTabLabel} index="Plants">
              <PlantsTab />
            </TabPanel>
          </>
        )}
        {canManageCustomer() && (
          <TabPanel value={activeTabLabel} index="Customers">
            <CustomersTab />
          </TabPanel>
        )}
        {canManageUsers() && (
          <TabPanel value={activeTabLabel} index="Users">
            <UsersTab />
          </TabPanel>
        )}
        {canManageUsers() && (
          <TabPanel value={activeTabLabel} index="System">
            <SystemTab />
          </TabPanel>
        )}
      </Box>
    </Box>
  );
}
