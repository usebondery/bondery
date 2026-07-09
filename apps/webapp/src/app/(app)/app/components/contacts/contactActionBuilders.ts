import type {
  BulkSelectionAction,
  MenuAction,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";

interface BuildContactMenuActionsOptions {
  addToGroupsAction?: MenuAction;
  appendActions?: MenuAction[];
  deleteAction?: MenuAction;
  mergeAction?: MenuAction;
  prependActions?: MenuAction[];
}

interface BuildContactBulkActionsOptions {
  addToGroupsAction?: BulkSelectionAction;
  appendActions?: BulkSelectionAction[];
  deleteAction?: BulkSelectionAction;
  mergeAction?: BulkSelectionAction;
  prependActions?: BulkSelectionAction[];
}

/**
 * Builds menu actions for contacts with a standard merge/add/delete core and optional extensions.
 */
export function buildContactMenuActions({
  mergeAction,
  addToGroupsAction,
  deleteAction,
  prependActions = [],
  appendActions = [],
}: BuildContactMenuActionsOptions): MenuAction[] {
  const standardActions: MenuAction[] = [];

  if (mergeAction) {
    standardActions.push(mergeAction);
  }

  if (addToGroupsAction) {
    standardActions.push(addToGroupsAction);
  }

  if (deleteAction) {
    standardActions.push(deleteAction);
  }

  return [...prependActions, ...standardActions, ...appendActions];
}

/**
 * Builds bulk actions for contacts with a standard merge/add/delete core and optional extensions.
 */
export function buildContactBulkActions({
  mergeAction,
  addToGroupsAction,
  deleteAction,
  prependActions = [],
  appendActions = [],
}: BuildContactBulkActionsOptions): BulkSelectionAction[] {
  const standardActions: BulkSelectionAction[] = [];

  if (mergeAction) {
    standardActions.push(mergeAction);
  }

  if (addToGroupsAction) {
    standardActions.push(addToGroupsAction);
  }

  if (deleteAction) {
    standardActions.push(deleteAction);
  }

  return [...prependActions, ...standardActions, ...appendActions];
}
