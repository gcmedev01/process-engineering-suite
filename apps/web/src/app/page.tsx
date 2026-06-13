"use client";

import { Box, Container, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { AppCard } from "../components/AppCard";
import CalculateIcon from "@mui/icons-material/Calculate";
import TuneIcon from "@mui/icons-material/Tune";
import ScienceIcon from "@mui/icons-material/Science";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AirIcon from '@mui/icons-material/Air';
import BoltIcon from '@mui/icons-material/Bolt';
import { Timeline } from "@mui/icons-material";
import { motion, Variants } from "framer-motion";
import { ControlValveIcon } from "../components/ControlValveIcon";

const tools = [
  {
    title: "Network Editor",
    description:
      "Hydraulic network analysis for single phase flow. Calculate pressure drops, velocities, and fittings.",
    icon: <Timeline fontSize="large" />,
    href: "/network-editor",
    status: "active" as const,
  },
  {
    title: "Pressure Safety Valve Sizing",
    description:
      "PSV sizing based on ASME and EN standards. Includes data from vendor's catalog.",
    icon: <TuneIcon fontSize="large" />,
    href: "/psv",
    status: "active" as const,
  },
  {
    title: "Process Design Agents",
    description:
      "Multi-Agent system for process design. Includes agents for equipment sizing, piping, and more.",
    icon: <AutoFixHighIcon fontSize="large" />,
    href: "/design-agents",
    status: "active" as const,
  },
  {
    title: "Tank Venting Calculator",
    description:
      "Atmospheric & low-pressure storage tank venting per API 2000. Normal and emergency venting calculations.",
    icon: <AirIcon fontSize="large" />,
    href: "/venting-calculation/calculator",
    status: "active" as const,
  },
  {
    title: "Vessel & Tank Sizing",
    description:
      "Volume, surface area, and mass calculations for vertical and horizontal vessels with multiple head types.",
    icon: <CalculateIcon fontSize="large" />,
    href: "/vessels-calculation/calculator",
    status: "active" as const,
  },
  {
    title: "Pump Sizing Calculator",
    description:
      "Differential head, NPSHa, shaft power and standard motor sizing per API 610. Includes orifice, control valve ΔP and minimum flow.",
    icon: <BoltIcon fontSize="large" />,
    href: "/pump-calculation/calculator",
    status: "active" as const,
  },
  {
    title: "Heat Transfer Calculator",
    description:
      "Steady-state heat loss from storage tanks and pipes. Vertical tank, pipe, and horizontal tank modes with conduction, convection, and radiation analysis.",
    icon: <ScienceIcon fontSize="large" />,
    href: "/heat-transfer-calculation/calculator",
    status: "active" as const,
  },
  {
    title: "Control Valve Sizing",
    description:
      "Cv/Kv sizing for liquid and gas/vapor per ISA-75.01.01 / IEC 60534-2-1. Choked-flow, fittings, Reynolds and multi-case support.",
    icon: <ControlValveIcon width={35} height={35} />,
    href: "/control-valve-calculation/calculator",
    status: "active" as const,
  },
  {
    title: "Orifice Calculator",
    description:
      "Restriction orifice and flow meter sizing (ISO 5167). Beta ratio and permanent pressure loss.",
    icon: <CalculateIcon fontSize="large" />,
    status: "coming_soon" as const,
  },
  {
    title: "Fluid Properties",
    description:
      "Thermodynamic properties using the CoolProp engine. Phase envelopes and flash calculations.",
    icon: <ScienceIcon fontSize="large" />,
    status: "coming_soon" as const,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Dashboard() {
  return (
    <Box sx={{ py: 8, minHeight: "100vh" }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 8, textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(to right, #053a7bff, #00C4F9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2,
              }}
            >
              Engineering Suite
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "text.secondary",
                maxWidth: "600px",
                mx: "auto",
              }}
            >
              A unified platform for process design, hydraulic analysis, and
              equipment sizing.
            </Typography>
          </motion.div>
        </Box>

        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {tools.map((tool, index) => (
            <Grid
              key={index}
              size={{ xs: 12, md: 6, lg: 4 }}
              component={motion.div}
              variants={itemVariants}
            >
              <AppCard {...tool} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
