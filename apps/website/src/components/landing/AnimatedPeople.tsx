"use client";

import { ActionIcon, Box, Card, Group, Image, Title } from "@mantine/core";
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
    <Card
      shadow="sm"
      padding="xl"
      radius="lg"
      withBorder
      className="mx-auto w-full md:w-[600px] h-full"
    >
      <div className="relative grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-[200px_1fr] items-center">
        <div className="flex justify-center md:block">
          <div className="relative w-[280px] md:w-[200px] aspect-[3/4] md:h-[267px]">
            <AnimatePresence mode="popLayout">
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
                    width={200}
                    height={267}
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
        <div className="flex flex-col h-[267px] justify-center py-4 pl-4 text-center md:text-left">
          <div className="h-[140px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Title order={3} className="text-xl md:text-2xl font-bold mb-2">
                  {people[active].name}
                </Title>
                <Box>
                  <p className="text-lg text-gray-600 dark:text-gray-300">{people[active].quote}</p>
                </Box>
              </motion.div>
            </AnimatePresence>
          </div>

          <Group gap="md" mt="md" justify={isDesktop ? "flex-start" : "center"}>
            <ActionIcon
              onClick={handlePrev}
              variant="default"
              size="xl"
              radius="xl"
              aria-label="Previous"
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <ActionIcon
              onClick={handleNext}
              variant="default"
              size="xl"
              radius="xl"
              aria-label="Next"
            >
              <IconArrowRight size={18} />
            </ActionIcon>
          </Group>
        </div>
      </div>
    </Card>
  );
}
