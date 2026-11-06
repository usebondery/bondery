import { DocsFile, DocsFiles, DocsFolder } from "@/components/docs/DocsFiles";

/** Monorepo tree for architecture docs. */
export function RepoStructureFiles() {
  return (
    <DocsFiles>
      <DocsFolder defaultOpen name="bondery">
        <DocsFolder defaultOpen name="apps">
          <DocsFile name="webapp/" />
          <DocsFile name="mobile/" />
          <DocsFile name="api/" />
          <DocsFile name="website/" />
          <DocsFile name="chrome-extension/" />
        </DocsFolder>
        <DocsFolder defaultOpen name="packages">
          <DocsFile name="db/" />
          <DocsFile name="schemas/" />
          <DocsFile name="translations/" />
          <DocsFile name="helpers/" />
          <DocsFile name="emails/" />
          <DocsFile name="mantine-next/" />
          <DocsFile name="branding/" />
          <DocsFile name="vcard/" />
        </DocsFolder>
        <DocsFile name="docs/" />
      </DocsFolder>
    </DocsFiles>
  );
}
