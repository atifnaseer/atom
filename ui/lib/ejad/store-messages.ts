// The "Store messages" switch of a channel. Storing is a flag on the channel
// resource, attributes.store_messages = true. The ejad-store service (cmd/
// ejad-store in the Magistrala fork) reads the flagged channels from Atom and
// forwards their messages to the writers stream, which saves them to the
// message store the reader serves. Turning the switch off removes the flag.
//
// The rules engine is not used: the edition in use allows one rule in the
// whole installation, so a rule per channel cannot scale.

import { CHANNEL_FIELDS, type Channel } from "@/lib/ejad/channels";

/** Channel attribute the ejad-store service filters on. */
export const STORE_ATTRIBUTE = "store_messages";

export type StoreState = {
  /** True when the channel's messages are stored. */
  enabled: boolean;
};

export const UPDATE_CHANNEL_ATTRIBUTES_MUTATION = `
  mutation EjadSetChannelStore($id: ID!, $input: UpdateResourceInput!) {
    updateResource(id: $id, input: $input) { ${CHANNEL_FIELDS} }
  }
`;

export function storeState(channel: Pick<Channel, "attributes">): StoreState {
  return { enabled: channel.attributes?.[STORE_ATTRIBUTE] === true };
}

/**
 * The channel's attributes with storing turned on or off. Atom replaces
 * attributes wholesale on update, so every other attribute is carried over.
 * Off removes the key rather than writing false, leaving the channel as it
 * was before it was ever stored.
 */
export function storeAttributes(
  attributes: Channel["attributes"],
  enabled: boolean,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(attributes ?? {}) };
  if (enabled) next[STORE_ATTRIBUTE] = true;
  else delete next[STORE_ATTRIBUTE];
  return next;
}
