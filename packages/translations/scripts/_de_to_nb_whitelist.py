#!/usr/bin/env python3
"""One-off: translate de locale strings to nb with whitelist replacements."""
from __future__ import annotations

import json
import os
import re
from typing import Any

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "locales")
SKIP = {"features/sections/Languages.json", "common.json", "glossary.json", "validation.json"}
MANUAL = {
    "features/pages/HomePage.json",
    "features/pages/NotFoundPage.json",
    "features/sections/PersonTabs.json",
    "features/pages/ContactPage.json",
    "platform/web/PeopleSearchSpotlight.json",
    "features/sections/ContactPreferenceSection.json",
    "platform/mobile/Navigation.json",
}

PROTECT = re.compile(
    r"(\{[^{}]+\}|<[^>]+>|{{[^{}]+}}|"
    r"\b(?:Bondery|GitHub|LinkedIn|Instagram|WhatsApp|Signal|Stripe|MCP|OAuth|JWT|SQLite|vCard|vcard|passkey|Passkey|passkeys|webhook|Webhook|API|Chrome|Claude|Cursor|mcp\.json|PRM)\b)",
    re.I,
)

PHRASES = [
    ("In Kontakt bleiben", "Hold kontakten"),
    ("Bereinigen & zusammenführen", "Rett og slå sammen"),
    ("KI-Assistenten", "AI-assistenter"),
    ("KI-Assistent", "AI-assistent"),
    ("Bitte versuche es erneut.", "Prøv igjen."),
    ("Bitte versuch es erneut.", "Prøv igjen."),
    ("Versuche es erneut.", "Prøv igjen."),
    ("Versuch es gleich nochmal.", "Prøv igjen om et øyeblikk."),
    ("Versuch es in ein paar Minuten erneut.", "Prøv igjen om noen minutter."),
    ("Änderungen speichern", "Lagre endringer"),
    ("Speichern", "Lagre"),
    ("Abbrechen", "Avbryt"),
    ("Löschen", "Slett"),
    ("Hinzufügen", "Legg til"),
    ("Entfernen", "Fjern"),
    ("Bearbeiten", "Rediger"),
    ("Kopieren", "Kopier"),
    ("Kopiert!", "Kopiert!"),
    ("Auswählen", "Velg"),
    ("Suchen", "Søk"),
    ("Zurück", "Tilbake"),
    ("Schließen", "Lukk"),
    ("Einstellungen", "Innstillinger"),
    ("Fortfahren", "Fortsett"),
    ("Erstellen", "Opprett"),
    ("Importieren", "Importer"),
    ("Exportieren", "Eksporter"),
    ("Herunterladen", "Last ned"),
    ("Hochladen", "Last opp"),
    ("Überspringen", "Hopp over"),
    ("Ausblenden", "Skjul"),
    ("Anmelden", "Logg inn"),
    ("Abmelden", "Logg ut"),
    ("E-Mail-Adresse", "e-postadresse"),
    ("E-Mail", "e-post"),
    ("Chrome-Erweiterung", "Chrome-utvidelse"),
    ("Erweiterung", "utvidelse"),
    ("Bevorzugte Sprache", "Foretrukket språk"),
    ("Zeitzone", "Tidssone"),
    ("Zweiter Vorname", "mellomnavn"),
    ("Vorname", "fornavn"),
    ("Nachname", "etternavn"),
    ("Keine Ergebnisse", "Ingen resultater"),
    ("Nur Lesen", "Kun lesing"),
    ("Voller Zugriff", "Full tilgang"),
    ("API-Schlüssel", "API-nøkkel"),
    ("Wird gelöscht...", "Sletter …"),
    ("Wird erstellt...", "Oppretter …"),
    ("Wird hinzugefügt...", "Legger til …"),
    ("Wird entfernt...", "Fjerner …"),
]

