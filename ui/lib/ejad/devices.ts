// Ejad devices = Atom entities of kind "device" in the workspace tenant,
// created the way Magistrala does (pkg/atom/mapping.go EntityFromFields +
// cli/devices.go): attributes { source: "magistrala", magistrala_kind:
// "device", tags, metadata }, with empty values left out (mapping.go
// compact). A device's secret is a shared key credential
// (pkg/atom/api.go CreateSharedKey / RevealSharedKey / RevokeCredential).

import { parseCsv, toCsv } from "@/lib/ejad/csv";
import {
  type GraphqlFn,
  MAGISTRALA_SOURCE,
  parseMetadata,
} from "@/lib/ejad/workspaces";

export const MAGISTRALA_KIND_DEVICE = "device";

export type DeviceStatus = "active" | "inactive" | "suspended";

export type Device = {
  id: string;
  name: string;
  externalId: string | null;
  tenantId: string | null;
  kind: string;
  status: DeviceStatus;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
  managedBy: string | null;
  /** Object groups the device belongs to (many-to-many). */
  objectGroupIds?: string[];
};

export type Credential = {
  id: string;
  kind: string;
  identifier: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  managedBy: string | null;
};

export type SharedKey = {
  credentialId: string;
  key: string;
  expiresAt: string | null;
};

export const DEVICE_FIELDS =
  "id name externalId tenantId kind status attributes createdAt updatedAt managedBy objectGroupIds";

export const DEVICES_QUERY = `
  query EjadDevices($tenantId: ID!, $q: String, $status: EntityStatus, $parentGroupId: ID, $limit: Int, $offset: Int) {
    entities(kind: device, tenantId: $tenantId, q: $q, status: $status, parentGroupId: $parentGroupId, order: created_at, dir: desc, limit: $limit, offset: $offset) {
      total
      items { ${DEVICE_FIELDS} }
    }
  }
`;

// Atom's `q` matches name, alias and attributes (so tags), not the external
// ID, so the list also looks up an exact external ID (serial/MAC) match.
export const DEVICE_BY_EXTERNAL_ID_QUERY = `
  query EjadDeviceByExternalId($tenantId: ID!, $externalId: String!, $status: EntityStatus, $parentGroupId: ID) {
    entities(kind: device, tenantId: $tenantId, externalId: $externalId, status: $status, parentGroupId: $parentGroupId, limit: 1) {
      items { ${DEVICE_FIELDS} }
    }
  }
`;

export const DEVICE_QUERY = `
  query EjadDevice($id: ID!) {
    entity(id: $id) { ${DEVICE_FIELDS} }
  }
`;

export const CREATE_DEVICE_MUTATION = `
  mutation EjadCreateDevice($input: CreateEntityInput!) {
    createEntity(input: $input) { ${DEVICE_FIELDS} }
  }
`;

export const SET_DEVICE_STATUS_MUTATION = `
  mutation EjadSetDeviceStatus($id: ID!, $status: EntityStatus!) {
    updateEntity(id: $id, input: { status: $status }) { ${DEVICE_FIELDS} }
  }
`;

export const DELETE_DEVICE_MUTATION = `
  mutation EjadDeleteDevice($id: ID!) { deleteEntity(id: $id) }
`;

export const CREDENTIALS_QUERY = `
  query EjadDeviceCredentials($entityId: ID!) {
    credentials(entityId: $entityId) {
      total
      items { id kind identifier status expiresAt createdAt managedBy }
    }
  }
`;

export const CREATE_SHARED_KEY_MUTATION = `
  mutation EjadCreateSharedKey($entityId: ID!, $input: CreateSharedKeyInput!) {
    createSharedKey(entityId: $entityId, input: $input) { credentialId key expiresAt }
  }
`;

export const REVEAL_SHARED_KEY_MUTATION = `
  mutation EjadRevealSharedKey($entityId: ID!, $credentialId: ID!) {
    revealSharedKey(entityId: $entityId, credentialId: $credentialId) { credentialId key expiresAt }
  }
`;

export const REVOKE_CREDENTIAL_MUTATION = `
  mutation EjadRevokeCredential($entityId: ID!, $credentialId: ID!) {
    revokeCredential(entityId: $entityId, credentialId: $credentialId)
  }
`;

export type DeviceValues = {
  name: string;
  externalId?: string;
  tags: string[];
  metadata: Record<string, unknown>;
};

/** createEntity input, matching Magistrala's EntityFromFields for a device. */
export function createDeviceInput(tenantId: string, values: DeviceValues) {
  const attributes: Record<string, unknown> = {
    source: MAGISTRALA_SOURCE,
    magistrala_kind: MAGISTRALA_KIND_DEVICE,
  };
  const tags = values.tags.map((tag) => tag.trim()).filter(Boolean);
  if (tags.length > 0) attributes.tags = tags;
  if (Object.keys(values.metadata).length > 0)
    attributes.metadata = values.metadata;

  const input: Record<string, unknown> = {
    name: values.name.trim(),
    kind: "device",
    tenantId,
    attributes,
  };
  const externalId = values.externalId?.trim();
  if (externalId) input.externalId = externalId;
  return input;
}

