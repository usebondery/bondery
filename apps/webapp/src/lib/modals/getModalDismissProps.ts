export function getModalDismissProps(isBlocking: boolean) {
  return {
    closeOnEscape: !isBlocking,
    closeOnClickOutside: !isBlocking,
    withCloseButton: !isBlocking,
  };
}
