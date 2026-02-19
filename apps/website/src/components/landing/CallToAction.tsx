import { ButtonLink } from "@bondery/mantine-next";
import { Card, Container, Stack, Title } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import { WEBAPP_URL } from "@/lib/config";

export function CallToAction() {
  return (
    <Container
      bg="var(--mantine-color-body)"
      py={{
        base: "calc(var(--mantine-spacing-lg) * 4)",
        xs: "calc(var(--mantine-spacing-lg) * 5)",
        lg: "calc(var(--mantine-spacing-lg) * 6)",
      }}
      fluid
    >
      <Card
        mih={400}
        p="xl"
        bg="var(--mantine-primary-color-filled)"
        className="flex justify-center items-center max-w-6xl"
        mx={"auto"}
      >
        <Stack align="center" justify="center" h="100%" flex={1} p="xl" className="gap-y-12!">
          <Title
            order={2}
            ta="center"
            fw={"bold"}
            className="text-3xl! inline"
            c={"white"}
            maw="80%"
          >
            Ready to organize your network?{" "}
            <Container hiddenFrom="md" component={"span"}>
              <br />
              <br />
            </Container>
            Start building meaningful connections today.
          </Title>
          <ButtonLink
            href={`${WEBAPP_URL}/login`}
            size="lg"
            rightSection={<IconArrowUpRight />}
            variant="white"
          >
            Start for free
          </ButtonLink>
        </Stack>
      </Card>
    </Container>
  );
}