export function deviceTags(device: Pick<Device, "attributes">): string[] {
  const tags = device.attributes?.tags;
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

export function deviceMetadata(
  device: Pick<Device, "attributes">,
): Record<string, unknown> {
  const metadata = device.attributes?.metadata;
  return metadata !== null &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export function isDeviceEnabled(device: Pick<Device, "status">) {
  return device.status === "active";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type CreateDeviceResult = {
  device: Device;
  sharedKey: SharedKey | null;
  keyError: string | null;
};

/**
 * Creates a device (entity) and then its shared key. A blank `secret` lets
 * Atom generate the key. The device is kept even if the key step fails, so
 * the caller can report it and the key can be added from the Credentials tab.
 */
export async function createDevice(
  gql: GraphqlFn,
  tenantId: string,
  values: DeviceValues & { secret?: string },
): Promise<CreateDeviceResult> {
  const { createEntity } = await gql<{ createEntity: Device }>({
    query: CREATE_DEVICE_MUTATION,
    variables: { input: createDeviceInput(tenantId, values) },
  });
  try {
    const sharedKey = await createSharedKey(
      gql,
      createEntity.id,
      values.secret,
    );
    return { device: createEntity, sharedKey, keyError: null };
  } catch (error) {
    return {
      device: createEntity,
      sharedKey: null,
      keyError: errorMessage(error),
    };
  }
}

export async function createSharedKey(
  gql: GraphqlFn,
  entityId: string,
  key?: string,
): Promise<SharedKey> {
  const input: Record<string, unknown> = {};
  if (key?.trim()) input.key = key.trim();
  const { createSharedKey } = await gql<{ createSharedKey: SharedKey }>({
    query: CREATE_SHARED_KEY_MUTATION,
    variables: { entityId, input },
  });
  return createSharedKey;
}

/**
 * Rotates a shared key: create the new key first, then revoke the old one,
 * so the device is never left without a valid key. If the revoke fails the
 * new key is still returned along with the error.
 */
export async function rotateSharedKey(
  gql: GraphqlFn,
  entityId: string,
  oldCredentialId: string,
): Promise<{ sharedKey: SharedKey; revokeError: string | null }> {
  const sharedKey = await createSharedKey(gql, entityId);
  try {
    await gql({
      query: REVOKE_CREDENTIAL_MUTATION,
      variables: { entityId, credentialId: oldCredentialId },
    });
    return { sharedKey, revokeError: null };
  } catch (error) {
    return { sharedKey, revokeError: errorMessage(error) };
  }
}

// --- Bulk CSV ---------------------------------------------------------------

export const BULK_CSV_HEADERS = ["Name", "Secret", "Tags", "Metadata"] as const;
export const BULK_MAX_ROWS = 1000;

export const BULK_CSV_TEMPLATE = toCsv([
  [...BULK_CSV_HEADERS],
  ["temperature-sensor-01", "", "sensor,floor-1", '{"location":"Room 101"}'],
  ["water-meter-02", "my-own-secret-123", "meter", ""],
]);

export type BulkRow = {
  /** 1-based line number in the file, counting the header as line 1. */
  line: number;
  name: string;
  secret: string;
  tags: string[];
  metadata: Record<string, unknown>;
  error: string | null;
};

/** Splits a Tags cell on commas or semicolons, dropping blanks and repeats. */
export function parseTagsCell(cell: string): string[] {
  return [
    ...new Set(
      cell
        .split(/[,;]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Parses a bulk device CSV with headers Name, Secret, Tags, Metadata
 * (case-insensitive, any order; Secret, Tags and Metadata may be omitted).
 * Throws for file-level problems; per-row problems are set on `error`.
 */
export function parseBulkDevicesCsv(text: string): BulkRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("The CSV file is empty.");

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name.toLowerCase());
  const nameCol = column("Name");
  if (nameCol < 0)
    throw new Error(
      `The first row must be a header with a Name column (${BULK_CSV_HEADERS.join(", ")}).`,
    );
  const secretCol = column("Secret");
  const tagsCol = column("Tags");
  const metadataCol = column("Metadata");

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) throw new Error("The CSV file has no devices.");
  if (dataRows.length > BULK_MAX_ROWS)
    throw new Error(`Upload at most ${BULK_MAX_ROWS} devices at a time.`);

  const cell = (row: string[], col: number) =>
    col >= 0 ? (row[col] ?? "").trim() : "";

  return dataRows.map((row, index) => {
    const result: BulkRow = {
      line: index + 2,
      name: cell(row, nameCol),
      secret: cell(row, secretCol),
      tags: parseTagsCell(cell(row, tagsCol)),
      metadata: {},
      error: null,
    };
    if (!result.name) {
      result.error = "Name is required.";
      return result;
    }
    try {
      result.metadata = parseMetadata(cell(row, metadataCol));
    } catch (error) {
      result.error = errorMessage(error);
    }
    return result;
  });
}

export type BulkResult = {
  line: number;
  name: string;
  deviceId: string | null;
  key: string | null;
  error: string | null;
};

export function bulkResultsCsv(results: BulkResult[]): string {
  return toCsv([
    ["Name", "Device ID", "Secret", "Status", "Error"],
    ...results.map((result) => [
      result.name,
      result.deviceId ?? "",
      result.key ?? "",
      result.error
        ? result.deviceId
          ? "created without secret"
          : "failed"
        : "created",
      result.error ?? "",
    ]),
  ]);
}
