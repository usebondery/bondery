import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Container,
  Stack,
  Text,
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
      px={"0"}
      id="faq"
      bg="var(--mantine-color-body)"
      py={{
        base: "calc(var(--mantine-spacing-lg) * 2)",
        lg: "calc(var(--mantine-spacing-lg) * 3)",
      }}
      fluid
    >
      <Container size="md">
        <Stack gap="xs" mb="xl">
          <Title order={2} ta="center" className="text-5xl!" fw="bold">
            FAQs
          </Title>
        </Stack>

        <Accordion variant="separated" radius="md" className="w-full md:max-w-xl mx-auto">
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
