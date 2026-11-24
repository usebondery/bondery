import { NotFoundView, notFoundMetadata } from "@/components/not-found-view";

export const metadata = notFoundMetadata;

export default function Page() {
  return <NotFoundView />;
}
