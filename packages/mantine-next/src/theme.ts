import { createTheme } from "@mantine/core";

export const bonderyTheme = createTheme({
  colors: {
    "branding-primary": [
      "#faedff",
      "#edd9f7",
      "#d8b1ea",
      "#c186dd",
      "#ae62d2",
      "#a34bcb",
      "#9d3fc9",
      "#8931b2",
      "#7a2aa0",
      "#6b218d",
    ],
  },
  components: {
    ActionIcon: {
      classNames: { root: "button-scale-effect" },
    },
    Avatar: {
      defaultProps: {
        radius: "md",
      },
    },
    Button: {
      classNames: { root: "button-scale-effect" },
    },
    Card: {
      defaultProps: {
        radius: "var(--mantine-radius-default)",
        shadodow: "sm",
      },
    },
    Checkbox: {
      defaultProps: {
        className: {
          card: "checkbox-scale-effect",
        },
        radius: "xl",
        size: "md",
      },
    },
    CloseButton: {
      classNames: { root: "button-scale-effect" },
    },
    Input: {
      defaultProps: {
        variant: "filled",
      },
    },
    List: {
      defaultProps: {
        mt: "0",
        spacing: "0",
        type: "unordered",
        withPadding: false,
      },
    },
    Menu: {
      defaultProps: {
        shadow: "md",
      },
    },
    NavLink: {
      classNames: { root: "button-scale-effect" },
      styles: {
        root: {
          borderRadius: "var(--mantine-radius-xs)",
        },
      },
    },

    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
        withBorder: true,
      },
    },
    PillsInput: {
      defaultProps: {
        variant: "filled",
      },
    },
    Progress: {
      defaultProps: {
        radius: "xl",
        transitionDuration: 500,
      },
    },
    ScrollArea: {
      defaultProps: {
        offsetScrollbars: true,
        scrollbarSize: 12,
      },
    },
    ScrollAreaAutosize: {
      defaultProps: {
        offsetScrollbars: true,
        scrollbarSize: 12,
      },
    },
    Select: {
      defaultProps: {
        variant: "filled",
      },
    },
    Textarea: {
      defaultProps: {
        variant: "filled",
      },
    },
    TextInput: {
      defaultProps: {
        variant: "filled",
      },
    },
    Title: {
      defaultProps: {
        c: "var(--mantine-color-default-color)",
      },
    },
  },
  cursorType: "pointer",
  defaultRadius: "md",
  fontFamily: "Lexend, sans-serif",
  primaryColor: "branding-primary",
});

export const primaryColor = "#a34bcb";
