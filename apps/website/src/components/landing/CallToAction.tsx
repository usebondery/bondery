import { ButtonLink } from "@bondery/mantine-next";
import { Card, Container, Stack, Title } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import { WEBAPP_URL } from "@/lib/config";

export function CallToAction() {
  return (
    <Container
      bg="var(--mantine-color-body)"
      fluid
      py={{
        base: "calc(var(--mantine-spacing-lg) * 4)",
        lg: "calc(var(--mantine-spacing-lg) * 6)",
        xs: "calc(var(--mantine-spacing-lg) * 5)",
      }}
    >
      <Card
        bg="var(--mantine-primary-color-filled)"
        className="flex justify-center items-center max-w-6xl "
        mih={400}
        mx={"auto"}
        p="xl"
      >
        <Stack
          align="center"
          className="gap-y-12! max-w-4/5"
          flex={1}
          h="100%"
          justify="center"
          p="xl"
        >
          <Title c={"white"} className="text-3xl! inline" fw={"bold"} order={2} ta="center">
            Ready to organize your network?{" "}
          </Title>
          <ButtonLink
            href={`${WEBAPP_URL}/login`}
            radius={"xl"}
            rightSection={<IconArrowUpRight />}
            size="lg"
            variant="white"
          >
            Start building your network
          </ButtonLink>
        </Stack>
      </Card>
    </Container>
  );
}
