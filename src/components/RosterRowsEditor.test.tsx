import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RosterRowsEditor } from "./RosterRowsEditor";
import type { RosterRow } from "@/lib/roster/types";

function row(rowNumber: number, jerseyNumber: string): RosterRow {
  return {
    rowNumber,
    teamSquad: "U12",
    jerseyNumber,
    playerName: "Player",
    size: "Y8",
    productSku: "STK-JER-NAVY-Y8",
    quantity: "1",
    packGroup: "U12 Box",
  };
}

const catalog = {
  "STK-JER-NAVY-Y8": { name: "Jersey", size: "Y8", active: true, unitPrice: 38 },
};

// Two rows so clearing one cell still leaves the other - the order stays a "product order".
// Inputs render in FIELDS order per row: teamSquad, jerseyNumber, playerName, size, productSku, quantity.
const SIZE = 3;
const SKU = 4;

function setup() {
  render(
    <RosterRowsEditor
      initialRows={[row(1, "7"), row(2, "10")]}
      catalog={catalog}
      onSubmit={vi.fn()}
      submitLabel="Submit"
    />,
  );
  return screen.getAllByRole("textbox") as HTMLInputElement[];
}

describe("RosterRowsEditor live validation", () => {
  it("starts valid with the submit button enabled", () => {
    setup();
    expect(screen.getByText("All rows valid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled();
  });

  it("re-validates when a REQUIRED field (size) is cleared: shows error + disables submit", () => {
    const inputs = setup();
    fireEvent.change(inputs[SIZE], { target: { value: "" } });
    expect(screen.getByText(/Missing size/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("clearing the product SKU in a product order DOES error (required-when-present)", () => {
    const inputs = setup();
    fireEvent.change(inputs[SKU], { target: { value: "" } });
    expect(screen.getByText(/Missing product SKU/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("re-validates an INVALID product SKU live", () => {
    const inputs = setup();
    fireEvent.change(inputs[SKU], { target: { value: "NOPE" } });
    expect(screen.getByText(/Unknown product SKU/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
});
