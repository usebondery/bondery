/**
 * Merge API error catalog into common.json errors.api for en/cs/de.
 *
 * Usage: node packages/translations/scripts/generate-api-error-translations.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ERROR_CODE_ENTRIES } from "@bondery/schemas/errors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(__dirname, "..", "src", "locales");
const locales = ["en", "cs", "de"];

function userFacingMessage(code, template, locale) {
  const messages = {
    cs: {
      auth_required: "Pro pokračování se prosím přihlaste.",
      conflict: "Tato akce je v konfliktu s existujícími daty.",
      contact_not_found: "Tento kontakt se nepodařilo najít.",
      internal_server_error: "Něco se pokazilo na naší straně. Zkuste to prosím znovu.",
      not_found: "Požadovanou položku se nepodařilo najít.",
      rate_limit_exceeded: "To děláte příliš často. Chvíli počkejte a zkuste to znovu.",
      service_unavailable: "Služba je dočasně nedostupná. Zkuste to prosím později.",
      sync_conflict: "Tento kontakt byl upraven na jiném zařízení. Obnovte data a zkuste to znovu.",
      validation_error: "Některé zadané údaje nejsou platné.",
    },
    de: {
      auth_required: "Bitte melden Sie sich an, um fortzufahren.",
      conflict: "Diese Aktion steht im Konflikt mit vorhandenen Daten.",
      contact_not_found: "Dieser Kontakt wurde nicht gefunden.",
      internal_server_error: "Bei uns ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.",
      not_found: "Der angeforderte Eintrag wurde nicht gefunden.",
      rate_limit_exceeded:
        "Das haben Sie zu oft versucht. Bitte warten Sie kurz und versuchen Sie es erneut.",
      service_unavailable:
        "Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.",
      sync_conflict:
        "Dieser Kontakt wurde auf einem anderen Gerät aktualisiert. Aktualisieren Sie die Daten und versuchen Sie es erneut.",
      validation_error: "Einige der eingegebenen Angaben sind ungültig.",
    },
    en: {
      auth_required: "Please sign in to continue.",
      conflict: "That action conflicts with existing data.",
      contact_not_found: "This contact could not be found.",
      internal_server_error: "Something went wrong on our end. Please try again.",
      not_found: "We couldn't find what you're looking for.",
      rate_limit_exceeded: "You're doing that too often. Please wait a moment and try again.",
      service_unavailable: "The service is temporarily unavailable. Please try again shortly.",
      sync_conflict: "This contact was updated on another device. Refresh and try again.",
      validation_error: "Some of the information you entered isn't valid.",
    },
  };

  if (messages[locale]?.[code]) {
    return messages[locale][code];
  }

  const fallback = template.replace(/\b\w/g, (c) => c.toLowerCase());
  return `${fallback.charAt(0).toUpperCase()}${fallback.slice(1)}.`;
}

for (const locale of locales) {
  const path = join(localesRoot, locale, "common.json");
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.errors ??= {};
  json.errors.api ??= {};

  for (const [code, definition] of Object.entries(API_ERROR_CODE_ENTRIES)) {
    json.errors.api[code] = userFacingMessage(code, definition.messageTemplate, locale);
  }

  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`updated ${path} (${Object.keys(json.errors.api).length} api error keys)`);
}
