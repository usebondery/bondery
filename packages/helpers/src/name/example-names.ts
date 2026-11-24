interface ExampleName {
  firstName: string;
  lastName: string;
  middleName: string;
}

const FALLBACK_EXAMPLE_NAME: ExampleName = {
  firstName: "Edgar",
  lastName: "Poe",
  middleName: "Allan",
};

const EXAMPLE_NAMES: ExampleName[] = [
  FALLBACK_EXAMPLE_NAME,
  { firstName: "Harry", lastName: "Potter", middleName: "James" },
  { firstName: "John", lastName: "Tolkien", middleName: "Ronald Reuel" },
  { firstName: "Marie", lastName: "Curie", middleName: "Salomea" },
  { firstName: "Neil", lastName: "Armstrong", middleName: "Alden" },
  { firstName: "Vincent", lastName: "Gogh", middleName: "Willem van" },
  { firstName: "Ludwig", lastName: "Beethoven", middleName: "van" },
  { firstName: "Ludwig", lastName: "Mises", middleName: "von" },
  {
    firstName: "Friedrich",
    lastName: "Hayek",
    middleName: "August von",
  },
];

export type { ExampleName };

export function getRandomExampleName(): ExampleName {
  return EXAMPLE_NAMES[Math.floor(Math.random() * EXAMPLE_NAMES.length)] ?? FALLBACK_EXAMPLE_NAME;
}
