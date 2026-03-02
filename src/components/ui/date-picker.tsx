"use client"

import * as React from "react"
import { format } from "date-fns"
import { IconCalendar } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { FieldLabel } from "@/components/ui/field"

export interface DatePickerProps {
    value?: string // Expecting yyyy-MM-dd
    onChange?: (value: string) => void
    disabled?: boolean
    className?: string
    label?: string | null
    placeholder?: string
}

export function DatePicker({
    value,
    onChange,
    disabled,
    className,
    label,
    placeholder = "Pick a date",
}: DatePickerProps) {
    const inputId = React.useId()

    const date = React.useMemo(() => {
        if (!value) return undefined
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined

        const [yearStr, monthStr, dayStr] = value.split("-")
        const year = Number(yearStr)
        const month = Number(monthStr)
        const day = Number(dayStr)

        const d = new Date(year, month - 1, day)
        if (
            d.getFullYear() !== year ||
            d.getMonth() !== month - 1 ||
            d.getDate() !== day
        ) {
            return undefined
        }

        return d
    }, [value])

    const [isOpen, setIsOpen] = React.useState(false)

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return
        onChange?.(format(newDate, "yyyy-MM-dd"))
        setIsOpen(false)
    }

    return (
        <div className={cn("w-full", className)}>
            {label && (
                <FieldLabel htmlFor={inputId} className="text-xs text-muted-foreground mb-1">
                    {label}
                </FieldLabel>
            )}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={inputId}
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start text-left font-normal h-9 px-3",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <IconCalendar className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">
                            {date ? format(date, "PPP") : <span>{placeholder}</span>}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
