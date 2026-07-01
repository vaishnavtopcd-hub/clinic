import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import {
  NOTE_FIELD_TYPE_LABELS,
  OPTION_FIELD_TYPES,
  type NoteFieldType,
  type NoteTemplate,
  type NoteTemplateField,
} from '../lib/types';
import {
  PageHeader,
  Card,
  Spinner,
  EmptyState,
  Modal,
  Field,
  ErrorText,
  StatusPill,
} from '../components/ui';

/** A blank field of the given type. */
function newField(type: NoteFieldType = 'SINGLE_LINE_TEXT'): NoteTemplateField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    placeholder: '',
    required: false,
    order: 0,
    options: OPTION_FIELD_TYPES.includes(type)
      ? [{ label: 'Option 1', value: 'option_1' }]
      : undefined,
  };
}

interface Draft {
  name: string;
  description: string;
  isActive: boolean;
  fields: NoteTemplateField[];
}

const EMPTY_DRAFT: Draft = {
  name: '',
  description: '',
  isActive: true,
  fields: [],
};

export default function NoteTemplates() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<NoteTemplate | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState('');

  const list = useQuery({
    queryKey: ['note-templates'],
    queryFn: async () =>
      (await api.get<NoteTemplate[]>('/note-templates')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: draft.name,
        description: draft.description || undefined,
        isActive: draft.isActive,
        fields: draft.fields.map((f, i) => ({ ...f, order: i })),
      };
      return editing
        ? api.patch(`/note-templates/${editing.id}`, payload)
        : api.post('/note-templates', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['note-templates'] });
      setModal(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/note-templates/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note-templates'] }),
  });

  const toggle = useMutation({
    mutationFn: async (t: NoteTemplate) =>
      api.patch(`/note-templates/${t.id}/${t.isActive ? 'deactivate' : 'activate'}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note-templates'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/note-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note-templates'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setError('');
    setModal(true);
  };
  const openEdit = (t: NoteTemplate) => {
    setEditing(t);
    setDraft({
      name: t.name,
      description: t.description ?? '',
      isActive: t.isActive,
      fields: [...t.fields].sort((a, b) => a.order - b.order),
    });
    setError('');
    setModal(true);
  };

  // ---- Field editing helpers (operate on the draft) ----
  const setFields = (fields: NoteTemplateField[]) =>
    setDraft((d) => ({ ...d, fields }));
  const updateField = (i: number, patch: Partial<NoteTemplateField>) =>
    setFields(draft.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addField = () => setFields([...draft.fields, newField()]);
  const removeField = (i: number) =>
    setFields(draft.fields.filter((_, idx) => idx !== i));
  const moveField = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.fields.length) return;
    const copy = [...draft.fields];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setFields(copy);
  };

  return (
    <div>
      <PageHeader
        title="Clinical Note Templates"
        subtitle="Build reusable, dynamic note forms for your clinic"
        action={
          <button className="btn-primary" onClick={openCreate}>
            + New Template
          </button>
        }
      />

      <Card className="!p-0">
        {list.isLoading ? (
          <Spinner />
        ) : !list.data?.length ? (
          <EmptyState message="No templates yet. Create one to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Fields</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data.map((t) => (
                  <tr key={t.id} className="hover:bg-muted">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-foreground">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {t.fields.length}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusPill active={t.isActive} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
                          onClick={() => openEdit(t)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          onClick={() => duplicate.mutate(t.id)}
                        >
                          Duplicate
                        </button>
                        <button
                          className="min-w-[88px] rounded-md border border-border px-2.5 py-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                          onClick={() => toggle.mutate(t)}
                        >
                          {t.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-error transition-colors hover:bg-muted"
                          onClick={() => {
                            if (confirm(`Delete template "${t.name}"?`))
                              remove.mutate(t.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Template' : 'New Template'}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            save.mutate();
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Template Name" required>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Status">
              <label className="flex h-[42px] items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) =>
                    setDraft({ ...draft, isActive: e.target.checked })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Active (available for use)
                </span>
              </label>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <input
                  className="input"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Fields</h4>
              <button type="button" className="btn-secondary" onClick={addField}>
                + Add Field
              </button>
            </div>
            {draft.fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No fields yet. Add fields to build the form.
              </p>
            ) : (
              <div className="space-y-3">
                {draft.fields.map((f, i) => (
                  <FieldEditor
                    key={f.id}
                    field={f}
                    index={i}
                    total={draft.fields.length}
                    onChange={(patch) => updateField(i, patch)}
                    onMove={(dir) => moveField(i, dir)}
                    onRemove={() => removeField(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <ErrorText message={error} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** Editor card for a single template field. */
function FieldEditor({
  field,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  field: NoteTemplateField;
  index: number;
  total: number;
  onChange: (patch: Partial<NoteTemplateField>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const hasOptions = OPTION_FIELD_TYPES.includes(field.type);
  const isNumber = field.type === 'NUMBER';
  const isText =
    field.type === 'SINGLE_LINE_TEXT' || field.type === 'MULTI_LINE_TEXT';

  const changeType = (type: NoteFieldType) => {
    onChange({
      type,
      options: OPTION_FIELD_TYPES.includes(type)
        ? field.options ?? [{ label: 'Option 1', value: 'option_1' }]
        : undefined,
    });
  };

  const setOption = (oi: number, key: 'label' | 'value', v: string) =>
    onChange({
      options: (field.options ?? []).map((o, idx) =>
        idx === oi ? { ...o, [key]: v } : o,
      ),
    });
  const addOption = () =>
    onChange({
      options: [
        ...(field.options ?? []),
        { label: '', value: '' },
      ],
    });
  const removeOption = (oi: number) =>
    onChange({ options: (field.options ?? []).filter((_, idx) => idx !== oi) });

  const setValidation = (patch: Record<string, unknown>) =>
    onChange({ validation: { ...(field.validation ?? {}), ...patch } });

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Field {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-xs disabled:opacity-40"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-xs disabled:opacity-40"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-xs text-error"
            onClick={onRemove}
            title="Remove field"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Field Type">
          <select
            className="input"
            value={field.type}
            onChange={(e) => changeType(e.target.value as NoteFieldType)}
          >
            {(
              Object.keys(NOTE_FIELD_TYPE_LABELS) as NoteFieldType[]
            ).map((t) => (
              <option key={t} value={t}>
                {NOTE_FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Label" required>
          <input
            className="input"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            required
          />
        </Field>

        {field.type !== 'TOGGLE' &&
          field.type !== 'CHECKBOX' &&
          field.type !== 'FILE_UPLOAD' && (
            <Field label="Placeholder">
              <input
                className="input"
                value={field.placeholder ?? ''}
                onChange={(e) => onChange({ placeholder: e.target.value })}
              />
            </Field>
          )}

        <Field label="Default Value">
          <input
            className="input"
            value={
              field.defaultValue == null ? '' : String(field.defaultValue)
            }
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder={
              field.type === 'TOGGLE' || field.type === 'CHECKBOX'
                ? 'true / false'
                : ''
            }
          />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
        <span className="text-sm text-muted-foreground">Required</span>
      </label>

      {hasOptions && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="label mb-0">Options</span>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={addOption}
            >
              + Add option
            </button>
          </div>
          <div className="space-y-2">
            {(field.options ?? []).map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  className="input"
                  placeholder="Label"
                  value={o.label}
                  onChange={(e) => setOption(oi, 'label', e.target.value)}
                />
                <input
                  className="input font-mono"
                  placeholder="value"
                  value={o.value}
                  onChange={(e) => setOption(oi, 'value', e.target.value)}
                />
                <button
                  type="button"
                  className="rounded border border-border px-2 py-1 text-xs text-error"
                  onClick={() => removeOption(oi)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isNumber || isText) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {isNumber && (
            <>
              <Field label="Min">
                <input
                  type="number"
                  className="input"
                  value={field.validation?.min ?? ''}
                  onChange={(e) =>
                    setValidation({
                      min: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Max">
                <input
                  type="number"
                  className="input"
                  value={field.validation?.max ?? ''}
                  onChange={(e) =>
                    setValidation({
                      max: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </>
          )}
          {isText && (
            <>
              <Field label="Min length">
                <input
                  type="number"
                  className="input"
                  value={field.validation?.minLength ?? ''}
                  onChange={(e) =>
                    setValidation({
                      minLength:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Max length">
                <input
                  type="number"
                  className="input"
                  value={field.validation?.maxLength ?? ''}
                  onChange={(e) =>
                    setValidation({
                      maxLength:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Pattern (regex)">
                <input
                  className="input font-mono"
                  value={field.validation?.pattern ?? ''}
                  onChange={(e) => setValidation({ pattern: e.target.value })}
                />
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  );
}
