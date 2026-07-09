export function getModalDismissProps(isBlocking: boolean) {
  return {
    closeOnClickOutside: !isBlocking,
    closeOnEscape: !isBlocking,
    withCloseButton: !isBlocking,
  };
}
