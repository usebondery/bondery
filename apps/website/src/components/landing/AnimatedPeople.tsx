"use client";

import { ActionIcon, Box, Card, Group, Image, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import NextImage from "next/image";
import { useEffect, useState } from "react";

interface PersonContent {
  name: string;
  quote: string;
  src: string;
}

const people: PersonContent[] = [
  {
    name: "Your niece's birthday",
    quote: "Get notification about it",
    src: "/images/persons/person_birthday.jpg",
  },
  {
    name: "Colleague's new job",
    quote: "Automatically fetched from LinkedIn",
    src: "/images/persons/person_job.jpg",
  },
  {
    name: "Schoolmate's address",
    quote: "Put onto a searchable map",
    src: "/images/persons/person_buddy.jpg",
  },
  {
    name: "Friend's favorite bistro",
    quote: "Sometimes it's the details that matter",
    src: "/images/persons/person_restaurant.jpg",
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
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % people.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getRotation = (index: number, isActive: boolean) => {
    if (isActive) {
      return 0;
    }
    const rotations = [-8, 3, -11, 7, -4, 9, -6];
    return rotations[index % rotations.length];
  };

  return (
    <Card
      className="mx-auto w-full md:w-150 h-full"
      padding="xl"
      radius="lg"
      shadow="sm"
      withBorder
    >
      <div className="relative grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-[200px_1fr] items-center">
        <div className="flex justify-center md:block">
          <div className="relative w-70 md:w-50 aspect-3/4 md:h-66">
            <AnimatePresence mode="popLayout">
              {people.map((person, index) => (
                <motion.div
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    rotate: getRotation(index, isActive(index)),
                    scale: isActive(index) ? 1 : 0.95,
                    y: isActive(index) ? [0, -80, 0] : 0,
                    z: isActive(index) ? 0 : -100,
                    zIndex: isActive(index) ? 40 : people.length + 2 - index,
                  }}
                  className="absolute inset-0 origin-bottom"
                  exit={{
                    opacity: 0,
                    rotate: getRotation(index, false),
                    scale: 0.9,
                    z: 100,
                  }}
                  initial={{
                    opacity: 0,
                    rotate: getRotation(index, false),
                    scale: 0.9,
                    z: -100,
                  }}
                  key={person.src}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                  }}
                >
                  <Image
                    alt={person.name}
                    className="h-full w-full rounded-3xl object-cover object-center"
                    component={NextImage}
                    draggable={false}
                    fetchPriority={isActive(index) ? "high" : "auto"}
                    height={267}
                    loading={isActive(index) ? "eager" : "lazy"}
                    radius="lg"
                    src={person.src}
                    width={200}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col h-66 justify-center py-4 pl-4 text-center md:text-left">
          <div className="h-35 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                initial={{ opacity: 0, x: 20 }}
                key={active}
                transition={{ duration: 0.3 }}
              >
                <Title className="text-xl md:text-2xl font-bold mb-2" order={3}>
                  {people[active].name}
                </Title>
                <Box>
                  <p className="text-lg text-gray-600 dark:text-gray-300">{people[active].quote}</p>
                </Box>
              </motion.div>
            </AnimatePresence>
          </div>

          <Group gap="md" justify={isDesktop ? "flex-start" : "center"} mt="md">
            <ActionIcon
              aria-label="Previous"
              onClick={handlePrev}
              radius="xl"
              size="xl"
              variant="default"
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <ActionIcon
              aria-label="Next"
              onClick={handleNext}
              radius="xl"
              size="xl"
              variant="default"
            >
              <IconArrowRight size={18} />
            </ActionIcon>
          </Group>
        </div>
      </div>
    </Card>
  );
}
