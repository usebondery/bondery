"use client";

import { Box, Container, Grid, Paper, TableOfContents, Text, Title } from "@mantine/core";
import Link from "next/link";
import { type ReactNode } from "react";

interface LegalDocumentLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalDocumentLayout({ title, lastUpdated, children }: LegalDocumentLayoutProps) {
  return (
    <Container size="xl" py="xl">
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 3 }} visibleFrom="md">
          <Box
            mx="auto"
            style={{
              position: "sticky",
              top: 100,
              width: "fit-content",
            }}
          >
            <TableOfContents
              size="sm"
              minDepthToOffset={0}
              depthOffset={0}
              scrollSpyOptions={{
                selector: "h2[id]",
                offset: 120,
              }}
              getControlProps={({ data }) => ({
                component: Link,
                href: `#${data.id}`,
                onClick: (event) => {
                  event.preventDefault();
                  data.getNode().scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", `#${data.id}`);
                },
                children: data.value,
              })}
            />
          </Box>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }}>
          <Paper p="xl" radius="md" withBorder>
            <Title order={1} mb="md">
              {title}
            </Title>
            <Text c="dimmed" size="sm" mb="xl">
              Last Updated: {lastUpdated}
            </Text>

            {children}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
