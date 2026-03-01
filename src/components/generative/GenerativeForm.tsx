import { useState, useId, useCallback, useMemo } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTamboComponentState, useTamboThreadInput } from "@tambo-ai/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { IconCheck, IconClipboard, IconSparkles } from "@tabler/icons-react";

function safeMarkdownUrlTransform(url: string): string {
    const trimmed = url.trim();
    if (trimmed.length === 0) return "";
    if (trimmed.startsWith("//")) return "";

    try {
        const parsed = new URL(trimmed, "https://example.com");
        const protocol = parsed.protocol.toLowerCase();

        if (
            protocol === "http:" ||
            protocol === "https:" ||
            protocol === "mailto:" ||
            protocol === "tel:"
        ) {
            return trimmed;
        }

        const isRelative = trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith(".");
        return isRelative ? trimmed : "";
    } catch {
        return "";
    }
}

// --- Field type definition ---
// Each field the AI generates matches this shape.

export const FormFieldSchema = z.object({
    id: z.string().nullish().describe("Unique field identifier, e.g. 'full_name'"),
    type: z.string().nullish().describe(
        "The input type. Must be one of: text, email, number, tel, url, password, textarea, select, radio, checkbox, switch, date, time, datetime-local, range. Use 'text' for short text, 'textarea' for long text, 'select' for dropdown choices, 'radio' for single-choice options, 'checkbox' for multi-select or boolean toggles, 'switch' for on/off toggles."
    ),
    label: z.string().nullish().describe("Human-readable label shown above the field"),
    placeholder: z.string().nullish().describe("Placeholder text inside the input"),
    description: z.string().nullish().describe("Helper text shown below the label"),
    required: z.boolean().nullish().describe("Whether the field is required. Defaults to false"),
    defaultValue: z.string().nullish().describe("Default value for the field (string representation)"),
    options: z.array(z.object({
        label: z.string().nullish().describe("Display label for the option"),
        value: z.string().nullish().describe("Value submitted for the option"),
    })).nullish().describe("Options for select, radio, or checkbox (multi-select) fields"),
    validation: z.object({
        min: z.number().nullish().describe("Minimum value (for number/range) or min length (for text)"),
        max: z.number().nullish().describe("Maximum value (for number/range) or max length (for text)"),
        pattern: z.string().nullish().describe("Regex pattern for validation"),
        patternMessage: z.string().nullish().describe("Custom error message when pattern fails"),
    }).nullish().describe("Validation rules for the field"),
    width: z.string().nullish().describe("Width of the field in the form grid. Must be one of: full, half, third. Defaults to full"),
});

export const GenerativeFormSchema = z.object({
    title: z.string().nullish().describe("Form title displayed at the top of the card"),
    description: z.string().nullish().describe("Form description shown below the title"),
    fields: z.array(FormFieldSchema).nullish().describe(
        "Array of form fields to render. The AI should populate this based on the questionnaire topic. Each field has a type (text, select, radio, checkbox, etc.), label, and optional validation."
    ),
    submitLabel: z.string().nullish().describe("Text for the submit button. Defaults to 'Submit'"),
    sections: z.array(z.object({
        title: z.string().nullish().describe("Section heading"),
        description: z.string().nullish().describe("Section description"),
        fieldIds: z.array(z.string()).nullish().describe("IDs of fields that belong to this section"),
    })).nullish().describe("Optional sections to group fields under headings. If omitted, all fields render in a single group."),
});

export type FormFieldDef = z.infer<typeof FormFieldSchema>;
export type GenerativeFormProps = z.infer<typeof GenerativeFormSchema>;

// --- Individual field renderers ---

function TextInputField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    const inputId = useId();
    const inputType = field.type as React.HTMLInputTypeAttribute;

    return (
        <Input
            id={inputId}
            type={inputType}
            placeholder={field.placeholder ?? ""}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required ?? undefined}
            min={field.validation?.min ?? undefined}
            max={field.validation?.max ?? undefined}
            minLength={field.type === "text" ? (field.validation?.min ?? undefined) : undefined}
            maxLength={field.type === "text" ? (field.validation?.max ?? undefined) : undefined}
            pattern={field.validation?.pattern ?? undefined}
            className="transition-all duration-200 focus:shadow-md"
        />
    );
}

