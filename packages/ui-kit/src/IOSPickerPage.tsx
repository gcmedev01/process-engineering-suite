"use client";

import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Box } from "@mui/material";
import { Check } from "@mui/icons-material";
import { IOSListGroup } from "./IOSListGroup";
import { IOSListItem } from "./IOSListItem";

export type IOSPickerItem<T> = {
    label: string;
    value?: T;
    secondary?: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
    chevron?: boolean;
    textColor?: string;
    onSelect?: () => void;
    renderValue?: (isSelected: boolean) => ReactNode;
};

type IOSPickerPageProps<T> = {
    items: readonly IOSPickerItem<T>[];
    selectedValue?: T;
    onSelect: (value: T) => void;
    onCancel?: () => void;
    autoFocus?: boolean;
    header?: ReactNode;
    footer?: ReactNode;
    emptyState?: ReactNode;
    groupHeader?: string;
};

export function IOSPickerPage<T extends string | number>({
    items,
    selectedValue,
    onSelect,
    onCancel,
    autoFocus = true,
    header,
    footer,
    emptyState,
    groupHeader,
}: IOSPickerPageProps<T>) {
    const focusableIndexes = useMemo(() => items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.disabled && (item.value !== undefined || typeof item.onSelect === "function")), [items]);

    const initialIndex = useMemo(() => {
        if (focusableIndexes.length === 0) {
            return -1;
        }
        const selectedIndex = focusableIndexes.find(({ item }) => item.value !== undefined && item.value === selectedValue);
        return selectedIndex ? selectedIndex.index : focusableIndexes[0]?.index ?? -1;
    }, [focusableIndexes, selectedValue]);

    const [focusedIndex, setFocusedIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFocusedIndex(initialIndex);
    }, [initialIndex]);

    useEffect(() => {
        if (autoFocus) {
            containerRef.current?.focus();
        }
    }, [autoFocus]);

    const moveFocus = useCallback((direction: 1 | -1) => {
        if (focusableIndexes.length === 0) return;
        const current = focusedIndex;
        const order = items.map((_, idx) => idx);
        let candidate = current;

        for (let i = 0; i < order.length; i++) {
            candidate = (candidate + direction + order.length) % order.length;
            const item = items[candidate];
            if (item && !item.disabled) {
                setFocusedIndex(candidate);
                break;
            }
        }
    }, [focusedIndex, items, focusableIndexes.length]);

    const focusEdge = useCallback((position: "first" | "last") => {
        if (focusableIndexes.length === 0) return;
        const idx = position === "first"
            ? focusableIndexes[0]?.index ?? -1
            : focusableIndexes[focusableIndexes.length - 1]?.index ?? -1;
        setFocusedIndex(idx);
    }, [focusableIndexes]);

    const handleSelection = useCallback((index: number) => {
        const item = items[index];
        if (!item || item.disabled) return;
        if (item.onSelect) {
            item.onSelect();
            return;
        }
        if (item.value !== undefined) {
            onSelect(item.value);
        }
    }, [items, onSelect]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const { key } = event;
        if (key === "ArrowDown") {
            event.preventDefault();
            moveFocus(1);
        } else if (key === "ArrowUp") {
            event.preventDefault();
            moveFocus(-1);
        } else if (key === "Home") {
            event.preventDefault();
            focusEdge("first");
        } else if (key === "End") {
            event.preventDefault();
            focusEdge("last");
        } else if (key === "Enter" || key === " ") {
            if (focusedIndex >= 0) {
                event.preventDefault();
                handleSelection(focusedIndex);
            }
        } else if (key === "Escape") {
            event.preventDefault();
            onCancel?.();
        }
    }, [focusEdge, focusedIndex, handleSelection, moveFocus, onCancel]);

    const defaultRenderValue = useCallback((itemValue?: T, isSelected?: boolean) => {
        if (itemValue === undefined) return null;
        return isSelected ? <Check color="primary" sx={{ fontSize: 16 }} /> : "";
    }, []);

    const renderListContent = items.length === 0
        ? (
            emptyState || (
                <IOSListGroup>
                    <IOSListItem label="No items available" />
                </IOSListGroup>
            )
        ) : (
            <IOSListGroup header={groupHeader}>
                {items.map((item, index) => {
                    const isSelected = item.value !== undefined && selectedValue !== undefined && item.value === selectedValue;
                    const valueContent = item.renderValue
                        ? item.renderValue(isSelected)
                        : defaultRenderValue(item.value, isSelected);

                    return (
                        <IOSListItem
                            key={`${item.label}-${index}`}
                            label={item.label}
                            value={valueContent}
                            secondary={item.secondary}
                            icon={item.icon}
                            onClick={() => handleSelection(index)}
                            selected={index === focusedIndex}
                            disabled={item.disabled}
                            chevron={item.chevron}
                            textColor={item.textColor}
                            last={index === items.length - 1}
                        />
                    );
                })}
            </IOSListGroup>
        );

    return (
        <Box
            ref={containerRef}
            sx={{ pt: 2, outline: "none" }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {header}
            {renderListContent}
            {footer}
        </Box>
    );
}
