import { permanentRedirect } from "next/navigation";
import { webappUrl } from "@/lib/webapp-url";

export function GET() {
  permanentRedirect(webappUrl("/login"));
}
