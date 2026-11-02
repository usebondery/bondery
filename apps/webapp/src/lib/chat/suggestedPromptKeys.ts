/**
 * Keys of the prompts shown on the empty chat screen.
 *
 * A key is picked at random for each new chat, so the hero does not read the
 * same every time. Keep this list in sync with `SuggestedPrompts` in the
 * `ChatPage` namespace.
 */
export const SUGGESTED_PROMPT_KEYS = [
  "AddAnniversary",
  "BirthdaysThisMonth",
  "CoffeeWithBlake",
  "ContactsInBerlin",
  "ContactsInNewYork",
  "CreateNewContact",
  "InteractionsThisWeek",
  "LastTalkedToSam",
  "LogCallYesterday",
  "NotTalkedInAWhile",
  "OverdueFollowUps",
  "PeopleInFamilyGroup",
  "SameCompanyAsAlex",
  "TaggedCollegeFriends",
  "WhoSpeaksSpanish",
  "WhoWorksInDesign",
] as const;

export const NEW_CHAT_VISIBLE_PROMPT_COUNT = 5;
