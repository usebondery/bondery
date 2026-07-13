import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  Stack,
  Title,
} from "@mantine/core";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqProps = {
  items: readonly FaqItem[];
};

export function Faq({ items }: FaqProps) {
  return (
    <Container
      bg="var(--mantine-color-body)"
      fluid
      id="faq"
      px={"0"}
      py={{
        base: "calc(var(--mantine-spacing-lg) * 2)",
        lg: "calc(var(--mantine-spacing-lg) * 3)",
      }}
    >
      <Container size="md">
        <Stack gap="xs" mb="xl">
          <Title className="text-5xl!" fw="bold" order={2} ta="center">
            FAQs
          </Title>
        </Stack>

        <Accordion className="w-full md:max-w-xl mx-auto" radius="md" variant="separated">
          {items.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionControl>{item.question}</AccordionControl>
              <AccordionPanel>{item.answer}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </Container>
  );
}
