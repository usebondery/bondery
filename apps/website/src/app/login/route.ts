import { permanentRedirectWebapp } from "@/lib/navigation/redirect/webapp";

export function GET() {
  permanentRedirectWebapp("/login");
}
