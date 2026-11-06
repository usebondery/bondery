import { Group, ThemeIcon } from "@mantine/core";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";

type DocsStepProps = {
  children: ReactNode;
  /** Injected by `DocsSteps` so the marker shows the visible step number. */
  index?: number;
};

export function DocsSteps({ children }: { children: ReactNode }) {
  return (
    // Layout lives in `docs.css` under `.docsSteps`. Do not set `margin` or `gap`
    // inline: the prose rhythm in that file owns the vertical spacing, and an
    // inline margin beats it.
    <ol className="docsSteps">
      {Children.map(children, (child, index) => {
        if (isValidElement<DocsStepProps>(child)) {
          return cloneElement(child, { index: index + 1 });
        }
        return child;
      })}
    </ol>
  );
}

export function DocsStep({ children, index }: DocsStepProps) {
  return (
    <li className="docsStep">
      <Group align="flex-start" gap="sm" wrap="nowrap">
        {typeof index === "number" ? (
          <ThemeIcon radius="xl" size="xl" variant="light">
            {index}
          </ThemeIcon>
        ) : null}
        <div className="docsStepBody docsRhythm">{children}</div>
      </Group>
    </li>
  );
}
