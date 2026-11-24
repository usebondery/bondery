import { AnchorLink, hrefAssert } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  Stack,
  Title,
} from "@mantine/core";
import { LANDING_SECTION_IDS } from "./sectionIds";

type FaqItem = {
  question: string;
  answer: string;
  docsHref?: string;
  docsLinkLabel?: string;
};

type FaqProps = {
  items: readonly FaqItem[];
};

function Faq({ items }: FaqProps) {
  return (
    <Container
      bg="var(--mantine-color-body)"
      fluid
      id={LANDING_SECTION_IDS.faq}
      px="0"
      py={{
        base: "calc(var(--mantine-spacing-lg) * 2)",
        lg: "calc(var(--mantine-spacing-lg) * 3)",
      }}
    >
      <Container size="md">
        <Stack gap="xs" mb="xl">
          <Title fw="bold" fz="3rem" order={2} ta="center">
            {landing.Faq.Title}
          </Title>
        </Stack>

        <div className="mx-auto w-full md:max-w-xl">
          <Accordion radius="md" variant="separated">
            {items.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionControl>{item.question}</AccordionControl>
                <AccordionPanel>
                  {item.docsHref && item.docsLinkLabel
                    ? renderAnswerWithDocsLink(item.answer, item.docsHref, item.docsLinkLabel)
                    : item.answer}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </Container>
  );
}

function renderAnswerWithDocsLink(answer: string, href: string, label: string) {
  const marker = label;
  const index = answer.indexOf(marker);

  if (index === -1) {
    return answer;
  }

  return (
    <>
      {answer.slice(0, index)}
      <AnchorLink href={hrefAssert(href)}>{label}</AnchorLink>
      {answer.slice(index + marker.length)}
    </>
  );
}

export { Faq };
