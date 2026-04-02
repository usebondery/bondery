import type { Metadata } from "next";
import { getKeepInTouchData } from "./getKeepInTouchData";
import { KeepInTouchClient } from "./KeepInTouchClient";
import { computeNextDueDate } from "./keepInTouchConfig";

export const metadata: Metadata = { title: "Keep in touch" };

function defaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default async function KeepInTouchPage({
  searchParams,
}: {
  searchParams: Promise<{ endDate?: string }>;
}) {
  const { endDate: endDateParam } = await searchParams;
  const endDate = endDateParam ?? defaultEndDate();

  const { contacts } = await getKeepInTouchData();

  // Filter contacts whose next due date falls within the window.
  // Overdue contacts (due in the past) and contacts with no lastInteraction (never met) always pass.
  const filtered = endDate
    ? contacts.filter((c) => {
        const nextDue = computeNextDueDate(c.lastInteraction, c.keepFrequencyDays);
        if (!nextDue) return true; // never met — always show
        if (nextDue <= new Date()) return true; // overdue — always show
        return nextDue <= new Date(endDate + "T23:59:59");
      })
    : contacts;

  return <KeepInTouchClient key={endDate} initialContacts={filtered} endDate={endDate} />;
}
