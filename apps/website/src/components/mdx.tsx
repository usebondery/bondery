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

function heading(order: 2 | 3 | 4) {
  return function DocsMdxHeading({ children, id }: { children?: ReactNode; id?: string }) {
    return (
      <DocsHeading id={id} order={order}>
        {children}
      </DocsHeading>
    );
  };
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
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
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
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

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
