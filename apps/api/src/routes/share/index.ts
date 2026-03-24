import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { CONTACT_SELECT } from "../../lib/schemas.js";
import { attachContactExtras } from "../../lib/contact-enrichment.js";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { ShareContactEmail } from "@bondery/emails";
import type { ShareableField } from "@bondery/types";

const ShareContactBody = Type.Object({
  personId: Type.String({ minLength: 1 }),
  recipientEmails: Type.Array(Type.String({ format: "email" }), { minItems: 1, maxItems: 10 }),
  message: Type.Optional(Type.String({ maxLength: 2000 })),
  sendCopy: Type.Boolean(),
  selectedFields: Type.Array(
    Type.Union([
      Type.Literal("name"),
      Type.Literal("avatar"),
      Type.Literal("headline"),
      Type.Literal("phones"),
      Type.Literal("emails"),
      Type.Literal("location"),
      Type.Literal("linkedin"),
      Type.Literal("instagram"),
      Type.Literal("facebook"),
      Type.Literal("website"),
      Type.Literal("whatsapp"),
      Type.Literal("signal"),
      Type.Literal("addresses"),
      Type.Literal("notes"),
      Type.Literal("importantDates"),
    ]),
    { minItems: 1 },
  ),
});

export async function shareRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Share"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post(
    "/",
    { schema: { body: ShareContactBody } },
    async (
      request: FastifyRequest<{
        Body: {
          personId: string;
          recipientEmails: string[];
          message?: string;
          sendCopy: boolean;
          selectedFields: ShareableField[];
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { user, client } = getAuth(request);
      const { personId, recipientEmails, message, sendCopy, selectedFields } = request.body;

      // Fetch sender's display name from user_settings
      const { data: userSettings } = await client
        .from("user_settings")
        .select("name, middlename, surname, avatar_url")
        .eq("user_id", user.id)
        .single();
      const senderName =
        [userSettings?.name, userSettings?.middlename, userSettings?.surname]
          .filter(Boolean)
          .join(" ") || user.email;

      // Fetch the contact (RLS ensures user can only access their own)
      const { data: contactRow, error: contactError } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contactRow) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Enrich with channels, social media, and addresses
      const enriched = await attachContactExtras(client, user.id, [contactRow], {
        addresses: true,
      })
        .then(([result]) => result)
        .catch((enrichError: unknown) => {
          request.log.error({ err: enrichError }, "Failed to enrich contact data for sharing");
          return null;
        });

      if (!enriched) {
        return reply.status(500).send({ error: "Failed to prepare contact data" });
      }

      // Fetch important dates
      const { data: importantDatesRaw, error: datesError } = await client
        .from("people_important_dates")
        .select("type, date")
        .eq("person_id", personId)
        .eq("user_id", user.id);

      if (datesError) {
        request.log.warn(
          { err: datesError },
          "Failed to fetch important dates for sharing — continuing without them",
        );
      }

      const importantDates = (importantDatesRaw ?? []).map((d) => ({
        label: d.type,
        date: d.date,
        type: d.type,
      }));

      // Build the contact name
      const firstName = enriched.firstName || "";
      const lastName = enriched.lastName || "";
      const contactName = [firstName, lastName].filter(Boolean).join(" ") || "Unnamed contact";

      // Build email props based on selected fields
      const has = (field: ShareableField) => field === "headline" || selectedFields.includes(field);

      const phones = has("phones") && Array.isArray(enriched.phones) ? enriched.phones : undefined;
      const emails = has("emails") && Array.isArray(enriched.emails) ? enriched.emails : undefined;

      const emailProps = {
        senderName,
        senderEmail: user.email,
        recipientEmail: recipientEmails[0],
        senderAvatarUrl: userSettings?.avatar_url ?? undefined,
        message: message || undefined,
        contactName,
        contactAvatarUrl: enriched.avatar ?? undefined,
        headline: has("headline") ? (enriched.headline ?? undefined) : undefined,
        phones: phones?.map((p) => ({
          value: p.value,
          prefix: p.prefix || undefined,
          type: p.type || undefined,
        })),
        emails: emails?.map((e) => ({
          value: e.value,
          type: e.type || undefined,
        })),
        location: has("location") ? (enriched.location ?? undefined) : undefined,
        linkedin: has("linkedin") ? (enriched.linkedin ?? undefined) : undefined,
        instagram: has("instagram") ? (enriched.instagram ?? undefined) : undefined,
        facebook: has("facebook") ? (enriched.facebook ?? undefined) : undefined,
        website: has("website") ? (enriched.website ?? undefined) : undefined,
        whatsapp: has("whatsapp") ? (enriched.whatsapp ?? undefined) : undefined,
        signal: has("signal") ? (enriched.signal ?? undefined) : undefined,
        addresses: has("addresses")
          ? enriched.addresses
              ?.filter((a) => a.addressFormatted)
              .map((a) => ({ formatted: a.addressFormatted ?? undefined }))
          : undefined,
        notes: has("notes") ? (enriched.notes ?? undefined) : undefined,
        importantDates:
          has("importantDates") && importantDates.length > 0 ? importantDates : undefined,
      };

      // Validate SMTP configuration is present
      if (!fastify.config.PRIVATE_EMAIL_HOST || !fastify.config.PRIVATE_EMAIL_USER) {
        request.log.error(
          "Share email aborted: SMTP configuration is missing (PRIVATE_EMAIL_HOST or PRIVATE_EMAIL_USER not set)",
        );
        return reply.status(500).send({ error: "Email service is not configured" });
      }

      // Render and send email
      const transporter = nodemailer.createTransport({
        host: fastify.config.PRIVATE_EMAIL_HOST,
        port: Number(fastify.config.PRIVATE_EMAIL_PORT),
        secure: false,
        auth: {
          user: fastify.config.PRIVATE_EMAIL_USER,
          pass: fastify.config.PRIVATE_EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      let emailHtml: string;
      try {
        emailHtml = await render(ShareContactEmail(emailProps));
      } catch (renderError) {
        request.log.error({ err: renderError }, "Failed to render share contact email template");
        return reply.status(500).send({ error: "Failed to render email" });
      }

      try {
        const mailOptions: nodemailer.SendMailOptions = {
          from: `Bondery <${fastify.config.PRIVATE_EMAIL_ADDRESS}>`,
          to: recipientEmails.join(", "),
          replyTo: user.email,
          subject: `${senderName} shared a contact with you • ${contactName}`,
          html: emailHtml,
        };

        if (sendCopy) {
          mailOptions.cc = user.email;
        }

        await transporter.sendMail(mailOptions);
      } catch (smtpError) {
        request.log.error(
          { err: smtpError, host: fastify.config.PRIVATE_EMAIL_HOST, to: recipientEmails },
          "Failed to send share contact email via SMTP",
        );
        return reply.status(500).send({ error: "Failed to send email" });
      }

      return { success: true };
    },
  );
}
