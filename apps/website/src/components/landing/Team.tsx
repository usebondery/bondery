import { Avatar, Card, Container, Group, Text, Title, Stack, Flex } from "@mantine/core";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { ActionIconLink } from "@bondery/mantine-next";

interface TeamMember {
  name: string;
  image: string;
  role: string;
  description: string;
  linkedin: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Marek",
    image: "/images/team/marek.jpg",
    role: "Engineering",
    description: "Built the foundation.",
    linkedin: "https://linkedin.com/in/mareksvitek",
  },
  {
    name: "Martin",
    image: "/images/team/martin.jpg",
    role: "Engineering",
    description: "Driving development.",
    linkedin: "https://www.linkedin.com/in/martin-aschermann-6235791a9",
  },
];

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

          <ActionIconLink
            size="lg"
            variant="subtle"
            color="gray"
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            ariaLabel={`${member.name} on LinkedIn`}
          >
            <IconBrandLinkedin />
          </ActionIconLink>
        </Stack>
      </Group>
    </Card>
  );
}

export function Team() {
  return (
    <Container size="lg" py="xl" mb={"xl"}>
      <Title order={2} ta="center" className="text-3xl! mb-12!">
        Our team
      </Title>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"}>
        {TEAM_MEMBERS.map((member) => (
          <TeamCard key={member.name} member={member} />
        ))}
      </Flex>
    </Container>
  );
}