WORDS = [
    (r"\bKontakten\b", "kontakten"),
    (r"\bKontakte\b", "kontakter"),
    (r"\bKontakt\b", "kontakt"),
    (r"\bGruppen\b", "grupper"),
    (r"\bGruppe\b", "gruppe"),
    (r"\bInteraktionen\b", "interaksjoner"),
    (r"\bInteraktion\b", "interaksjon"),
    (r"\bPersonen\b", "personer"),
    (r"\bPerson\b", "person"),
    (r"\bNetzwerk\b", "nettverk"),
    (r"\bTags\b", "etiketter"),
    (r"\bTag\b", "etikett"),
    (r"\bErinnerungen\b", "påminnelser"),
    (r"\bErinnerung\b", "påminnelse"),
    (r"\bBenachrichtigungen\b", "varsler"),
    (r"\bBenachrichtigung\b", "varsel"),
    (r"\bHeute\b", "I dag"),
    (r"\bMorgen\b", "I morgen"),
    (r"\bMonats\b", "månedens"),
    (r"\bMonat\b", "måned"),
    (r"\bJahres\b", "årets"),
    (r"\bJahr\b", "år"),
    (r"\bTagen\b", "dager"),
    (r"\bTage\b", "dager"),
    (r"\bWoche\b", "uke"),
    (r"\bMinuten\b", "minutter"),
    (r"\bnicht\b", "ikke"),
    (r"\bund\b", "og"),
    (r"\boder\b", "eller"),
    (r"\bmit\b", "med"),
    (r"\bohne\b", "uten"),
    (r"\bfür\b", "for"),
    (r"\bvon\b", "fra"),
    (r"\bauf\b", "på"),
    (r"\baus\b", "fra"),
    (r"\bbei\b", "hos"),
    (r"\bzum\b", "til"),
    (r"\bzur\b", "til"),
    (r"\bnoch\b", "ennå"),
    (r"\bbereits\b", "allerede"),
    (r"\bdeine\b", "din"),
    (r"\bdein\b", "din"),
    (r"\bdeinen\b", "dine"),
    (r"\bDeine\b", "Dine"),
    (r"\bDein\b", "Din"),
    (r"\bdich\b", "deg"),
    (r"\bwird\b", "blir"),
    (r"\bwerden\b", "blir"),
    (r"\bwurde\b", "ble"),
    (r"\bwurden\b", "ble"),
    (r"\bwirst\b", "får"),
    (r"\bist\b", "er"),
    (r"\bhat\b", "har"),
    (r"\bhast\b", "har"),
    (r"\bhatte\b", "hadde"),
    (r"\bkannst\b", "kan"),
    (r"\bkann\b", "kan"),
    (r"\bkönnen\b", "kan"),
    (r"\bmusst\b", "må"),
    (r"\bmuss\b", "må"),
    (r"\bBitte\b", ""),
    (r"\bbitte\b", ""),
    (r"\bVersuch\b", "Prøv"),
    (r"\bversuch\b", "prøv"),
    (r"\bWähle\b", "Velg"),
    (r"\bwähle\b", "velg"),
    (r"\bBeschreibung\b", "Beskrivelse"),
    (r"\bTitel\b", "Tittel"),
    (r"\bDatei\b", "fil"),
    (r"\bFehlgeschlagen\b", "mislyktes"),
    (r"\berfolgreich\b", "fullført"),
    (r"\bgesendet\b", "sendt"),
    (r"\bgelöscht\b", "slettet"),
    (r"\bhinzugefügt\b", "lagt til"),
    (r"\baktualisiert\b", "oppdatert"),
    (r"\bUngültig\b", "Ugyldig"),
    (r"\bungültig\b", "ugyldig"),
    (r"\berforderlich\b", "påkrevd"),
    (r"\bStartseite\b", "Hjem"),
    (r"\bVerknüpfungen\b", "koblinger"),
    (r"\bVerknüpfung\b", "kobling"),
    (r"\bVerknüpft\b", "Koblet"),
    (r"\bverknüpft\b", "koblet"),
]


def transform_string(text: str) -> str:
    if not text.strip():
        return text

    def inner(t: str) -> str:
        for src, dst in sorted(PHRASES, key=lambda x: -len(x[0])):
            t = t.replace(src, dst)
        for pat, repl in WORDS:
            t = re.sub(pat, repl, t)
        t = re.sub(r"  +", " ", t)
        return t.strip()

    out: list[str] = []
    last = 0
    for m in PROTECT.finditer(text):
        if m.start() > last:
            out.append(inner(text[last : m.start()]))
        out.append(m.group(0))
        last = m.end()
    if last < len(text):
        out.append(inner(text[last:]))
    return "".join(out)


def transform_node(de: Any, en: Any) -> Any:
    if isinstance(de, dict):
        return {k: transform_node(de[k], en[k]) for k in de}
    if isinstance(de, str):
        src = de if de != en else en
        return transform_string(src)
    return de


def main() -> None:
    n = 0
    for dirpath, _, files in os.walk(os.path.join(ROOT, "de")):
        for fname in sorted(files):
            if not fname.endswith(".json"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fname), os.path.join(ROOT, "de"))
            if rel in SKIP or rel in MANUAL:
                continue
            with open(os.path.join(ROOT, "de", rel), encoding="utf-8") as f:
                de = json.load(f)
            with open(os.path.join(ROOT, "en", rel), encoding="utf-8") as f:
                en = json.load(f)
            nb = transform_node(de, en)
            nb_path = os.path.join(ROOT, "nb", rel)
            os.makedirs(os.path.dirname(nb_path), exist_ok=True)
            with open(nb_path, "w", encoding="utf-8") as f:
                json.dump(nb, f, ensure_ascii=False, indent=2)
                f.write("\n")
            n += 1
    print("updated", n)


if __name__ == "__main__":
    main()
