import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { fileToDownscaledDataUrl } from '../lib/image';
import { PageHeader, Card, Field, ErrorText } from '../components/ui';

export default function Settings() {
  const { user, refreshUser } = useAuth();

  // --- Profile details (editable) ---
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    department: '',
    address: '',
    specialization: '',
    photoUrl: '' as string | undefined,
  });
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seed the form from the current user (and whenever it changes).
  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name ?? '',
      phone: user.phone ?? '',
      department: user.department ?? '',
      address: user.address ?? '',
      specialization: user.specialization ?? '',
      photoUrl: user.photoUrl,
    });
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: async () =>
      api.patch('/auth/profile', {
        name: profile.name,
        phone: profile.phone || undefined,
        department: profile.department || undefined,
        address: profile.address || undefined,
        specialization: profile.specialization || undefined,
        photoUrl: profile.photoUrl ?? '',
      }),
    onSuccess: async () => {
      await refreshUser();
      setProfileSaved(true);
    },
    onError: (e) => setProfileError(apiError(e)),
  });

  const onPickPhoto = async (file?: File) => {
    if (!file) return;
    setProfileError('');
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      setProfile((p) => ({ ...p, photoUrl: dataUrl }));
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Could not process image.');
    } finally {
      setPhotoBusy(false);
    }
  };

  // --- Change password ---
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdDone, setPwdDone] = useState(false);
  const changePwd = useMutation({
    mutationFn: async () => api.post('/auth/change-password', pwd),
    onSuccess: () => {
      setPwdDone(true);
      setPwd({ currentPassword: '', newPassword: '' });
    },
    onError: (e) => setPwdError(apiError(e)),
  });

  const isPhysio = user?.role === 'PHYSIOTHERAPIST';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Account and profile settings" />

      <Card className="mb-5">
        <h3 className="mb-4 font-semibold text-foreground">Profile Details</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setProfileError('');
            setProfileSaved(false);
            saveProfile.mutate();
          }}
          className="space-y-5"
        >
          {/* Display picture */}
          <div className="flex items-center gap-4">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="h-20 w-20 rounded-full object-cover shadow-sm ring-1 ring-border"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-semibold text-white shadow-sm">
                {profile.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                >
                  {photoBusy ? 'Processing…' : 'Change Photo'}
                </button>
                {profile.photoUrl && (
                  <button
                    type="button"
                    className="text-sm text-error hover:underline"
                    onClick={() =>
                      setProfile((p) => ({ ...p, photoUrl: '' }))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPG or PNG. Automatically resized.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                className="input"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Department">
              <input
                className="input"
                value={profile.department}
                onChange={(e) =>
                  setProfile({ ...profile, department: e.target.value })
                }
              />
            </Field>
            {isPhysio && (
              <Field label="Specialization">
                <input
                  className="input"
                  value={profile.specialization}
                  onChange={(e) =>
                    setProfile({ ...profile, specialization: e.target.value })
                  }
                />
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea
                  className="input"
                  rows={2}
                  value={profile.address}
                  onChange={(e) =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          {/* Read-only account facts */}
          <dl className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={user?.role.replace('_', ' ')} />
            {user?.clinic && <Row label="Clinic" value={user.clinic.name} />}
          </dl>

          <ErrorText message={profileError} />
          {profileSaved && (
            <p className="text-sm text-success">Profile updated successfully.</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={saveProfile.isPending || photoBusy}
            >
              {saveProfile.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-foreground">Change Password</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPwdError('');
            setPwdDone(false);
            changePwd.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Current Password" required>
            <input
              type="password"
              className="input"
              value={pwd.currentPassword}
              onChange={(e) =>
                setPwd({ ...pwd, currentPassword: e.target.value })
              }
              required
            />
          </Field>
          <Field label="New Password (min 6 chars)" required>
            <input
              type="password"
              className="input"
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
              minLength={6}
              required
            />
          </Field>
          <ErrorText message={pwdError} />
          {pwdDone && (
            <p className="text-sm text-success">Password updated successfully.</p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={changePwd.isPending}
          >
            {changePwd.isPending ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
