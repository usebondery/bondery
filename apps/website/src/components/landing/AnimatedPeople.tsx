"use client";

import { ActionIcon, Box, Card, Group, Image, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import NextImage from "next/image";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";

interface PersonContent {
  quote: string;
  name: string;
  src: string;
}

const people: PersonContent[] = [
  {
    src: "/images/persons/person_birthday.jpg",
    name: "Your niece's birthday",
    quote: "Get notification about it",
  },
  {
    src: "/images/persons/person_job.jpg",
    name: "Colleague's new job",
    quote: "Automatically fetched from LinkedIn",
  },
  {
    src: "/images/persons/person_buddy.jpg",
    name: "Schoolmate's address",
    quote: "Put onto a searchable map",
  },
  {
    src: "/images/persons/person_restaurant.jpg",
    name: "Friend's favorite bistro",
    quote: "Sometimes it's the details that matter",
  },
];

export function AnimatedPeople() {
  const [active, setActive] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 48em)");

  const handleNext = () => {
    setActive((prev) => (prev + 1) % people.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + people.length) % people.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    const interval = setInterval(handleNext, 4000);
    return () => clearInterval(interval);
  }, []);

  const getRotation = (index: number, isActive: boolean) => {
    if (isActive) return 0;
    const rotations = [-8, 3, -11, 7, -4, 9, -6];
    return rotations[index % rotations.length];
  };

  return (
    <Card shadow="md" padding="xl" withBorder className="mx-auto w-full max-w-4xl">
      <div className="relative grid grid-cols-1 gap-6 md:gap-10 md:grid-cols-2 md:items-center">
        <div>
          <div className="relative mx-auto w-full max-w-[320px] md:max-w-[340px] min-h-[260px] md:min-h-[320px]">
            <AnimatePresence>
              {people.map((person, index) => (
                <motion.div
                  key={person.src}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    z: -100,
                    rotate: getRotation(index, false),
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    z: isActive(index) ? 0 : -100,
                    rotate: getRotation(index, isActive(index)),
                    zIndex: isActive(index) ? 40 : people.length + 2 - index,
                    y: isActive(index) ? [0, -80, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    z: 100,
                    rotate: getRotation(index, false),
                  }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 origin-bottom"
                >
                  <Image
                    component={NextImage}
                    src={person.src}
                    alt={person.name}
                    width={340}
                    height={320}
                    loading={isActive(index) ? "eager" : "lazy"}
                    fetchPriority={isActive(index) ? "high" : "auto"}
                    draggable={false}
                    className="h-full w-full rounded-3xl object-cover object-center"
                    radius="lg"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col justify-between py-4 md:pl-6 lg:pl-2">
          <motion.div
            key={active}
            initial={{
              y: 20,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: -20,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
          >
            <Title order={2} className="text-2xl font-bold">
              {people[active].name}
            </Title>

            <Box mt="xs">
              <motion.p className="text-lg">
                {people[active].quote.split(" ").map((word, index) => (
                  <motion.span
                    key={index}
                    initial={{
                      filter: "blur(10px)",
                      opacity: 0,
                      y: 5,
                    }}
                    animate={{
                      filter: "blur(0px)",
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                      delay: 0.02 * index,
                    }}
                    className="inline-block"
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
              </motion.p>
            </Box>
          </motion.div>
          <Group
            gap="md"
            pt="xl"
            justify={isDesktop ? "flex-start" : "center"}
            align="center"
            className="w-full"
          >
            <ActionIcon
              onClick={handlePrev}
              variant="default"
              size="xl"
              radius="xl"
              aria-label="Previous"
            >
              <IconArrowLeft style={{ width: "60%", height: "60%" }} />
            </ActionIcon>
            <ActionIcon
              onClick={handleNext}
              variant="default"
              size="xl"
              radius="xl"
              aria-label="Next"
            >
              <IconArrowRight style={{ width: "60%", height: "60%" }} />
            </ActionIcon>
          </Group>
        </div>
      </div>
    </Card>
  );
}
