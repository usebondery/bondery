"use client";

import { Box, Container, Grid, Paper, TableOfContents, Text, Title } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

interface LegalDocumentLayoutProps {
  children: ReactNode;
  lastUpdated: string;
  title: string;
}

export function LegalDocumentLayout({ title, lastUpdated, children }: LegalDocumentLayoutProps) {
  return (
    <Container py="xl" size="xl">
      <Grid gap="xl">
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
              depthOffset={0}
              getControlProps={({ data }) => ({
                children: data.value,
                component: Link,
                href: `#${data.id}`,
                onClick: (event) => {
                  event.preventDefault();
                  data.getNode().scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", `#${data.id}`);
                },
              })}
              minDepthToOffset={0}
              scrollSpyOptions={{
                offset: 120,
                selector: "h2[id]",
              }}
              size="sm"
            />
          </Box>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }}>
          <Paper p="xl" radius="md" withBorder>
            <Title mb="md" order={1}>
              {title}
            </Title>
            <Text c="dimmed" mb="xl" size="sm">
              Last Updated: {lastUpdated}
            </Text>

            {children}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
