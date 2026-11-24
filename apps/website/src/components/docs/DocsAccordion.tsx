"use client";

import { Accordion, AccordionControl, AccordionItem, AccordionPanel } from "@mantine/core";
import { type ReactNode, useId } from "react";

function DocsAccordions({ children }: { children: ReactNode }) {
  return <Accordion multiple={false}>{children}</Accordion>;
}

type DocsAccordionProps = {
  children: ReactNode;
  id?: string;
  title: string;
};

function DocsAccordion({ children, id, title }: DocsAccordionProps) {
  const generatedId = useId();
  const value = id ?? generatedId;

  return (
    <AccordionItem id={value} value={value}>
      <AccordionControl>{title}</AccordionControl>
      <AccordionPanel>{children}</AccordionPanel>
    </AccordionItem>
  );
}

export { DocsAccordion, DocsAccordions };
