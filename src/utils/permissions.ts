type AuthLikeUser = {
  id?: string | null;
  role?: string | null;
  app_metadata?: Record<string, unknown>;
} | null | undefined;

type OwnableRecord = {
  userId?: string | null;
  user_id?: string | null;
  ownerId?: string | null;
  owner_id?: string | null;
};

export function isAuthenticatedUser(user: AuthLikeUser) {
  return Boolean(user?.id);
}

export function isAdminUser(user: AuthLikeUser) {
  return user?.role === "admin" || user?.app_metadata?.role === "admin";
}

export function canViewAdmin(user: AuthLikeUser) {
  return isAuthenticatedUser(user) && isAdminUser(user);
}

export function canEditOwnData(record: OwnableRecord, user: AuthLikeUser) {
  return canModifyRecord(record, user);
}

export function canDeleteOwnData(record: OwnableRecord, user: AuthLikeUser) {
  return canModifyRecord(record, user);
}

export function canModifyRecord(record: OwnableRecord | null | undefined, user: AuthLikeUser) {
  const ownerId = record?.userId || record?.user_id || record?.ownerId || record?.owner_id;
  return Boolean(user?.id && ownerId && ownerId === user.id);
}
