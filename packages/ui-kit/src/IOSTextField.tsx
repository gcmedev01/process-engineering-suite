"use client";

import { TextField, TextFieldProps, InputAdornment, IconButton, useTheme } from "@mui/material";
import { Cancel } from "@mui/icons-material";

type Props = TextFieldProps & {
    onClear?: () => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
};

export function IOSTextField({ sx, onClear, value, InputProps, ...props }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <TextField
            {...props}
            onKeyDown={props.onKeyDown}
            value={value}
            variant="outlined"
            InputProps={{
                ...InputProps,
                endAdornment: (
                    <>
                        {value && onClear && (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={onClear}
                                    size="small"
                                    sx={{
                                        color: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)",
                                        p: 0.5,
                                    }}
                                >
                                    <Cancel sx={{ fontSize: "18px" }} />
                                </IconButton>
                            </InputAdornment>
                        )}
                        {InputProps?.endAdornment}
                    </>
                ),
            }}
            sx={{
                ...sx,
                "& .MuiOutlinedInput-root": {
                    backgroundColor: isDark ? "rgba(118, 118, 128, 0.24)" : "#ffffff",
                    borderRadius: "16px",
                    paddingRight: onClear ? "8px" : undefined,
                    "& fieldset": {
                        border: "none",
                    },
                    "&:hover fieldset": {
                        border: "none",
                    },
                    "&.Mui-focused fieldset": {
                        border: "none",
                    },
                    "& input": {
                        padding: "8px 16px",
                        fontSize: "14px",
                        color: isDark ? "#ffffff" : "#000000",
                        caretColor: theme.palette.primary.main,
                    },
                    "& textarea": {
                        padding: "8px 16px",
                        fontSize: "14px",
                        color: isDark ? "#ffffff" : "#000000",
                        caretColor: theme.palette.primary.main,
                    },
                },
            }}
        />
    );
}
