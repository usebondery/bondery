import type { Metadata } from "next";
import { HomeLoader } from "./HomeLoader";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return <HomeLoader />;
}
