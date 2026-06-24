import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Check } from 'lucide-react';
import { api, apiError } from '../lib/api';
import type { PermissionCatalog } from '../lib/types';
import { PageHeader, Card, Spinner, ErrorText } from '../components/ui';

const ROLE_LABELS: Record<string, string> = {
  CLINIC_ADMIN: 'Clinic Admin',
  PHYSIOTHERAPIST: 'Physiotherapist',
  HR: 'HR',
};

const cloneMatrix = (data: Record<string, string[]>) => {
  const next: Record<string, Set<string>> = {};
  for (const [role, keys] of Object.entries(data)) next[role] = new Set(keys);
  return next;
};

export default function Permissions() {
  const qc = useQueryClient();
  // Editable working copy + a pristine copy to diff against for "what changed".
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [original, setOriginal] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const catalog = useQuery({
    queryKey: ['perm-catalog'],
    queryFn: async () =>
      (await api.get<PermissionCatalog>('/permissions/catalog')).data,
  });
  const current = useQuery({
    queryKey: ['perm-matrix'],
    queryFn: async () =>
      (await api.get<Record<string, string[]>>('/permissions/matrix')).data,
  });

  // Seed both copies once the server matrix loads.
  useEffect(() => {
    if (current.data) {
      setMatrix(cloneMatrix(current.data));
      setOriginal(cloneMatrix(current.data));
    }
  }, [current.data]);

  const roles = catalog.data?.configurableRoles ?? [];

  // Which roles differ from what's saved on the server.
  const changedRoles = useMemo(
    () =>
      roles.filter((r) => {
        const a = matrix[r] ?? new Set<string>();
        const b = original[r] ?? new Set<string>();
        if (a.size !== b.size) return true;
        for (const k of a) if (!b.has(k)) return true;
        return false;
      }),
    [roles, matrix, original],
  );
  const dirty = changedRoles.length > 0;

  const save = useMutation({
    mutationFn: async () => {
      // Persist only the roles that actually changed.
      await Promise.all(
        changedRoles.map((r) =>
          api.put(`/permissions/${r}`, {
            permissions: Array.from(matrix[r] ?? []),
          }),
        ),
      );
    },
    onSuccess: () => {
      // Promote the working copy to the new pristine baseline.
      const snapshot: Record<string, Set<string>> = {};
      for (const [r, s] of Object.entries(matrix)) snapshot[r] = new Set(s);
      setOriginal(snapshot);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['perm-matrix'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(apiError(e)),
  });

  if (catalog.isLoading || current.isLoading) return <Spinner />;

  const toggle = (role: string, key: string) => {
    setMatrix((m) => {
      const set = new Set(m[role] ?? []);
      set.has(key) ? set.delete(key) : set.add(key);
      return { ...m, [role]: set };
    });
    setSaved(false);
  };

  const toggleGroup = (role: string, keys: string[], on: boolean) => {
    setMatrix((m) => {
      const set = new Set(m[role] ?? []);
      keys.forEach((k) => (on ? set.add(k) : set.delete(k)));
      return { ...m, [role]: set };
    });
    setSaved(false);
  };

  return (
    <div className="pb-24">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Configure what each role can do. Applies to all clinics."
        action={
          saved && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <Check className="h-4 w-4" /> All changes saved
            </span>
          )
        }
      />

      {/* One card per module so every module reads as a distinct section. */}
      <div className="space-y-4">
        {catalog.data!.groups.map((group) => {
          const keys = group.permissions.map((p) => p.key);
          return (
            <Card key={group.group} className="!p-0 overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h3 className="font-semibold text-foreground">{group.group}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">
                        Permission
                      </th>
                      {roles.map((r) => {
                        const all = keys.every((k) => matrix[r]?.has(k));
                        return (
                          <th
                            key={r}
                            className="px-4 py-2 text-center font-medium"
                          >
                            <div>{ROLE_LABELS[r] ?? r}</div>
                            <button
                              type="button"
                              className="mt-0.5 text-[11px] font-normal normal-case text-primary hover:underline"
                              onClick={() => toggleGroup(r, keys, !all)}
                            >
                              {all ? 'Clear all' : 'Select all'}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.permissions.map((p) => (
                      <tr key={p.key} className="hover:bg-muted/50">
                        <td className="px-4 py-2.5 text-foreground">
                          {p.label}
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {p.key}
                          </span>
                        </td>
                        {roles.map((r) => (
                          <td key={r} className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={matrix[r]?.has(p.key) ?? false}
                              onChange={() => toggle(r, p.key)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      <ErrorText message={error} />

      {/* Single sticky save bar — replaces the two per-role Save buttons. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 lg:left-64">
          <div className="flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6">
            <span className="text-sm text-muted-foreground">
              Unsaved changes to{' '}
              <span className="font-medium text-foreground">
                {changedRoles.map((r) => ROLE_LABELS[r] ?? r).join(' & ')}
              </span>
            </span>
            <button
              className="btn-primary"
              disabled={save.isPending}
              onClick={() => {
                setError('');
                save.mutate();
              }}
            >
              <Save className="h-4 w-4" />
              {save.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
