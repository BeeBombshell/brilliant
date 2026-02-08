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
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"

export interface DateTimePickerProps {
    value?: string // Expecting yyyy-MM-ddTHH:mm
    onChange?: (value: string) => void
    disabled?: boolean
    className?: string
    label?: string | null
}

export function DateTimePicker({
    value,
    onChange,
    disabled,
    className,
    label,
}: DateTimePickerProps) {
    const inputId = React.useId()

    const date = React.useMemo(() => {
        if (!value) return undefined
        const d = new Date(value)
        return isNaN(d.getTime()) ? undefined : d
    }, [value])

    const [isOpen, setIsOpen] = React.useState(false)

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return

        let hours = 0
        let minutes = 0

        if (date) {
            hours = date.getHours()
            minutes = date.getMinutes()
        }

        const updatedDate = new Date(newDate)
        updatedDate.setHours(hours)
        updatedDate.setMinutes(minutes)

        onChange?.(format(updatedDate, "yyyy-MM-dd'T'HH:mm"))
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeValue = e.target.value // HH:mm
        if (!timeValue) return

        const [hours, minutes] = timeValue.split(":").map(Number)
        const baseDate = date || new Date()
        const updatedDate = new Date(baseDate)
        updatedDate.setHours(hours)
        updatedDate.setMinutes(minutes)

        onChange?.(format(updatedDate, "yyyy-MM-dd'T'HH:mm"))
    }

    const timeValue = date ? format(date, "HH:mm") : "00:00"

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
                            {date ? format(date, "PPP p") : <span>Pick date & time</span>}
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
                    <div className="p-3 border-t">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-muted-foreground">Time</span>
                            <Input
                                type="time"
                                value={timeValue}
                                onChange={handleTimeChange}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
