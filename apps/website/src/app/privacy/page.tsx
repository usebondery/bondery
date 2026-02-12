import type { Metadata } from "next";
import { Privacy } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Bondery",
  description: "Privacy Policy for Bondery - Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return <Privacy />;
}
