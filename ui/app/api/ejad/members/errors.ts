import { atomErrorResponse, fail } from "@/lib/ejad/access-server";
import { LastAdminError, MemberNotFoundError } from "@/lib/ejad/members";

/** JSON response for a members operation failure. */
export function membersFailure(error: unknown) {
  if (error instanceof LastAdminError) return fail(error.message, 409);
  if (error instanceof MemberNotFoundError) return fail(error.message, 404);
  return atomErrorResponse(error);
}
