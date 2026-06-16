"use client";

import { useState } from "react";
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Box,
    Button,
    Switch,
    FormControlLabel,
    Tooltip,
} from "@mui/material";
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import { RowConfig } from "./tableConfig";
import { ProjectDetails } from "@/lib/types";
import { GCME_LIGHT_LOGO_DATA_URI } from "@eng-suite/ui-kit";

type Props<T> = {
    data: T[];
    rowConfigs: RowConfig<T>[];
    keyExtractor: (item: T) => string;
    labelExtractor: (item: T, index: number) => string;
    title?: string;
    headerActions?: React.ReactNode;
    isSnapshot?: boolean;
    initialRowsPerPage?: number;
    onColumnSettingsClick?: () => void;
    projectDetails?: ProjectDetails;
};

export function GenericTable<T>({
    data,
    rowConfigs,
    keyExtractor,
    labelExtractor,
    title,
    headerActions,
    isSnapshot = false,
    initialRowsPerPage = 8,
    onColumnSettingsClick,
    projectDetails
}: Props<T>) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const [fitToPage, setFitToPage] = useState(true);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const formatNumber = (val: string | number | undefined | null, decimals = 3) => {
        if (val === undefined || val === null) return "";
        if (typeof val === "string") return val;
        if (!Number.isFinite(val)) return "";
        return val.toFixed(decimals);
    };

    const visibleData = isSnapshot ? data : data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const emptyColumnsCount = isSnapshot
        ? (8 - (visibleData.length % 8)) % 8
        : Math.max(0, rowsPerPage - visibleData.length);

    const emptyColumns = Array(emptyColumnsCount).fill(null);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        // 1. Headers
        const headerRow = ["Property", "Unit", ...data.map((item, i) => labelExtractor(item, i))];
        const csvRows = [headerRow.map(cell => `"${cell}"`).join(",")];

        // 2. Data Rows
        rowConfigs.forEach(row => {
            if (row.type === "section") {
                // Section header row
                const sectionRow = [`"${row.label}"`, ...Array(data.length + 1).fill("")];
                csvRows.push(sectionRow.join(","));
            } else {
                // Data row
                const rowData = [
                    `"${row.label}"`,
                    `"${row.unit || ""}"`
                ];

                data.forEach(item => {
                    const result = row.getValue(item);
                    let value = "";

                    if (result !== null && result !== undefined) {
                        if (typeof result === 'object') {
                            value = result.value !== null && result.value !== undefined ? String(result.value) : "";
                        } else {
                            value = String(result);
                        }
                    }
                    // Escape quotes in value
                    value = value.replace(/"/g, '""');
                    rowData.push(`"${value}"`);
                });

                csvRows.push(rowData.join(","));
            }
        });

        // 3. Create Blob and Download
        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "summary_table.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Paper id="summary-table-print-area" className={fitToPage ? "fit-to-page" : ""} sx={{ width: "100%", overflow: "hidden", p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 0 }}>
            <style type="text/css" media="print">
                {`
                @page { size: portrait; margin: 5mm; }
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #summary-table-print-area, #summary-table-print-area * {
                        visibility: visible;
                        color: black;
                        background-color: white;
                    }
                    /* Preserve red color for error values in print */
                    #summary-table-print-area .cell-error-value {
                        color: #ff0000 !important;
                    }
                    /* Preserve orange/amber color for warning values in print */
                    #summary-table-print-area .cell-warning-value {
                        color: #ed6c02 !important;
                    }
                    #summary-table-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto !important; /* Shrink to fit content */
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none;
                        display: flex !important;
                        flex-direction: row !important;
                        border: 20px solid #2e75b6 !important; /* Blue border */
                        borderRadius: 0 !important;
                        box-sizing: border-box;
                    }
                    
                    /* Disclaimer Column */
                    .disclaimer-col {
                        width: 24px !important;
                        min-width: 24px !important;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                        border-right: 3px solid #000000;
                        background-color: white !important;
                    }
                    .disclaimer-text {
                        transform: rotate(-90deg);
                        white-space: nowrap;
                        color: #ff0000 !important; /* Red text */
                        font-size: 6pt; /* Smaller font */
                        font-weight: bold;
                    }

                    /* Main Content Column */
                    .main-content-col {
                        flex: 1;
                        display: flex !important;
                        flex-direction: column !important;
                        height: auto !important; /* Shrink to fit content */
                        overflow: hidden;
                    }

                    .print-header-container {
                        margin-bottom: 0 !important;
                        border-bottom: 1px solid #000000;
                        border-top: 3px solid #000000;
                        border-right: 3px solid #000000;
                        padding: 4px;
                    }
                    .no-print {
                        display: none !important;
                    }

                    /* Table Styles */
                    .MuiTableContainer-root {
                        flex: 0 0 auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        border: none !important;
                    }
                    .MuiTable-root {
                        border-collapse: collapse !important;
                        width: 100% !important;
                        table-layout: fixed !important;
                    }
                    .MuiTableCell-root {
                        border-right: 1px solid #ccc !important;
                        border-bottom: 1px solid #ccc !important;
                        padding: 2px 2px !important;
                        font-size: 7pt !important;
                        line-height: 1.1 !important;
                        height: auto !important;
                    }
                    .MuiTableCell-root:last-child {
                        border-right: 3px solid black !important;
                    }
                    
                    /* Header Cells */
                    .MuiTableHead-root .MuiTableCell-root {
                        background-color: #d9e1f2 !important; /* Light blue header */
                        color: black !important;
                        border-bottom: 1px solid #000 !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        box-shadow: none !important;
                    }

                    /* Section Headers */
                    .section-header-cell {
                        background-color: #e2efda !important; /* Light green section */
                        font-weight: bold !important;
                        text-align: left !important;
                        border-top: 1px solid #000 !important;
                        border-bottom: 1px solid #000 !important;
                    }
                    .section-header-cell:last-child {
                        border-right: 3px solid #000 !important;
                    }

                    /* Footer Styles */
                    .print-footer {
                        display: flex !important;
                        flex-direction: column;
                        border-top: 2px solid #000000;
                        font-size: 8pt;
                        margin-top: -1px;
                    }
                    .footer-row {
                        display: flex;
                        border-top: 1px solid black;
                    }
                    .footer-row-bottom {
                        display: flex;
                        border-top: 1px solid black;
                        border-bottom: 3px solid black !important;
                        border-right: 3px solid black !important;
                    }
                    .footer-row:last-child {
                        border-bottom: none;
                    }
                    .footer-cell {
                        padding: 2px 4px;
                        border-right: 1px solid black;
                        display: flex;
                        align-items: center;
                    }
                    .footer-cell:last-child {
                        border-right: none;
                    }
                    .footer-label {
                        font-weight: bold;
                        margin-right: 4px;
                        color: black !important;
                    }

                    /* Fit to Page Overrides */
                    .fit-to-page .MuiTableCell-root {
                        font-size: 6.5pt !important;
                    }

                    /* Column Widths */
                    .col-property { width: 25% !important; }
                    .col-unit { width: 5% !important; }
                    /* Remaining 70% divided by data columns */

                    /* Sublabel and Helper Text in Print */
                    .cell-sublabel, .cell-helper-text {
                        font-size: 0.5rem !important;
                    }
                    
                    /* Hide error/warning helper text in print (velocity > erosional, mach > 0.5, etc.) */
                    .cell-helper-text-error, .cell-helper-text-warning {
                        display: none !important;
                    }
                    
                    /* Hide specific rows in print mode */
                    .hide-in-print {
                        display: none !important;
                    }

                    /* Hide scrollbars */
                    ::-webkit-scrollbar { display: none; }
                }
                `}
            </style>

            {/* Print Layout Wrapper */}
            <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', borderRadius: "16px" }}>

                {/* Left Disclaimer Column (Visible only in print via CSS, or we can show it always if desired. 
                    The CSS above handles visibility, but we need the DOM structure.) */}
                <Box className="disclaimer-col" sx={{ display: 'none' }}>
                    <div className="disclaimer-text">
                        This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.
                    </div>
                </Box>

                {/* Main Content Column */}
                <Box className="main-content-col" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Header */}
                    <Box className="print-header-container" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, p: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', flex: 1, textAlign: "center", color: 'text.primary' }}>
                            {title}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }} className="no-print">
                            {headerActions}
                            {onColumnSettingsClick && (
                                <Tooltip title="Column Settings">
                                    <Button
                                        variant="outlined"
                                        startIcon={<SettingsIcon />}
                                        onClick={onColumnSettingsClick}
                                        size="small"
                                    >
                                        Columns
                                    </Button>
                                </Tooltip>
                            )}
                            <Tooltip title="Print Table">
                                <Button
                                    variant="outlined"
                                    startIcon={<PrintIcon />}
                                    onClick={handlePrint}
                                    size="small"
                                >
                                    Print
                                </Button>
                            </Tooltip>
                            <Tooltip title="Export CSV">
                                <Button
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={handleExportCSV}
                                    size="small"
                                >
                                    CSV
                                </Button>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Table */}
                    <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #e0e0e0' }}>
                        <Table stickyHeader aria-label="sticky table" size="small" sx={{ borderCollapse: 'separate' }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell className="col-property" sx={{ fontWeight: 'bold', width: 240, position: 'sticky', left: 0, bgcolor: 'background.default', zIndex: "9999 !important", borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0' }}>
                                        Property
                                    </TableCell>
                                    <TableCell className="col-unit" align="center" sx={{ fontWeight: 'bold', width: 60, position: 'sticky', left: 240, bgcolor: 'background.default', zIndex: "9999 !important", borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0' }}>
                                        Unit
                                    </TableCell>
                                    {visibleData.map((item, index) => (
                                        <TableCell key={keyExtractor(item)} align="center" sx={{ minWidth: 110, borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0', bgcolor: 'background.default' }}>
                                            {labelExtractor(item, index + (page * rowsPerPage))}
                                        </TableCell>
                                    ))}
                                    {emptyColumns.map((_, index) => (
                                        <TableCell key={`dummy-head-${index}`} sx={{ minWidth: 110, borderRight: '1px solid #e0e0e0', boxShadow: 'inset 0 -1px 0 #e0e0e0', bgcolor: 'background.default' }} />
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rowConfigs.map((row, index) => {
                                    if (row.type === "section") {
                                        return (
                                            <TableRow key={index} sx={{ bgcolor: "background.default" }}>
                                                <TableCell className="section-header-cell" colSpan={2 + visibleData.length + emptyColumnsCount} sx={{ position: 'sticky', left: 0, fontWeight: "bold" }}>
                                                    {row.label}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }

                                    return (
                                        <TableRow hover key={index} className={row.hideInPrint ? 'hide-in-print' : ''}>
                                            <TableCell className="col-property" component="th" scope="row" sx={(theme) => ({
                                                minWidth: 240,
                                                width: 240,
                                                position: 'sticky',
                                                left: 0,
                                                bgcolor: 'background.paper',
                                                boxShadow: "1px 1px 1px text.secondary",
                                                borderRight: '1px solid #e0e0e0',
                                                '.MuiTableRow-root:hover &': {
                                                    bgcolor: 'background.paper',
                                                    backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
                                                }
                                            })}>
                                                {row.label}
                                                {row.subLabel && (
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        {row.subLabel}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell className="col-unit" align="center" sx={(theme) => ({
                                                width: 60,
                                                position: 'sticky',
                                                left: 240,
                                                bgcolor: 'background.paper',
                                                boxShadow: "1px 1px 1px text.secondary",
                                                borderRight: '1px solid #e0e0e0',
                                                color: 'text.secondary',
                                                '.MuiTableRow-root:hover &': {
                                                    bgcolor: 'background.paper',
                                                    backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
                                                }
                                            })}>
                                                {row.unit || ""}
                                            </TableCell>
                                            {visibleData.map((item) => {
                                                const result = row.getValue(item);
                                                const value = typeof result === 'object' && result !== null ? result.value : result;
                                                const cellSubLabel = typeof result === 'object' && result !== null ? result.subLabel : undefined;
                                                const cellColor = typeof result === 'object' && result !== null ? result.color : undefined;
                                                const cellHelperText = typeof result === 'object' && result !== null ? result.helperText : undefined;
                                                const cellFontWeight = typeof result === 'object' && result !== null ? result.fontWeight : undefined;
                                                const cellHelperTextFontWeight = typeof result === 'object' && result !== null ? result.helperTextFontWeight : "bold";

                                                return (
                                                    <TableCell
                                                        key={keyExtractor(item)}
                                                        align="center"
                                                        className={
                                                            cellColor === 'error.main' ? 'cell-error-value' :
                                                                cellColor === 'warning.main' ? 'cell-warning-value' : ''
                                                        }
                                                        sx={{ borderRight: '1px solid #e0e0e0', color: cellColor, fontWeight: cellFontWeight }}
                                                    >
                                                        {formatNumber(value, row.decimals)}
                                                        {cellSubLabel && (
                                                            <Typography className="cell-sublabel" variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                                {cellSubLabel}
                                                            </Typography>
                                                        )}
                                                        {cellHelperText && (
                                                            <Typography
                                                                className={`cell-helper-text ${cellColor === 'error.main' ? 'cell-helper-text-error' :
                                                                        cellColor === 'warning.main' ? 'cell-helper-text-warning' : ''
                                                                    }`}
                                                                variant="caption"
                                                                display="block"
                                                                color={cellColor || "text.secondary"}
                                                                sx={{ fontSize: '0.7rem', fontWeight: cellHelperTextFontWeight }}
                                                            >
                                                                {cellHelperText}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            {emptyColumns.map((_, index) => (
                                                <TableCell key={`dummy-cell-${index}`} className="dummy-cell" sx={{ borderRight: '1px solid #e0e0e0' }} />
                                            ))}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Footer (Visible only in print via CSS) */}
                    <Box className="print-footer" sx={{ display: 'none' }}>
                        {/* Row 1: TITLE + Rev 3 (Top) */}
                        <div className="footer-row">
                            <div className="footer-cell" style={{ flex: 1, borderRight: '1px solid black' }}>
                                <span className="footer-label">TITLE : {projectDetails?.title}</span>
                            </div>
                            {/* Right side: Rev 3 */}
                            <div style={{ width: '45%', display: 'flex' }}>
                                <div style={{ width: '15%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[2]?.rev}</div>
                                <div style={{ width: '28.33%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[2]?.by} {projectDetails?.revisions[2]?.date ? `/ ${projectDetails?.revisions[2]?.date}` : ""}</div>
                                <div style={{ width: '28.33%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[2]?.checked} {projectDetails?.revisions[2]?.checkedDate ? `/ ${projectDetails?.revisions[2]?.checkedDate}` : ""}</div>
                                <div style={{ width: '28.33%', borderRight: '3px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[2]?.approved} {projectDetails?.revisions[2]?.approvedDate ? `/ ${projectDetails?.revisions[2]?.approvedDate}` : ""}</div>
                            </div>
                        </div>

                        {/* Row 2: PROJECT + Rev 2 (Middle) */}
                        <div className="footer-row">
                            <div className="footer-cell" style={{ flex: 1, borderRight: '1px solid black' }}>
                                <span className="footer-label">PROJECT : {projectDetails?.projectName}</span>
                            </div>
                            {/* Right side: Rev 2 */}
                            <div style={{ width: '45%', display: 'flex' }}>
                                <div style={{ width: '15%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[1]?.rev}</div>
                                <div style={{ width: '28.33%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[1]?.by} {projectDetails?.revisions[1]?.date ? `/ ${projectDetails?.revisions[1]?.date}` : ""}</div>
                                <div style={{ width: '28.33%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[1]?.checked} {projectDetails?.revisions[1]?.checkedDate ? `/ ${projectDetails?.revisions[1]?.checkedDate}` : ""}</div>
                                <div style={{ width: '28.33%', borderRight: '3px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[1]?.approved} {projectDetails?.revisions[1]?.approvedDate ? `/ ${projectDetails?.revisions[1]?.approvedDate}` : ""}</div>
                            </div>
                        </div>

                        {/* Row 3: CLIENT + Rev 1 (Bottom) */}
                        <div className="footer-row">
                            <div className="footer-cell" style={{ flex: 1, borderRight: '1px solid black' }}>
                                <span className="footer-label">CLIENT : {projectDetails?.clientName}</span>
                            </div>
                            {/* Right side: Rev 1 */}
                            <div style={{ width: '45%', display: 'flex' }}>
                                <div style={{ width: '15%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[0]?.rev}</div>
                                <div style={{ width: '28.33%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[0]?.by} {projectDetails?.revisions[0]?.date ? `/ ${projectDetails?.revisions[0]?.date}` : ""}</div>
                                <div style={{ width: '28.33%', borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[0]?.checked} {projectDetails?.revisions[0]?.checkedDate ? `/ ${projectDetails?.revisions[0]?.checkedDate}` : ""}</div>
                                <div style={{ width: '28.33%', borderRight: '3px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{projectDetails?.revisions[0]?.approved} {projectDetails?.revisions[0]?.approvedDate ? `/ ${projectDetails?.revisions[0]?.approvedDate}` : ""}</div>
                            </div>
                        </div>

                        {/* Bottom Section: Logo/Company + Rev Info */}
                        <div className="footer-row" style={{ height: '60px' }}> {/* Increased height for logo block */}

                            {/* Left Block: Logo + Company */}
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid black', borderBottom: 'none' }}>
                                <div className="footer-cell" style={{ width: '60px', justifyContent: 'center', borderRight: '1px solid black', borderBottom: 'none', padding: '2px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={GCME_LIGHT_LOGO_DATA_URI} alt="GCME" style={{ width: '52px', height: 'auto', objectFit: 'contain' }} />
                                    </div>
                                </div>
                                <div className="footer-cell" style={{ flex: 1, justifyContent: 'center', fontWeight: 'bold', textAlign: 'center', borderBottom: 'none' }}>
                                    GC MAINTENANCE & ENGINEERING COMPANY LIMITED
                                </div>
                            </div>

                            {/* Right Block: Rev Info */}
                            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderBottom: '1px solid black' }}>
                                {/* Row A: Rev Headers */}
                                <div style={{ display: 'flex', borderBottom: '1px solid black', flex: 1 }}>
                                    <div style={{ width: '15%', borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>REV.</span>
                                    </div>
                                    <div style={{ width: '28.33%', borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>BY / DATE</span>
                                    </div>
                                    <div style={{ width: '28.33%', borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>CHKD / DATE</span>
                                    </div>
                                    <div style={{ width: '28.33%', borderRight: '3px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>APPD / DATE</span>
                                    </div>
                                </div>

                                {/* Row B: Project Headers */}
                                <div style={{ display: 'flex', borderBottom: '1px solid black', flex: 1 }}>
                                    <div style={{ flex: 1, borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>PROJECT NO.</span>
                                    </div>
                                    <div style={{ flex: 1, borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>DOCUMENT NO.</span>
                                    </div>
                                    <div style={{ flex: 1, borderRight: '3px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="footer-label" style={{ marginRight: 0 }}>PAGE NO.</span>
                                    </div>
                                </div>

                                {/* Row C: Values */}
                                <div style={{ display: 'flex', flex: 1 }}>
                                    <div style={{ flex: 1, borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {projectDetails?.projectNo}
                                    </div>
                                    <div style={{ flex: 1, borderRight: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {projectDetails?.calculationNo}
                                    </div>
                                    <div style={{ flex: 1, borderRight: '3px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span>{projectDetails?.pageNumber || "XX"} OF {projectDetails?.totalPages || "XX"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="footer-row-bottom" style={{ backgroundColor: '#2e75b6', color: 'white', justifyContent: 'space-between', padding: '2px 4px', fontSize: '0.5rem' }}>
                            <span>CA-PR-1050.0202</span>
                            <span>VALIDATION REPORT : RPT-PR-1050.0202</span>
                        </div>
                    </Box>

                    {!isSnapshot && (
                        <TablePagination
                            className="no-print"
                            rowsPerPageOptions={[8, 16, 24, 100]}
                            component="div"
                            count={data.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Items per page:"
                        />
                    )}
                </Box>
            </Box>
        </Paper>
    );
}
