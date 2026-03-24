import { Avatar, Card, Container, Group, Text, Title, Stack, Flex } from "@mantine/core";
import { IconBrandLinkedin, IconBrandX } from "@tabler/icons-react";
import { ActionIconLink } from "@bondery/mantine-next";
import { TEAM_MEMBERS, type TeamMember } from "@/data/team";

interface TeamProps {
  title?: string;
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Card padding="lg" withBorder className="card-scale-effect">
      <Group gap="lg" align="center">
        <Avatar size={160} src={member.image} alt={member.name} />
        <Stack gap="sm" align="left">
          <Stack gap={0}>
            <Text size="xl" fw={"bold"} c={"var(--mantine-default-text-color)"}>
              {member.name}
            </Text>
            <Text size="md" c="dimmed" fw={500}>
              {member.role}
            </Text>
          </Stack>
          <Text size="sm" c="dimmed" miw={200}>
            {member.description}
          </Text>

          <Group gap="xs">
            <ActionIconLink
              size="lg"
              variant="subtle"
              color="gray"
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              ariaLabel={`${member.name} on LinkedIn`}
              icon={<IconBrandLinkedin />}
            />
            {member.x && (
              <ActionIconLink
                size="lg"
                variant="subtle"
                color="gray"
                href={member.x}
                target="_blank"
                rel="noopener noreferrer"
                ariaLabel={`${member.name} on X`}
                icon={<IconBrandX />}
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
    <Container id="team" size="lg" py="xl" mb={"xl"}>
      <Title order={2} ta="center" className="text-3xl! mb-12!">
        {title ?? "Who will answer your questions?"}
      </Title>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"}>
        {TEAM_MEMBERS.map((member) => (
          <TeamCard key={member.name} member={member} />
        ))}
      </Flex>
    </Container>
  );
}
