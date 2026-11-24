import "./marketing.css";
import { Footer, Header } from "@/components/landing";
import { MantineShell } from "@/components/mantine-shell";
import { NotFoundView, notFoundMetadata } from "@/components/not-found-view";

export const metadata = notFoundMetadata;

export default function Page() {
  return (
    <MantineShell>
      <Header />
      <main>
        <NotFoundView />
      </main>
      <Footer />
    </MantineShell>
  );
}
