import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/ejad/confirm-dialog";
import { EnglishOnly, I18nProvider } from "@/components/ejad/i18n-provider";
import { StatusBadge } from "@/components/ejad/status-badge";

function dialog() {
  return (
    <ConfirmDialog
      open
      title="?"
      description="."
      confirmLabel="OK"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
    />
  );
}

describe("I18nProvider", () => {
  it("defaults to English without a provider", () => {
    render(dialog());
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders Arabic text and translated statuses", () => {
    render(
      <I18nProvider locale="ar">
        {dialog()}
        <StatusBadge value="active" />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeInTheDocument();
    expect(screen.getByText("نشط")).toBeInTheDocument();
  });

  it("keeps Administration content English inside an Arabic page", () => {
    render(
      <I18nProvider locale="ar">
        <EnglishOnly>
          <StatusBadge value="active" />
        </EnglishOnly>
      </I18nProvider>,
    );
    expect(screen.getByText("active")).toBeInTheDocument();
  });
});
