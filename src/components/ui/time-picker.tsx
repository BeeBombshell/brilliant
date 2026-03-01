"use client"

import * as React from "react"
import { IconClock } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"

export interface TimePickerProps {
    value?: string // Expecting HH:mm
    onChange?: (value: string) => void
    disabled?: boolean
    className?: string
    label?: string | null
    placeholder?: string
}

export function TimePicker({
    value,
    onChange,
    disabled,
    className,
    label,
    placeholder = "Pick a time",
}: TimePickerProps) {
    const inputId = React.useId()
    const [isOpen, setIsOpen] = React.useState(false)

    // Ensure value is HH:mm
    const displayValue = value || ""

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
                        <IconClock className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">
                            {value ? value : <span>{placeholder}</span>}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-3" align="start">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Select Time</span>
                        <Input
                            type="time"
                            value={displayValue}
                            onChange={(e) => {
                                onChange?.(e.target.value)
                            }}
                            className="h-9 text-sm"
                            autoFocus
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-1 h-8 text-xs"
                            onClick={() => setIsOpen(false)}
                        >
                            Done
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
