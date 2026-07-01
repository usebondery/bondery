import { STATUS_PAGE_URL } from "@bondery/helpers";
import { redirect } from "next/navigation";

export function GET() {
  redirect(STATUS_PAGE_URL);
}
