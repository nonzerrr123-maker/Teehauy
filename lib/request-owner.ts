import { accountOwnerHash, getSessionUser } from "@/lib/auth";
import { readGuestHash } from "@/lib/guest-identity";

export type RequestOwner = {
  ownerHash: string | null;
  authenticated: boolean;
  userId?: string;
};

export async function resolveRequestOwner(request: Request): Promise<RequestOwner> {
  try {
    const user = await getSessionUser(request);
    if (user) {
      return {
        ownerHash: accountOwnerHash(user.id),
        authenticated: true,
        userId: user.id,
      };
    }
  } catch {
    // Auth tables may not be migrated yet. Guest mode remains available.
  }

  return {
    ownerHash: readGuestHash(request),
    authenticated: false,
  };
}
