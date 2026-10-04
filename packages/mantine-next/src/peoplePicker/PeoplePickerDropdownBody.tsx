"use client";

import { Combobox, Group, Loader } from "@mantine/core";
import type { PeoplePickerOptionsProps } from "#peoplePicker/PeoplePickerOptions.js";
import { PeoplePickerOptions } from "#peoplePicker/PeoplePickerOptions.js";
import {
  PERSON_SEARCH_OPTION_HIT_CLASS,
  type PeoplePickerOptionPerson,
} from "#peoplePicker/PersonSearchOptionRow.js";

type PeoplePickerDropdownBodyProps<T extends PeoplePickerOptionPerson> = Omit<
  PeoplePickerOptionsProps<T>,
  "emptyState" | "renderOption" | "searchingState"
> & {
  noResultsLabel?: string;
  searchingLabel: string;
};

export function PeoplePickerDropdownBody<T extends PeoplePickerOptionPerson>({
  noResultsLabel,
  searchingLabel,
  ...options
}: PeoplePickerDropdownBodyProps<T>) {
  return (
    <Combobox.Options w="100%">
      <PeoplePickerOptions
        {...options}
        emptyState={<Combobox.Empty>{noResultsLabel}</Combobox.Empty>}
        renderOption={(item, row) => (
          <Combobox.Option
            className={PERSON_SEARCH_OPTION_HIT_CLASS}
            key={item.id}
            value={item.id}
            w="100%"
          >
            {row}
          </Combobox.Option>
        )}
        searchingState={
          <Combobox.Empty>
            <Group gap="xs" justify="center">
              <Loader size="xs" />
              <span>{searchingLabel}</span>
            </Group>
          </Combobox.Empty>
        }
      />
    </Combobox.Options>
  );
}
