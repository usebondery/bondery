import type { Metadata } from "next";
import { About } from "@/components/landing";

export const metadata: Metadata = {
  title: "About",
  description: "Who we are, why Bondery exists, and where to find us.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About | Bondery",
    description: "Who we are, why Bondery exists, and where to find us.",
    url: "/about",
    type: "website",
  },
  twitter: {
    title: "About | Bondery",
    description: "Who we are, why Bondery exists, and where to find us.",
  },
};

export default function AboutPage() {
  return <About />;
}
