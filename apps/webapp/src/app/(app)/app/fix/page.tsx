import type { Metadata } from "next";
import { FixContactsLoader } from "./FixContactsLoader";

export const metadata: Metadata = { title: "Fix & merge" };

export default function FixPage() {
  return <FixContactsLoader />;
}
