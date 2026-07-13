export interface ExampleName {
  firstName: string;
  lastName: string;
  middleName: string;
}

const EXAMPLE_NAMES: ExampleName[] = [
  { firstName: "Edgar", lastName: "Poe", middleName: "Allan" },
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

export function getRandomExampleName(): ExampleName {
  return EXAMPLE_NAMES[Math.floor(Math.random() * EXAMPLE_NAMES.length)];
}
