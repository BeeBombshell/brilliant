import { useState, useId, useCallback, useMemo } from "react";
import { z } from "zod";
import { useTamboComponentState, useTamboThread } from "@tambo-ai/react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

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
            <SelectTrigger className="w-full">
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
        <RadioGroup value={value} onValueChange={onChange} className="gap-2.5">
            {field.options?.filter(opt => opt.value && opt.label).map((opt) => {
                const optId = `${field.id ?? 'field'}-${opt.value}`;
                return (
                    <div key={opt.value!} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value!} id={optId} />
                        <Label htmlFor={optId} className="font-normal cursor-pointer">
                            {opt.label}
                        </Label>
                    </div>
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
            <div className="flex flex-col gap-2.5">
                {field.options.filter(opt => opt.value && opt.label).map((opt) => {
                    const optId = `${field.id ?? 'field'}-${opt.value}`;
                    return (
                        <div key={opt.value!} className="flex items-center gap-2">
                            <Checkbox
                                id={optId}
                                checked={selected.includes(opt.value!)}
                                onCheckedChange={() => toggle(opt.value!)}
                            />
                            <Label htmlFor={optId} className="font-normal cursor-pointer">
                                {opt.label}
                            </Label>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Single boolean checkbox
    const cbId = field.id ?? 'checkbox';
    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id={cbId}
                checked={value === "true"}
                onCheckedChange={(checked) => onChange(String(!!checked))}
            />
            <Label htmlFor={cbId} className="font-normal cursor-pointer">
                {field.label ?? 'Option'}
            </Label>
        </div>
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
        <div className="flex items-center gap-3">
            <Switch
                id={swId}
                checked={value === "true"}
                onCheckedChange={(checked) => onChange(String(!!checked))}
            />
            <Label htmlFor={swId} className="font-normal cursor-pointer">
                {field.label ?? 'Toggle'}
            </Label>
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
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{min}</span>
                <Badge variant="secondary">{value || min}</Badge>
                <span>{max}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value || String(min)}
                onChange={(e) => onChange(e.target.value)}
                className="w-full accent-primary cursor-pointer"
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
                <Label htmlFor={field.id ?? undefined} className="flex items-center gap-1">
                    {field.label ?? 'Field'}
                    {field.required && <span className="text-destructive">*</span>}
                </Label>
            )}
            {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
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

            {error && <FieldError>{error}</FieldError>}
        </Field>
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

    // Use plain useState for values — useTamboComponentState doesn't support functional updaters
    // which handleChange needs: setValues(prev => ({ ...prev, [id]: val }))
    const [values, setValues] = useState<Record<string, string>>(initialValues);
    const [submitted, setSubmitted] = useTamboComponentState<boolean>("submitted", false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { sendThreadMessage } = useTamboThread();

    const handleChange = useCallback((fieldId: string, value: string) => {
        setValues((prev) => ({ ...prev, [fieldId]: value }));
        // Clear error on change
        setErrors((prev) => {
            if (!prev[fieldId]) return prev;
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
    }, []);

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
        (e: React.FormEvent) => {
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
            sendThreadMessage(message, { streamResponse: true });
            setSubmitted(true);
        },
        [validate, setSubmitted, fields, values, title, sendThreadMessage]
    );

    const isFormReady = useMemo(() => {
        if (!fields || fields.length === 0) return false;
        return fields.every((f) => !!f.id && !!f.type && !!f.label);
    }, [fields]);

    // Build the field rendering function with optional width support
    const renderField = (field: FormFieldDef) => {
        // Skip fields still streaming without an id or type
        const fieldId = field.id ?? `_streaming_${Math.random()}`;
        if (!field.type || !field.label) {
            return (
                <div key={fieldId} className="col-span-full">
                    <div className="h-10 rounded-lg bg-muted animate-pulse" />
                </div>
            );
        }

        return (
            <div key={fieldId} className="w-full">
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
            <Card className="w-full max-w-full animate-pulse bg-transparent ring-0 shadow-none rounded-none overflow-visible">
                <CardHeader className="px-0 pt-0">
                    <CardTitle>{title ?? "Loading form…"}</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 rounded-lg bg-muted" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (submitted) {
        return (
            <Card className="w-full max-w-full bg-transparent ring-0 shadow-none rounded-none overflow-visible">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-green-600">✓ Submitted Successfully</CardTitle>
                    <CardDescription>
                        Your responses for "{title}" have been recorded.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="space-y-2">
                        {fields.map((f) => {
                            if (!f.id) return null;
                            const val = values[f.id];
                            if (!val) return null;
                            return (
                                <div key={f.id} className="flex flex-col gap-0.5">
                                    <span className="text-xs font-medium text-muted-foreground">{f.label ?? 'Field'}</span>
                                    <span className="text-sm">{val}</span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Always use single-column layout — one field per row
    const gridClass = "flex flex-col gap-5";

    // Section-based layout
    const hasSections = sections && sections.length > 0;

    return (
        <Card className="w-full max-w-full bg-transparent ring-0 shadow-none rounded-none overflow-visible">
            <CardHeader className="px-0 pt-0">
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="px-0 pt-4">
                    {hasSections ? (
                        <div className="space-y-8">
                            {sections.map((section, idx) => {
                                const sectionFields = fields.filter((f) =>
                                    f.id && section.fieldIds?.includes(f.id)
                                );
                                if (sectionFields.length === 0) return null;
                                return (
                                    <div key={idx} className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-semibold">{section.title ?? 'Section'}</h3>
                                            {section.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {section.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className={gridClass}>
                                            {sectionFields.map(renderField)}
                                        </div>
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
                                        {unsectioned.map(renderField)}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className={gridClass}>{fields.map(renderField)}</div>
                    )}
                </CardContent>
                {isFormReady && !submitted && (
                    <CardFooter className="px-0 bg-transparent border-0">
                        <Button type="submit" className="w-full sm:w-auto">
                            {submitLabel ?? "Submit"}
                        </Button>
                    </CardFooter>
                )}
            </form>
        </Card>
    );
}
