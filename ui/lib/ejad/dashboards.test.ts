import { describe, expect, it, vi } from "vitest";
import {
  copyName,
  createDashboardInput,
  duplicateDashboard,
  formatReading,
  gaugeFraction,
  latestByName,
  layoutAttributes,
  measurementNames,
  mergeSeries,
  moveWidget,
  parseLayout,
  parseWidget,
  RESOURCE_KIND_DASHBOARD,
  renameDashboard,
  replaceWidget,
  saveDashboardLayout,
  seriesParams,
  thresholdColor,
  type Widget,
  widgetTitle,
} from "@/lib/ejad/dashboards";

const CHANNEL = "f31ba3d3-52f5-40dd-8d72-ad8587564217";
const TENANT = "dcb2b6e0-ec6a-4d46-b384-363918e729d4";

const LINE: Widget = {
  id: "w1",
  type: "line",
  title: "",
  size: "large",
  channelId: CHANNEL,
  names: ["temperature", "humidity"],
  range: "1h",
};
const VALUE: Widget = {
  id: "w2",
  type: "value",
  title: "Room",
  size: "small",
  channelId: CHANNEL,
  name: "temperature",
  unit: "",
  thresholds: [{ value: 8, color: "critical" }],
};
const STATUS: Widget = {
  id: "w3",
  type: "device_status",
  title: "",
  size: "small",
};

describe("parseWidget", () => {
  it("keeps valid widgets as they are", () => {
    expect(parseWidget(LINE)).toEqual(LINE);
    expect(parseWidget(VALUE)).toEqual(VALUE);
    expect(parseWidget(STATUS)).toEqual(STATUS);
  });

  it("fills defaults for missing optional fields", () => {
    expect(parseWidget({ id: "a", type: "table", channelId: CHANNEL })).toEqual(
      {
        id: "a",
        type: "table",
        title: "",
        size: "medium",
        channelId: CHANNEL,
        name: "",
        rows: 10,
      },
    );
    expect(
      parseWidget({ id: "g", type: "gauge", channelId: CHANNEL, name: "t" }),
    ).toMatchObject({ min: 0, max: 100, unit: "", size: "small" });
  });

  it("rejects widgets that cannot be shown", () => {
    expect(parseWidget(null)).toBeNull();
    expect(parseWidget({ ...LINE, type: "pie" })).toBeNull();
    expect(parseWidget({ ...LINE, id: "" })).toBeNull();
    expect(parseWidget({ ...LINE, channelId: "cold-room" })).toBeNull();
    expect(parseWidget({ ...LINE, names: [] })).toBeNull();
    expect(parseWidget({ ...VALUE, name: "" })).toBeNull();
    expect(
      parseWidget({
        id: "g",
        type: "gauge",
        channelId: CHANNEL,
        name: "t",
        min: 10,
        max: 10,
      }),
    ).toBeNull();
  });

  it("cleans names, sizes, ranges and thresholds", () => {
    const widget = parseWidget({
      ...LINE,
      size: "huge",
      range: "1y",
      names: [
        "a",
        "a",
        "",
        3,
        ...Array.from({ length: 10 }, (_, i) => `n${i}`),
      ],
    });
    expect(widget).toMatchObject({ size: "large", range: "1h" });
    expect(widget?.type === "line" && widget.names).toEqual([
      "a",
      "n0",
      "n1",
      "n2",
      "n3",
      "n4",
      "n5",
      "n6",
    ]);
    expect(
      parseWidget({
        ...VALUE,
        thresholds: [
          { value: 30, color: "critical" },
          { value: "x", color: "good" },
          { value: 10, color: "pink" },
          { value: 20, color: "warning" },
        ],
      }),
    ).toMatchObject({
      thresholds: [
        { value: 20, color: "warning" },
        { value: 30, color: "critical" },
      ],
    });
  });
});

describe("parseLayout", () => {
  it("skips broken widgets and tolerates missing layouts", () => {
    expect(parseLayout({ layout: [LINE, { type: "x" }, STATUS] })).toEqual([
      LINE,
      STATUS,
    ]);
    expect(parseLayout({ layout: "nope" })).toEqual([]);
    expect(parseLayout(null)).toEqual([]);
  });
});

describe("layout editing", () => {
  const layout = [LINE, VALUE, STATUS];
  it("moves widgets", () => {
    expect(moveWidget(layout, 0, 2).map((w) => w.id)).toEqual([
      "w2",
      "w3",
      "w1",
    ]);
    expect(moveWidget(layout, 2, 0).map((w) => w.id)).toEqual([
      "w3",
      "w1",
      "w2",
    ]);
    expect(moveWidget(layout, 0, 5)).toBe(layout);
  });
  it("replaces or appends widgets", () => {
    expect(replaceWidget(layout, { ...STATUS, size: "large" })[2].size).toBe(
      "large",
    );
    expect(replaceWidget([LINE], VALUE)).toEqual([LINE, VALUE]);
  });
  it("titles widgets", () => {
    expect(widgetTitle(LINE)).toBe("temperature, humidity");
    expect(widgetTitle(VALUE)).toBe("Room");
    expect(widgetTitle(STATUS)).toBe("Device status");
  });
});

