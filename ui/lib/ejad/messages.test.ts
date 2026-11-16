import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/ejad/csv";
import {
  buildSenml,
  deviceCommands,
  EMPTY_FILTERS,
  filtersToParams,
  messageDate,
  messagesCsv,
  messageValue,
  parseSendMessage,
  readerParams,
  shellQuote,
} from "@/lib/ejad/messages";

const DEVICE = "63250f6a-31e7-46ed-bf2d-1ccebb863429";
const CHANNEL = "f31ba3d3-52f5-40dd-8d72-ad8587564217";

describe("filtersToParams", () => {
  it("returns no parameters for empty filters", () => {
    expect(String(filtersToParams(EMPTY_FILTERS))).toBe("");
  });

  it("maps text filters, value comparator and times in nanoseconds", () => {
    const params = filtersToParams({
      ...EMPTY_FILTERS,
      name: " temperature ",
      publisher: DEVICE,
      protocol: "mqtt",
      comparator: "ge",
      value: "4.5",
      from: "2026-11-16T10:00:00.000Z",
      to: "2026-11-16T11:00:00.000Z",
    });
    expect(params).toBeInstanceOf(URLSearchParams);
    const p = params as URLSearchParams;
    expect(p.get("name")).toBe("temperature");
    expect(p.get("publisher")).toBe(DEVICE);
    expect(p.get("protocol")).toBe("mqtt");
    expect(p.get("v")).toBe("4.5");
    expect(p.get("comparator")).toBe("ge");
    expect(p.get("from")).toBe(
      (
        BigInt(Date.parse("2026-11-16T10:00:00.000Z")) * BigInt(1_000_000)
      ).toString(),
    );
    expect(p.get("to")).toMatch(/^\d{19}$/);
    expect(p.has("aggregation")).toBe(false);
  });

  it("rejects incomplete value filters and a non-UUID publisher", () => {
    expect(filtersToParams({ ...EMPTY_FILTERS, value: "3" })).toMatch(
      /comparator/,
    );
    expect(
      filtersToParams({ ...EMPTY_FILTERS, comparator: "lt", value: "x" }),
    ).toMatch(/number/);
    expect(filtersToParams({ ...EMPTY_FILTERS, publisher: "abc" })).toMatch(
      /device ID/,
    );
  });

  it("requires from and to for aggregation, in order", () => {
    expect(filtersToParams({ ...EMPTY_FILTERS, aggregation: "avg" })).toMatch(
      /start and an end/,
    );
    expect(
      filtersToParams({
        ...EMPTY_FILTERS,
        from: "2026-11-16T11:00:00Z",
        to: "2026-11-16T10:00:00Z",
      }),
    ).toMatch(/before/);
    const ok = filtersToParams({
      ...EMPTY_FILTERS,
      aggregation: "max",
      interval: "15m",
      from: "2026-11-16T10:00:00Z",
      to: "2026-11-16T11:00:00Z",
    }) as URLSearchParams;
    expect(ok.get("aggregation")).toBe("max");
    expect(ok.get("interval")).toBe("15m");
  });
});

describe("readerParams", () => {
  it("forwards only known parameters", () => {
    const out = readerParams(
      new URLSearchParams(
        "channelId=x&format=messages;drop&name=t&limit=10&offset=20",
      ),
    ) as URLSearchParams;
    expect(out.toString()).toBe("name=t&offset=20&limit=10");
  });

  it("validates paging, times and enums", () => {
    expect(readerParams(new URLSearchParams("limit=0"))).toMatch(/limit/);
    expect(readerParams(new URLSearchParams("limit=1001"))).toMatch(/limit/);
    expect(readerParams(new URLSearchParams("offset=-1"))).toMatch(/offset/);
    expect(readerParams(new URLSearchParams("from=1.5"))).toMatch(/from/);
    expect(readerParams(new URLSearchParams("comparator=ne"))).toMatch(
      /comparator/,
    );
    expect(readerParams(new URLSearchParams("publisher=nope"))).toMatch(
      /publisher/,
    );
    expect(readerParams(new URLSearchParams("aggregation=avg"))).toMatch(
      /from and to/,
    );
    expect(
      readerParams(
        new URLSearchParams("aggregation=avg&from=1&to=2&interval=1d"),
      ),
    ).toMatch(/interval/);
  });

  it("drops a stray interval without aggregation", () => {
    expect(
      String(readerParams(new URLSearchParams("interval=1h&name=a"))),
    ).toBe("name=a");
  });
});

