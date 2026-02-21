"use client";

import { Avatar, Card } from "@mantine/core";
import { IconPhone, IconCalendarEvent, IconMessageCircle } from "@tabler/icons-react";
import { motion } from "motion/react";

export function PersonEncryptionAnimation() {
  return (
    <Card
      p="xl"
      radius="lg"
      className="mx-auto w-full max-w-125 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl overflow-hidden relative"
      style={{
        aspectRatio: "4/3",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="absolute inset-0 bg-linear-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-950 -z-10" />

      <div className="relative z-10 w-full max-w-[320px] rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 sm:p-4">
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100 dark:border-zinc-700">
          <motion.div animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
            <Avatar
              src="/images/persons/person_birthday.jpg"
              size={104}
              radius={120}
              className="border-4 border-white shadow-md dark:border-zinc-800"
            />
          </motion.div>

          <div className="text-center text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Sarah Jenkins
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
              <IconPhone size={18} />
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              +1 (555) 123-4567
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-50 dark:bg-pink-900/30 rounded-lg text-pink-500">
              <IconCalendarEvent size={18} />
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">March 3</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg text-violet-500">
              <IconMessageCircle size={18} />
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Loves hiking and sci-fi books
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
