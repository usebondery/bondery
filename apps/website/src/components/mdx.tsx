import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { OpenAPIPage } from "@/components/api-page";
import { ChangelogIndex } from "@/components/changelog-index";
import { ApiErrorsIndex } from "@/components/docs/api-errors-index";
import { BonderyRepo } from "@/components/docs/bondery-repo";
import { RepoStructureFiles } from "@/components/docs/repo-structure-files";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    ApiErrorsIndex,
    BonderyRepo,
    ChangelogIndex,
    File,
    Files,
    Folder,
    GithubInfo,
    OpenAPIPage,
    RepoStructureFiles,
    Step,
    Steps,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
