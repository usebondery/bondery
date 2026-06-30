import type { Metadata } from "next";
import { GroupsLoader } from "./GroupsLoader";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return <GroupsLoader />;
}
