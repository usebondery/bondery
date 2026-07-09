import { ActionIconLink } from "@bondery/mantine-next";
import { Avatar, Card, Container, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { IconBrandLinkedin, IconBrandX } from "@tabler/icons-react";
import { TEAM_MEMBERS, type TeamMember } from "@/data/team";

interface TeamProps {
  title?: string;
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Card className="card-scale-effect" padding="lg" withBorder>
      <Group align="center" gap="lg">
        <Avatar alt={member.name} size={160} src={member.image} />
        <Stack align="left" gap="sm">
          <Stack gap={0}>
            <Text c={"var(--mantine-default-text-color)"} fw={"bold"} size="xl">
              {member.name}
            </Text>
            <Text c="dimmed" fw={500} size="md">
              {member.role}
            </Text>
          </Stack>
          <Text c="dimmed" miw={200} size="sm">
            {member.description}
          </Text>

          <Group gap="xs">
            <ActionIconLink
              ariaLabel={`${member.name} on LinkedIn`}
              color="gray"
              href={member.linkedin}
              icon={<IconBrandLinkedin />}
              rel="noopener noreferrer"
              size="lg"
              target="_blank"
              variant="subtle"
            />
            {member.x && (
              <ActionIconLink
                ariaLabel={`${member.name} on X`}
                color="gray"
                href={member.x}
                icon={<IconBrandX />}
                rel="noopener noreferrer"
                size="lg"
                target="_blank"
                variant="subtle"
              />
            )}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

export function Team({ title }: TeamProps) {
  return (
    <Container id="team" mb={"xl"} py="xl" size="lg">
      <Title className="text-3xl! mb-12!" order={2} ta="center">
        {title ?? "Who will answer your questions?"}
      </Title>
      <Flex gap={"xl"} justify={"center"} wrap={"wrap"}>
        {TEAM_MEMBERS.map((member) => (
          <TeamCard key={member.name} member={member} />
        ))}
      </Flex>
    </Container>
  );
}
