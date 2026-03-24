declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";
  export default function MDXContent(props: MDXProps): JSX.Element;
  export const postMeta: import("@/lib/blog/types").PostMeta;
}