describe("values", () => {
  const thresholds = [
    { value: 5, color: "warning" as const },
    { value: 0, color: "good" as const },
    { value: 10, color: "critical" as const },
  ];
  it("picks the highest threshold reached", () => {
    expect(thresholdColor(-1, thresholds)).toBeNull();
    expect(thresholdColor(0, thresholds)).toBe("good");
    expect(thresholdColor(7, thresholds)).toBe("warning");
    expect(thresholdColor(10, thresholds)).toBe("critical");
    expect(thresholdColor(10, [])).toBeNull();
  });
  it("clamps the gauge fraction", () => {
    expect(gaugeFraction(50, 0, 100)).toBe(0.5);
    expect(gaugeFraction(-5, 0, 100)).toBe(0);
    expect(gaugeFraction(500, 0, 100)).toBe(1);
    expect(gaugeFraction(1, 5, 5)).toBe(0);
  });
  it("formats readings", () => {
    expect(formatReading(4.475)).toBe((4.48).toLocaleString());
    expect(formatReading(Number.NaN)).toBe("—");
  });
});

describe("seriesParams", () => {
  const now = Date.UTC(2026, 10, 17, 12);
  it("reads raw messages for short ranges", () => {
    const params = seriesParams("temperature", "1h", now);
    expect(params.get("name")).toBe("temperature");
    expect(params.get("to")).toBe(`${now}000000`);
    expect(params.get("from")).toBe(`${now - 3_600_000}000000`);
    expect(params.get("aggregation")).toBeNull();
    expect(params.get("limit")).toBe("1000");
  });
  it("averages buckets for long ranges", () => {
    const params = seriesParams("t", "7d", now);
    expect(params.get("aggregation")).toBe("avg");
    expect(params.get("interval")).toBe("1h");
  });
});

describe("mergeSeries", () => {
  it("joins series by time, oldest first, averaging duplicates", () => {
    const rows = mergeSeries([
      {
        name: "s0",
        messages: [
          { time: 2_000_000_000_000_000_000, value: 2 },
          { time: 1_000_000_000_000_000_000, value: 1 },
          { time: 1_000_000_000_000_000_000, value: 3 },
          { time: 3_000_000_000_000_000_000, string_value: "x" },
        ],
      },
      {
        name: "s1",
        messages: [{ time: 2_000_000_000_000_000_000, value: 9 }],
      },
    ]);
    expect(rows).toEqual([
      { t: 1_000_000_000_000, s0: 2 },
      { t: 2_000_000_000_000, s0: 2, s1: 9 },
    ]);
  });
});

describe("latest messages", () => {
  const messages = [
    { name: "t", time: 3, value: 3 },
    { name: "h", time: 2, value: 50 },
    { name: "t", time: 1, value: 1 },
  ];
  it("keeps the newest message per name", () => {
    expect(latestByName(messages)).toEqual([
      { name: "t", time: 3, value: 3 },
      { name: "h", time: 2, value: 50 },
    ]);
  });
  it("lists distinct names", () => {
    expect(measurementNames([...messages, { value: 1 }])).toEqual(["h", "t"]);
  });
});

describe("dashboards", () => {
  it("creates an ejad_dashboard resource in the workspace", () => {
    expect(createDashboardInput(TENANT, "  Plant  ", [STATUS])).toEqual({
      kind: RESOURCE_KIND_DASHBOARD,
      name: "Plant",
      tenantId: TENANT,
      attributes: { source: "ejad", layout: [STATUS] },
    });
  });

  it("keeps other attributes when saving a layout", () => {
    expect(layoutAttributes({ note: "x", layout: [] }, [STATUS])).toEqual({
      note: "x",
      source: "ejad",
      layout: [STATUS],
    });
  });

  it("names copies", () => {
    expect(copyName("Plant")).toBe("Plant (copy)");
    expect(copyName("Plant", ["Plant (copy)"])).toBe("Plant (copy 2)");
    expect(copyName("Plant (copy)", ["Plant (copy)"])).toBe("Plant (copy 2)");
  });

  it("rejects empty names before calling Atom", async () => {
    const gql = vi.fn();
    await expect(renameDashboard(gql, "id", "  ")).rejects.toThrow(
      "Name is required.",
    );
    expect(gql).not.toHaveBeenCalled();
  });

  it("duplicates with fresh widget IDs", async () => {
    const gql = vi.fn().mockResolvedValue({ createResource: { id: "new" } });
    await duplicateDashboard(
      gql,
      {
        id: "d1",
        kind: RESOURCE_KIND_DASHBOARD,
        name: "Plant",
        tenantId: TENANT,
        attributes: { source: "ejad", layout: [LINE, STATUS] },
        createdAt: "",
        updatedAt: null,
      },
      "Plant (copy)",
    );
    const input = gql.mock.calls[0][0].variables.input;
    expect(input.name).toBe("Plant (copy)");
    expect(input.tenantId).toBe(TENANT);
    expect(input.attributes.layout).toHaveLength(2);
    expect(input.attributes.layout[0].id).not.toBe("w1");
    expect(input.attributes.layout[0]).toMatchObject({
      type: "line",
      names: LINE.type === "line" ? LINE.names : [],
    });
  });

  it("re-reads the dashboard before saving its layout", async () => {
    const gql = vi
      .fn()
      .mockResolvedValueOnce({
        resource: {
          id: "d1",
          kind: RESOURCE_KIND_DASHBOARD,
          attributes: { source: "ejad", layout: [], owner_note: "keep" },
        },
      })
      .mockResolvedValueOnce({ updateResource: { id: "d1" } });
    await saveDashboardLayout(gql, "d1", [VALUE]);
    expect(gql.mock.calls[1][0].variables).toEqual({
      id: "d1",
      input: {
        attributes: { source: "ejad", layout: [VALUE], owner_note: "keep" },
      },
    });
  });

  it("refuses to save over a resource that is not a dashboard", async () => {
    const gql = vi
      .fn()
      .mockResolvedValueOnce({ resource: { id: "c", kind: "channel" } });
    await expect(saveDashboardLayout(gql, "c", [])).rejects.toThrow();
    expect(gql).toHaveBeenCalledTimes(1);
  });
});