describe("messageDate", () => {
  const iso = "2026-11-16T20:50:00.000Z";
  const ms = Date.parse(iso);
  it.each([
    ["nanoseconds", ms * 1e6],
    ["microseconds", ms * 1e3],
    ["milliseconds", ms],
    ["seconds", ms / 1e3],
  ])("reads %s", (_unit, time) => {
    expect(messageDate(time)?.toISOString()).toBe(iso);
  });

  it("returns null for missing times", () => {
    expect(messageDate(undefined)).toBeNull();
    expect(messageDate(0)).toBeNull();
  });
});

describe("messageValue and messagesCsv", () => {
  it("picks whichever value field is set", () => {
    expect(messageValue({ value: 0 })).toBe("0");
    expect(messageValue({ string_value: "on" })).toBe("on");
    expect(messageValue({ bool_value: false })).toBe("false");
    expect(messageValue({ data_value: "AQI=" })).toBe("AQI=");
    expect(messageValue({ sum: 3 })).toBe("3");
    expect(messageValue({})).toBe("");
  });

  it("writes a header and one row per message", () => {
    const csv = messagesCsv([
      {
        time: Date.parse("2026-11-16T20:50:00Z") * 1e6,
        name: "temp,room",
        value: 4.2,
        unit: "Cel",
        publisher: DEVICE,
        protocol: "http",
      },
    ]);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual([
      "Time",
      "Name",
      "Value",
      "Unit",
      "Publisher",
      "Protocol",
      "Subtopic",
    ]);
    expect(rows[1]).toEqual([
      "2026-11-16T20:50:00.000Z",
      "temp,room",
      "4.2",
      "Cel",
      DEVICE,
      "http",
      "",
    ]);
  });
});

describe("buildSenml", () => {
  const now = 1_794_862_200_000;
  it("sends numbers as v, booleans as vb and text as vs", () => {
    expect(buildSenml({ name: "t", value: "21.5", unit: "Cel" }, now)).toEqual([
      { n: "t", u: "Cel", t: now / 1000, v: 21.5 },
    ]);
    expect(buildSenml({ name: "on", value: "true", unit: "" }, now)).toEqual([
      { n: "on", t: now / 1000, vb: true },
    ]);
    expect(buildSenml({ name: "s", value: "open", unit: " " }, now)).toEqual([
      { n: "s", t: now / 1000, vs: "open" },
    ]);
  });
});

describe("parseSendMessage", () => {
  const valid = {
    channelId: CHANNEL,
    deviceId: DEVICE,
    name: "temperature",
    value: "4",
    unit: "Cel",
  };
  it("accepts a valid body", () => {
    expect(parseSendMessage(valid)).toEqual(valid);
  });
  it("rejects bad fields", () => {
    expect(parseSendMessage(null)).toBe("invalid request");
    expect(parseSendMessage({ ...valid, channelId: "x" })).toMatch(/channel/);
    expect(parseSendMessage({ ...valid, deviceId: "" })).toMatch(/device/);
    expect(parseSendMessage({ ...valid, name: " " })).toMatch(/required/);
    expect(parseSendMessage({ ...valid, name: "a b" })).toMatch(/letters/);
    expect(parseSendMessage({ ...valid, value: "" })).toMatch(/Value/);
    expect(parseSendMessage({ ...valid, unit: 3 })).toMatch(/Unit/);
  });
});

describe("deviceCommands", () => {
  const endpoints = {
    httpUrl: "http://localhost/http/",
    mqttHost: "localhost",
    mqttPort: 1883,
  };
  it("builds commands on the workspace and channel routes", () => {
    const c = deviceCommands({
      endpoints,
      workspaceRoute: "ejad-demo",
      channelRoute: "cold-room",
      deviceId: DEVICE,
      key: "atom_s3cr3t",
    });
    expect(c.topic).toBe("m/ejad-demo/c/cold-room");
    expect(c.mqttPub).toBe(
      `mosquitto_pub -h localhost -p 1883 -i ${DEVICE}-pub -u ${DEVICE} -P atom_s3cr3t -t m/ejad-demo/c/cold-room -m '[{"n":"temperature","u":"Cel","v":21.5}]'`,
    );
    expect(c.mqttSub).toContain(`-i ${DEVICE}-sub -u ${DEVICE}`);
    expect(c.mqttSub).toContain("-t m/ejad-demo/c/cold-room -v");
    expect(c.curl).toContain(
      "curl -sS -X POST http://localhost/http/m/ejad-demo/c/cold-room",
    );
    expect(c.curl).toContain(`-u ${DEVICE}:atom_s3cr3t`);
  });

  it("quotes placeholders and shell metacharacters", () => {
    expect(shellQuote("<DEVICE_SECRET>")).toBe("'<DEVICE_SECRET>'");
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
  });
});
