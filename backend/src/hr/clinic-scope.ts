import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../common/decorators';
import { Role } from '../common/enums';

/**
 * Clinic a mutation should write to.
 * - Super admin: must specify the target clinic.
 * - Any clinic-bound role (HR, etc.): always their own clinic.
 */
export function resolveClinicId(actor: AuthUser, requested?: string): string {
  // A clinic-bound user always writes to their own clinic. A super admin who
  // has selected a clinic (via the global selector) writes to that one;
  // otherwise they must pass an explicit clinicId.
  const cid = actor.clinicId ?? requested;
  if (!cid) {
    throw new BadRequestException(
      actor.role === Role.SUPER_ADMIN
        ? 'clinicId is required for super admin'
        : 'No clinic context',
    );
  }
  return cid;
}

/**
 * Clinic filter for list queries.
 * - Clinic-bound role: locked to their own clinic (the `requested` param is ignored).
 * - Super admin: their selected clinic (from the global selector), else the
 *   requested clinic, else `undefined` to span all clinics.
 */
export function listClinicId(
  actor: AuthUser,
  requested?: string,
): string | undefined {
  return actor.clinicId ?? requested ?? undefined;
}

/** Where-fragment scoping to the actor's (effective) clinic; unrestricted only when none is set. */
export function ownClinicWhere(actor: AuthUser): { clinicId?: string } {
  return actor.clinicId ? { clinicId: actor.clinicId } : {};
}