function TextareaField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <Textarea
            placeholder={field.placeholder ?? ""}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required ?? undefined}
            rows={4}
            minLength={field.validation?.min ?? undefined}
            maxLength={field.validation?.max ?? undefined}
            className="transition-all duration-200 focus:shadow-md"
        />
    );
}

function SelectField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full transition-all duration-200">
                <SelectValue placeholder={field.placeholder ?? "Select an option…"} />
            </SelectTrigger>
            <SelectContent>
                {field.options?.filter(opt => opt.value && opt.label).map((opt) => (
                    <SelectItem key={opt.value!} value={opt.value!}>
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function RadioField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <RadioGroup value={value} onValueChange={onChange} className="grid gap-3">
            {field.options?.filter(opt => opt.value && opt.label).map((opt) => {
                const optId = `${field.id ?? 'field'}-${opt.value}`;
                const isSelected = value === opt.value;
                return (
                    <label
                        key={opt.value!}
                        htmlFor={optId}
                        className={`
                            group relative flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer
                            transition-all duration-300 ease-out
                            ${isSelected
                                ? 'border-primary/50 bg-primary/[0.03] shadow-[0_0_20px_rgba(var(--primary),0.05)] ring-1 ring-primary/20'
                                : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                            }
                        `}
                    >
                        <div className={`
                            flex size-5 shrink-0 items-center justify-center rounded-full border
                            transition-all duration-300
                            ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 group-hover:border-primary/50'}
                        `}>
                            <RadioGroupItem value={opt.value!} id={optId} className="sr-only" />
                            {isSelected && <div className="size-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            {opt.label}
                        </span>
                    </label>
                );
            })}
        </RadioGroup>
    );
}

function CheckboxField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    // If options exist → multi-select checkboxes, stored as comma-separated values
    // If no options → single boolean checkbox
    if (field.options && field.options.length > 0) {
        const selected = value ? value.split(",").filter(Boolean) : [];

        const toggle = (optValue: string) => {
            const next = selected.includes(optValue)
                ? selected.filter((v) => v !== optValue)
                : [...selected, optValue];
            onChange(next.join(","));
        };

        return (
            <div className="grid gap-3">
                {field.options.filter(opt => opt.value && opt.label).map((opt) => {
                    const optId = `${field.id ?? 'field'}-${opt.value}`;
                    const isSelected = selected.includes(opt.value!);
                    return (
                        <label
                            key={opt.value!}
                            htmlFor={optId}
                            className={`
                                group relative flex items-center gap-4 rounded-xl border px-4 py-3 cursor-pointer
                                transition-all duration-300 ease-out
                                ${isSelected
                                    ? 'border-primary/50 bg-primary/[0.03] shadow-[0_0_20px_rgba(var(--primary),0.05)] ring-1 ring-primary/20'
                                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                                }
                            `}
                        >
                            <div className={`
                                flex size-5 shrink-0 items-center justify-center rounded-lg border
                                transition-all duration-300
                                ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 group-hover:border-primary/50'}
                            `}>
                                <Checkbox
                                    id={optId}
                                    checked={isSelected}
                                    onCheckedChange={() => toggle(opt.value!)}
                                    className="sr-only"
                                />
                                {isSelected && <IconCheck size={14} className="text-primary-foreground" />}
                            </div>
                            <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                {opt.label}
                            </span>
                        </label>
                    );
                })}
            </div>
        );
    }

    // Single boolean checkbox
    const cbId = field.id ?? 'checkbox';
    const isChecked = value === "true";
    return (
        <label
            htmlFor={cbId}
            className={`
                group relative flex items-center gap-4 rounded-xl border px-4 py-3 cursor-pointer
                transition-all duration-300 ease-out
                ${isChecked
                    ? 'border-primary/50 bg-primary/[0.03] shadow-[0_0_20px_rgba(var(--primary),0.05)] ring-1 ring-primary/20'
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                }
            `}
        >
            <div className={`
                flex size-5 shrink-0 items-center justify-center rounded-lg border
                transition-all duration-300
                ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/30 group-hover:border-primary/50'}
            `}>
                <Checkbox
                    id={cbId}
                    checked={isChecked}
                    onCheckedChange={(checked) => onChange(String(!!checked))}
                    className="sr-only"
                />
                {isChecked && <IconCheck size={14} className="text-primary-foreground" />}
            </div>
            <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {field.label ?? 'Option'}
            </span>
        </label>
    );
}

function SwitchField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    const swId = field.id ?? 'switch';
    return (
        <div className={`
            flex items-center justify-between rounded-xl border px-4 py-3
            transition-all duration-200
            ${value === "true"
                ? 'border-primary/40 bg-primary/5'
                : 'border-border hover:border-primary/20'
            }
        `}>
            <Label htmlFor={swId} className="font-normal cursor-pointer text-sm">
                {field.label ?? 'Toggle'}
            </Label>
            <Switch
                id={swId}
                checked={value === "true"}
                onCheckedChange={(checked) => onChange(String(!!checked))}
            />
        </div>
    );
}

