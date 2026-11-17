// Shape of GET /api/ejad/overview, the Home overview of a workspace.

import type { ReaderMessage } from "@/lib/ejad/messages";

export type OverviewChannel = {
  id: string;
  name: string;
  /** Messages stored in the last hour, or null when the reader failed. */
  lastHour: number | null;
  /** The newest message of each measurement name. */
  latest: ReaderMessage[];
};

export type Overview = {
  devices: number;
  channels: number;
  /** Channels with Store messages on. */
  storedChannels: number;
  /** Sum over the stored channels read; null when none could be read. */
  messagesLastHour: number | null;
  latest: OverviewChannel[];
};
