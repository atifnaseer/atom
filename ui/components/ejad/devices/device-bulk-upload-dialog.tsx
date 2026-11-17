"use client";

import {
  CircleCheck,
  CircleX,
  Download,
  FileUp,
  TriangleAlert,
  Upload,
} from "lucide-react";
import * as React from "react";
import { CopyButton } from "@/components/ejad/copy-button";
import { postDevice } from "@/components/ejad/devices/post-device";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadTextFile } from "@/lib/ejad/csv";
import {
  BULK_CSV_HEADERS,
  BULK_CSV_TEMPLATE,
  type BulkResult,
  type BulkRow,
  bulkResultsCsv,
  parseBulkDevicesCsv,
} from "@/lib/ejad/devices";

const CONCURRENCY = 4;

type Stage =
  | { kind: "pick"; error: string | null }
  | { kind: "review"; fileName: string; rows: BulkRow[] }
  | { kind: "running"; done: number; total: number }
  | { kind: "results"; results: BulkResult[]; downloaded: boolean };

async function uploadRows(
  rows: BulkRow[],
  onProgress: (done: number) => void,
): Promise<BulkResult[]> {
  const results: BulkResult[] = new Array(rows.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < rows.length) {
      const index = next++;
      const row = rows[index];
      try {
        const created = await postDevice({
          name: row.name,
          secret: row.secret || undefined,
          tags: row.tags,
          metadata: row.metadata,
        });
        results[index] = {
          line: row.line,
          name: row.name,
          deviceId: created.device.id,
          key: created.sharedKey?.key ?? null,
          error: created.keyError
            ? `Secret not created: ${created.keyError}`
            : null,
        };
      } catch (error) {
        results[index] = {
          line: row.line,
          name: row.name,
          deviceId: null,
          key: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      done += 1;
      onProgress(done);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker),
  );
  return results;
}

export function DeviceBulkUploadDialog({
  onFinished,
}: {
  onFinished: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState<Stage>({
    kind: "pick",
    error: null,
  });
  const fileInput = React.useRef<HTMLInputElement>(null);

  const running = stage.kind === "running";
  const unsavedKeys =
    stage.kind === "results" &&
    !stage.downloaded &&
    stage.results.some((result) => result.key);

  function onOpenChange(next: boolean) {
    if (running) return;
    if (
      !next &&
      unsavedKeys &&
      !window.confirm(
        "The generated secrets are shown only once and you have not downloaded them. Close anyway?",
      )
    ) {
      return;
    }
    setOpen(next);
    if (!next) setStage({ kind: "pick", error: null });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const rows = parseBulkDevicesCsv(await file.text());
      setStage({ kind: "review", fileName: file.name, rows });
    } catch (error) {
      setStage({
        kind: "pick",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function start(rows: BulkRow[]) {
    const valid = rows.filter((row) => !row.error);
    const invalid: BulkResult[] = rows
      .filter((row) => row.error)
      .map((row) => ({
        line: row.line,
        name: row.name,
        deviceId: null,
        key: null,
        error: row.error,
      }));
    setStage({ kind: "running", done: 0, total: valid.length });
    const uploaded = await uploadRows(valid, (done) =>
      setStage({ kind: "running", done, total: valid.length }),
    );
    const results = [...uploaded, ...invalid].sort((a, b) => a.line - b.line);
    setStage({ kind: "results", results, downloaded: false });
    onFinished();
  }

  function downloadResults(results: BulkResult[]) {
    downloadTextFile(
      `devices-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`,
      bulkResultsCsv(results),
    );
    setStage({ kind: "results", results, downloaded: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp />
          Bulk upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk upload devices</DialogTitle>
          <DialogDescription>
            Upload a CSV file with the headers{" "}
            <code className="font-mono">{BULK_CSV_HEADERS.join(", ")}</code>.
            Leave Secret blank to generate one. Separate tags with commas or
            semicolons; Metadata is a JSON object.
          </DialogDescription>
        </DialogHeader>

        {stage.kind === "pick" ? (
          <div className="grid grid-cols-1 gap-4">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              data-testid="bulk-csv-input"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="grid place-items-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors hover:bg-muted/40"
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="font-medium">Choose a CSV file</span>
              <span className="text-sm text-muted-foreground">
                Up to 1000 devices per file.
              </span>
            </button>
            {stage.error ? (
              <Alert variant="destructive">
                <CircleX />
                <AlertTitle>Could not read the file</AlertTitle>
                <AlertDescription>{stage.error}</AlertDescription>
              </Alert>
            ) : null}
            <div>
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() =>
                  downloadTextFile("devices-template.csv", BULK_CSV_TEMPLATE)
                }
              >
                <Download />
                Download a template
              </Button>
            </div>
          </div>
        ) : null}

        {stage.kind === "review" ? (
          <ReviewStage
            fileName={stage.fileName}
            rows={stage.rows}
            onBack={() => setStage({ kind: "pick", error: null })}
            onStart={() => start(stage.rows)}
          />
        ) : null}

        {stage.kind === "running" ? (
          <div className="grid gap-3 py-4">
            <p className="text-sm">
              Creating devices… {stage.done} of {stage.total}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${stage.total ? (stage.done / stage.total) * 100 : 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this dialog open until it finishes.
            </p>
          </div>
        ) : null}

        {stage.kind === "results" ? (
          <ResultsStage
            results={stage.results}
            onDownload={() => downloadResults(stage.results)}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReviewStage({
  fileName,
  rows,
  onBack,
  onStart,
}: {
  fileName: string;
  rows: BulkRow[];
  onBack: () => void;
  onStart: () => void;
}) {
  const invalid = rows.filter((row) => row.error);
  const validCount = rows.length - invalid.length;
  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm">
        <span className="font-medium">{fileName}</span>: {rows.length} rows,{" "}
        {validCount} ready to create
        {invalid.length > 0 ? `, ${invalid.length} with errors` : ""}.
      </p>
      <div className="max-h-72 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Line</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Secret</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.line}>
                <TableCell className="text-muted-foreground">
                  {row.line}
                </TableCell>
                <TableCell className="font-medium">{row.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.secret ? "Provided" : "Generate"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.tags.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {row.error ? (
                    <span className="text-destructive">{row.error}</span>
                  ) : (
                    <span className="text-muted-foreground">OK</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {invalid.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {" "}
          Rows with errors are skipped.
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack}>
          Choose another file
        </Button>
        <Button type="button" onClick={onStart} disabled={validCount === 0}>
          Create {validCount} device{validCount === 1 ? "" : "s"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ResultsStage({
  results,
  onDownload,
  onClose,
}: {
  results: BulkResult[];
  onDownload: () => void;
  onClose: () => void;
}) {
  const created = results.filter((result) => result.deviceId).length;
  const failed = results.length - created;
  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm">
        {created} device{created === 1 ? "" : "s"} created
        {failed > 0 ? `, ${failed} failed` : ""}.
      </p>
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>The secrets are shown only once</AlertTitle>
        <AlertDescription>
          Download the result file now and store it safely. It contains every
          device secret in plain text.
        </AlertDescription>
      </Alert>
      <div className="max-h-80 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Line</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Secret</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.line}>
                <TableCell className="text-muted-foreground">
                  {result.line}
                </TableCell>
                <TableCell className="font-medium">
                  {result.name || "—"}
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  {result.error ? (
                    <span className="inline-flex items-start gap-1 text-destructive">
                      <CircleX className="mt-0.5 size-4 shrink-0" />
                      {result.error}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <CircleCheck className="size-4 text-emerald-600" />
                      Created
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {result.key ? (
                    <div className="flex items-center gap-1">
                      <code className="max-w-56 truncate font-mono text-xs">
                        {result.key}
                      </code>
                      <CopyButton
                        value={result.key}
                        size="icon"
                        variant="ghost"
                        label={`Copy secret for ${result.name}`}
                      />
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onDownload}>
          <Download />
          Download results (CSV)
        </Button>
      </DialogFooter>
    </div>
  );
}