function RangeField({
    field,
    value,
    onChange,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
}) {
    const min = field.validation?.min ?? 0;
    const max = field.validation?.max ?? 100;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{min}</span>
                <Badge variant="secondary" className="text-xs tabular-nums font-semibold">{value || min}</Badge>
                <span>{max}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value || String(min)}
                onChange={(e) => onChange(e.target.value)}
                className="w-full accent-primary cursor-pointer h-2 rounded-full"
            />
        </div>
    );
}

// --- Main field renderer ---

function FormFieldRenderer({
    field,
    value,
    onChange,
    error,
}: {
    field: FormFieldDef;
    value: string;
    onChange: (v: string) => void;
    error?: string;
}) {
    // Switch and single-checkbox have label inline, skip outer label
    const hasInlineLabel = field.type === "switch" || (field.type === "checkbox" && (!field.options || field.options.length === 0));

    return (
        <Field data-invalid={!!error || undefined}>
            {!hasInlineLabel && (
                <Label htmlFor={field.id ?? undefined} className="flex items-center gap-1.5 text-sm font-medium">
                    {field.label ?? 'Field'}
                    {field.required && <span className="text-destructive text-xs">*</span>}
                </Label>
            )}
            {field.description && (
                <FieldDescription className="text-xs text-muted-foreground mt-0.5 mb-1.5">{field.description}</FieldDescription>
            )}

            {/* Render the appropriate input */}
            {(field.type === "text" || field.type === "email" || field.type === "number" ||
                field.type === "tel" || field.type === "url" || field.type === "password" ||
                field.type === "date" || field.type === "time") && (
                    <TextInputField field={field} value={value} onChange={onChange} />
                )}
            {field.type === "datetime-local" && (
                <DateTimePicker value={value} onChange={onChange} />
            )}
            {field.type === "textarea" && (
                <TextareaField field={field} value={value} onChange={onChange} />
            )}
            {field.type === "select" && (
                <SelectField field={field} value={value} onChange={onChange} />
            )}
            {field.type === "radio" && (
                <RadioField field={field} value={value} onChange={onChange} />
            )}
            {field.type === "checkbox" && (
                <CheckboxField field={field} value={value} onChange={onChange} />
            )}
            {field.type === "switch" && (
                <SwitchField field={field} value={value} onChange={onChange} />
            )}
            {field.type === "range" && (
                <RangeField field={field} value={value} onChange={onChange} />
            )}

            {error && <FieldError className="text-xs mt-1">{error}</FieldError>}
        </Field>
    );
}

