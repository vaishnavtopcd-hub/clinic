import type { NoteTemplateField } from '../lib/types';
import { Field } from './ui';

type Values = Record<string, unknown>;

/**
 * Renders a template's configured fields as a live form. Values are kept in a
 * `{ fieldId: value }` map owned by the parent. Adding a new field type only
 * means adding a case here — no schema or API changes.
 */
export function DynamicNoteFields({
  fields,
  values,
  onChange,
}: {
  fields: NoteTemplateField[];
  values: Values;
  onChange: (fieldId: string, value: unknown) => void;
}) {
  const sorted = [...fields].sort((a, b) => a.order - b.order);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map((f) => (
        <div
          key={f.id}
          className={
            f.type === 'MULTI_LINE_TEXT' ? 'sm:col-span-2' : undefined
          }
        >
          <DynamicField
            field={f}
            value={values[f.id]}
            onChange={(v) => onChange(f.id, v)}
          />
        </div>
      ))}
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: NoteTemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const v = field.validation ?? {};

  switch (field.type) {
    case 'MULTI_LINE_TEXT':
      return (
        <Field label={field.label} required={field.required}>
          <textarea
            className="input"
            rows={3}
            placeholder={field.placeholder}
            required={field.required}
            minLength={v.minLength}
            maxLength={v.maxLength}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case 'NUMBER':
      return (
        <Field label={field.label} required={field.required}>
          <input
            type="number"
            className="input"
            placeholder={field.placeholder}
            required={field.required}
            min={v.min}
            max={v.max}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case 'DATE':
      return (
        <Field label={field.label} required={field.required}>
          <input
            type="date"
            className="input"
            required={field.required}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case 'DROPDOWN':
      return (
        <Field label={field.label} required={field.required}>
          <select
            className="input"
            required={field.required}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      );

    case 'RADIO':
      return (
        <Field label={field.label} required={field.required}>
          <div className="flex flex-wrap gap-3 pt-1">
            {(field.options ?? []).map((o) => (
              <label key={o.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </Field>
      );

    case 'MULTI_SELECT': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (val: string) =>
        onChange(
          arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
        );
      return (
        <Field label={field.label} required={field.required}>
          <div className="flex flex-wrap gap-3 pt-1">
            {(field.options ?? []).map((o) => (
              <label key={o.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={arr.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </Field>
      );
    }

    case 'CHECKBOX':
    case 'TOGGLE':
      return (
        <div>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm text-foreground">
              {field.label}
              {field.required && <span className="text-error"> *</span>}
            </span>
          </label>
        </div>
      );

    case 'FILE_UPLOAD':
      return (
        <Field label={field.label} required={field.required}>
          <input
            type="file"
            className="input"
            required={field.required}
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
          />
          {typeof value === 'string' && value && (
            <p className="mt-1 text-xs text-muted-foreground">Selected: {value}</p>
          )}
        </Field>
      );

    case 'SINGLE_LINE_TEXT':
    default:
      return (
        <Field label={field.label} required={field.required}>
          <input
            className="input"
            placeholder={field.placeholder}
            required={field.required}
            minLength={v.minLength}
            maxLength={v.maxLength}
            pattern={v.pattern}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
  }
}

/** Build the snapshot saved on the clinical note from raw values. */
export function buildTemplateSnapshot(
  fields: NoteTemplateField[],
  values: Values,
) {
  return [...fields]
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      fieldId: f.id,
      label: f.label,
      type: f.type,
      value: values[f.id] ?? null,
    }));
}

/** Human-readable rendering of a stored template value (for detail views). */
export function formatTemplateValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/**
 * Format a value against its (snapshotted) field definition — resolves choice
 * values to their option labels using the frozen structure, so the display is
 * accurate to the template version the record was created with.
 */
export function formatFieldValue(
  field: NoteTemplateField,
  value: unknown,
): string {
  const labelFor = (val: string) =>
    field.options?.find((o) => o.value === val)?.label ?? val;

  if (field.options && field.options.length) {
    if (Array.isArray(value))
      return value.length ? value.map((v) => labelFor(String(v))).join(', ') : '—';
    if (value == null || value === '') return '—';
    return labelFor(String(value));
  }
  return formatTemplateValue(value);
}
