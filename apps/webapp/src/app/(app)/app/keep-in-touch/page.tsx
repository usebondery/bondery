import type { Metadata } from "next";
import { KeepInTouchLoader } from "./KeepInTouchLoader";

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

  return <KeepInTouchLoader key={endDate} endDate={endDate} />;
}
