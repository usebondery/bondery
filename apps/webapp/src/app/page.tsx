import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to the app from root
  redirect("/app");
}