// --- Animated step progress for multi-section forms ---
function FormProgress({ current, total }: { current: number; total: number }) {
    if (total <= 1) return null;
    return (
        <div className="flex items-center gap-1.5 mb-1">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < current
                        ? 'bg-primary'
                        : i === current
                            ? 'bg-primary/50'
                            : 'bg-muted'
                        }`}
                />
            ))}
        </div>
    );
}

// --- Main GenerativeForm component ---

export function GenerativeForm({
    title,
    description,
    fields,
    submitLabel,
    sections,
}: GenerativeFormProps) {
    // Build initial values map from defaults
    const initialValues = useMemo(() => {
        const vals: Record<string, string> = {};
        fields?.forEach((f) => {
            if (f.id) vals[f.id] = f.defaultValue ?? "";
        });
        return vals;
    }, [fields]);

    // Use useTamboComponentState to persist form values across re-renders during streaming
    const [persistedValues, setValues] = useTamboComponentState<Record<string, string>>("values", initialValues);
    const values = persistedValues ?? initialValues;
    const [submitted, setSubmitted] = useTamboComponentState<boolean>("submitted", false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { setValue: setInputValue, submit } = useTamboThreadInput();

    const handleChange = useCallback((fieldId: string, value: string) => {
        setValues((prev) => ({ ...prev, [fieldId]: value }));
        // Clear error on change
        setErrors((prev) => {
            if (!prev[fieldId]) return prev;
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
    }, [setValues]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        fields?.forEach((f) => {
            if (!f.id) return;
            const val = values[f.id] ?? "";
            if (f.required && !val.trim()) {
                newErrors[f.id] = `${f.label ?? 'Field'} is required`;
            }
            if (f.validation?.pattern && val) {
                try {
                    const re = new RegExp(f.validation.pattern);
                    if (!re.test(val)) {
                        newErrors[f.id] = f.validation.patternMessage ?? `Invalid format for ${f.label ?? 'field'}`;
                    }
                } catch {
                    // invalid regex, skip
                }
            }
            if (f.type === "number" && val) {
                const num = Number(val);
                if (f.validation?.min != null && num < f.validation.min) {
                    newErrors[f.id] = `Minimum value is ${f.validation.min}`;
                }
                if (f.validation?.max != null && num > f.validation.max) {
                    newErrors[f.id] = `Maximum value is ${f.validation.max}`;
                }
            }
        });
        return newErrors;
    }, [fields, values]);



    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const validationErrors = validate();
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }

            const summary = (fields ?? [])
                .filter((f) => f.id && values[f.id])
                .map((f) => `- **${f.label ?? f.id}**: ${values[f.id!]}`)
                .join("\n");

            const message = `Form "${title ?? "Untitled"}" submitted with the following responses:\n${summary}`;
            try {
                setInputValue(message);
                await submit();
                setSubmitted(true);
            } catch (error) {
                console.error("Failed to submit form:", error);
            }
        },
        [validate, setSubmitted, fields, values, title, setInputValue, submit]
    );

    const isFormReady = useMemo(() => {
        if (!fields || fields.length === 0) return false;
        return fields.every((f) => !!f.id && !!f.type && !!f.label);
    }, [fields]);

    // Build the field rendering function with optional width support
    const renderField = (field: FormFieldDef, index: number) => {
        // Skip fields still streaming without an id or type
        const fieldId = field.id ?? `_streaming_${index}`;
        if (!field.type || !field.label) {
            return (
                <div key={fieldId} className="col-span-full">
                    <div className="h-12 rounded-xl bg-muted/50 animate-pulse" />
                </div>
            );
        }

        return (
            <div key={fieldId} className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <FormFieldRenderer
                    field={field}
                    value={values[fieldId] ?? ""}
                    onChange={(v) => handleChange(fieldId, v)}
                    error={errors[fieldId]}
                />
            </div>
        );
    };

    // Guard against streaming — fields may be undefined initially
    if (!fields || fields.length === 0) {
        return (
            <div className="w-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="p-5 border-b border-border/30">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <IconSparkles size={16} className="text-primary animate-pulse" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{title ?? "Generating form…"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Please wait while the form is being created</div>
                        </div>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 w-24 rounded-md bg-muted/70 animate-pulse" />
                            <div className="h-10 rounded-xl bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="w-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                {/* Success header */}
                <div className="p-5 border-b border-border/30 bg-emerald-500/5">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <IconCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                                Submitted Successfully
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                Your responses for "{title}" have been recorded
                            </div>
                        </div>
                    </div>
                </div>
                {/* Response summary */}
                <div className="p-5">
                    <div className="space-y-3">
                        {fields.map((f) => {
                            if (!f.id) return null;
                            const val = values[f.id];
                            if (!val) return null;
                            return (
                                <div key={f.id} className="flex flex-col gap-1 rounded-xl bg-muted/30 px-4 py-3">
                                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {f.label ?? 'Field'}
                                    </span>
                                    <span className="text-sm font-medium">{val}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Single-column layout
    const gridClass = "flex flex-col gap-5";
    const hasSections = sections && sections.length > 0;
    const totalSections = hasSections ? sections.length : 1;

    return (
        <div className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-500 hover:border-white/[0.12] pointer-events-auto relative z-10">
            {/* Form header */}
            <div className="p-4 border-b border-white/[0.05] bg-white/[0.01]">
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
                            <IconClipboard size={18} className="text-primary" />
                        </div>
                        <h3 className="font-bold text-base leading-tight tracking-tight text-white/90">{title}</h3>
                        {fields && (
                            <Badge variant="secondary" className="bg-white/5 border-white/10 text-[10px] shrink-0 tabular-nums px-2 py-0.5 text-white/50">
                                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                            </Badge>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        {description && (
                            <div className="mt-3 rounded-xl bg-white/[0.03] p-3.5 border border-white/[0.05] ring-1 ring-white/[0.05] shadow-inner">
                                <div className="prose prose-sm prose-invert max-w-none text-white/60 leading-relaxed text-[13px]">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        allowedElements={["p", "strong", "em", "ul", "ol", "li", "code", "pre", "a", "br"]}
                                        unwrapDisallowed
                                        urlTransform={safeMarkdownUrlTransform}
                                        components={{
                                            a: ({ node, href, ...props }) => {
                                                void node;

                                                if (!href) {
                                                    return <span>{props.children}</span>;
                                                }

                                                return (
                                                    <a
                                                        {...props}
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer noopener"
                                                    />
                                                );
                                            },
                                        }}
                                    >
                                        {description}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {hasSections && <div className="mt-4"><FormProgress current={0} total={totalSections} /></div>}
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit}>
                <div className="p-4">
                    {hasSections ? (
                        <div className="space-y-8">
                            {sections.map((section, idx) => {
                                const sectionFields = fields.filter((f) =>
                                    f.id && section.fieldIds?.includes(f.id)
                                );
                                if (sectionFields.length === 0) return null;
                                return (
                                    <div key={idx} className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="size-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold leading-tight">
                                                    {section.title ?? 'Section'}
                                                </h4>
                                                {section.description && (
                                                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                                                        {section.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className={gridClass}>
                                            {sectionFields.map((f, index) => renderField(f, index))}
                                        </div>
                                        {idx < sections.length - 1 && (
                                            <div className="border-b border-border/30" />
                                        )}
                                    </div>
                                );
                            })}
                            {/* Render any fields not in any section */}
                            {(() => {
                                const sectionedIds = new Set(
                                    sections.flatMap((s) => s.fieldIds ?? [])
                                );
                                const unsectioned = fields.filter(
                                    (f) => !f.id || !sectionedIds.has(f.id)
                                );
                                if (unsectioned.length === 0) return null;
                                return (
                                    <div className={gridClass}>
                                        {unsectioned.map((f, index) => renderField(f, index))}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className={gridClass}>{fields.map((f, index) => renderField(f, index))}</div>
                    )}
                </div>

                {/* Form footer */}
                {isFormReady && !submitted && (
                    <div className="px-4 pb-4 pt-1">
                        <Button
                            type="submit"
                            className="group relative w-full sm:w-auto overflow-hidden rounded-xl px-6 h-10 font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-primary/20"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {submitLabel ?? "Submit"}
                                <IconSparkles size={14} className="opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 transition-opacity group-hover:opacity-90" />
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}
