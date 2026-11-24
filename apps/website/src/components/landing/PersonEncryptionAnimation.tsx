"use client";

import visuals from "@bondery/translations/locales/en/platform/website/WebsiteLandingVisuals.json" with {
  type: "json",
};
import { Avatar } from "@mantine/core";
import { IconCalendarEvent, IconMessageCircle, IconPhone } from "@tabler/icons-react";
import { motion } from "motion/react";

/** Sample contact for the encryption demo. Name and phone are fixture data. */
const DEMO_PERSON = {
  birthday: visuals.Encryption.Birthday,
  name: "Sarah Jenkins",
  note: visuals.Encryption.Note,
  phone: "+1 (555) 123-4567",
} as const;

export function PersonEncryptionAnimation() {
  return (
    <div
      className="border-line bg-surface-demo relative mx-auto w-full max-w-125 overflow-hidden rounded-2xl border p-8 shadow-xl"
      style={{
        alignItems: "center",
        aspectRatio: "4/3",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div className="from-canvas to-canvas-strong absolute inset-0 -z-10 bg-linear-to-br" />

      <div className="border-subtle-line bg-surface relative z-10 w-full max-w-xs rounded-xl border p-3 shadow-sm sm:p-4">
        <div className="border-subtle-line flex flex-col items-center gap-3 border-b pb-4">
          <motion.div animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
            <Avatar
              bd="4px solid light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))"
              radius={120}
              size={104}
              src="/images/persons/person_birthday.jpg"
              style={{ boxShadow: "var(--mantine-shadow-md)" }}
            />
          </motion.div>

          <div className="text-heading text-center text-xl font-bold sm:text-2xl">
            {DEMO_PERSON.name}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-3">
            <div className="bg-phone-soft text-phone rounded-lg p-2">
              <IconPhone size={18} />
            </div>
            <div className="text-demo-text text-sm font-medium">{DEMO_PERSON.phone}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-date-soft text-date rounded-lg p-2">
              <IconCalendarEvent size={18} />
            </div>
            <div className="text-demo-text text-sm font-medium">{DEMO_PERSON.birthday}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-note-soft text-note rounded-lg p-2">
              <IconMessageCircle size={18} />
            </div>
            <div className="text-demo-text text-sm font-medium">{DEMO_PERSON.note}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
