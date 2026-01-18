const EXAMPLE_NAMES = [
  { firstName: "Edgar", middleName: "Allan", lastName: "Poe" },
  { firstName: "Harry", middleName: "James", lastName: "Potter" },
  { firstName: "John", middleName: "Ronald Reuel", lastName: "Tolkien" },
  { firstName: "Marie", middleName: "Salomea", lastName: "Curie" },
  { firstName: "Neil", middleName: "Alden", lastName: "Armstrong" },
  { firstName: "Vincent", middleName: "Willem van", lastName: "Gogh" },
  { firstName: "Ludwig", middleName: "van", lastName: "Beethoven" },
  { firstName: "Ludwig", middleName: "von", lastName: "Mises" },
  {
    firstName: "Friedrich",
    middleName: "August von",
    lastName: "Hayek",
  },
];

export function getRandomExampleName() {
  return EXAMPLE_NAMES[Math.floor(Math.random() * EXAMPLE_NAMES.length)];
}
