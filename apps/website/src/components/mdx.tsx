import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { OpenAPIPage } from "@/components/api-page";
import { ChangelogIndex } from "@/components/changelog-index";
import { ApiErrorsIndex } from "@/components/docs/api-errors-index";
import { BonderyRepo } from "@/components/docs/bondery-repo";
import { DocsAccordion, DocsAccordions } from "@/components/docs/DocsAccordion";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsCard, DocsCards } from "@/components/docs/DocsCards";
import { DocsFile, DocsFiles, DocsFolder } from "@/components/docs/DocsFiles";
import { DocsHeading } from "@/components/docs/DocsHeading";
import { DocsMdxPre } from "@/components/docs/DocsMdxPre";
import { DocsPlatformCode } from "@/components/docs/DocsPlatformCode";
import { DocsStep, DocsSteps } from "@/components/docs/DocsSteps";
import { RepoStructureFiles } from "@/components/docs/repo-structure-files";
import { MdxTable } from "@/components/mdx-table";

type MdxHeadingProps = { children?: ReactNode; id?: string };

function DocsMdxH2({ children, id }: MdxHeadingProps) {
  return (
    <DocsHeading id={id} order={2}>
      {children}
    </DocsHeading>
  );
}

function DocsMdxH3({ children, id }: MdxHeadingProps) {
  return (
    <DocsHeading id={id} order={3}>
      {children}
    </DocsHeading>
  );
}

function DocsMdxH4({ children, id }: MdxHeadingProps) {
  return (
    <DocsHeading id={id} order={4}>
      {children}
    </DocsHeading>
  );
}

function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    Accordion: DocsAccordion,
    Accordions: DocsAccordions,
    ApiErrorsIndex,
    BonderyRepo,
    Callout: DocsCallout,
    Card: DocsCard,
    Cards: DocsCards,
    ChangelogIndex,
    File: DocsFile,
    Files: DocsFiles,
    Folder: DocsFolder,
    h2: DocsMdxH2,
    h3: DocsMdxH3,
    h4: DocsMdxH4,
    OpenAPIPage,
    PlatformCode: DocsPlatformCode,
    pre: DocsMdxPre,
    RepoStructureFiles,
    Step: DocsStep,
    Steps: DocsSteps,
    table: MdxTable,
    ...components,
  };
}

const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

export { getMDXComponents, useMDXComponents };
