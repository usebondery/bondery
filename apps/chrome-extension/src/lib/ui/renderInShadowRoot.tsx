/**
 * Shared helper for rendering React components inside a WXT Shadow Root UI.
 *
 * Uses `createShadowRootUi` to create an isolated Shadow DOM boundary so that
 * Mantine/extension CSS does not leak into the host website and vice-versa.
 *
 * @param ctx - The WXT ContentScriptContext from the content script's `main` function.
 * @param options.name - Kebab-case custom element name (e.g. "bondery-facebook").
 * @param options.position - Shadow root position mode (default: "inline").
 * @param options.anchor - CSS selector, element, or function returning the anchor element.
 * @param options.append - How to attach relative to the anchor (default: "last").
 * @param options.render - Function receiving the shadow container element and returning a React element to render.
 * @returns The ShadowRootContentScriptUi instance (call `.mount()` to insert into DOM).
 */

import type React from "react";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import type { ContentScriptAppendMode } from "wxt/utils/content-script-ui/types";
import { type ContentScriptContext, createShadowRootUi } from "#imports";
import { MantineWrapper } from "./MantineWrapper";

// CSS imports — WXT's `cssInjectionMode: "ui"` will bundle these and
// automatically inject them into the Shadow Root instead of the host page.
import "@mantine/core/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "@bondery/mantine-next/styles";

interface RenderInShadowRootOptions {
  anchor?: string | Element | null | (() => string | Element | null | undefined);
  append?: ContentScriptAppendMode;
  name: string;
  position?: "inline" | "overlay" | "modal";
  render: (container: HTMLElement) => React.ReactNode;
}

export async function renderInShadowRoot(
  ctx: ContentScriptContext,
  options: RenderInShadowRootOptions,
) {
  const ui = await createShadowRootUi(ctx, {
    anchor: options.anchor,
    append: options.append ?? "last",
    name: options.name,
    onMount(uiContainer, _shadow, shadowHost) {
      // WXT transforms all :root selectors to :host in the bundled CSS, so
      // Mantine's color-scheme variables use :host([data-mantine-color-scheme]).
      // getRootElement must point to the shadow HOST element so that
      // setColorSchemeAttribute sets data-mantine-color-scheme on it.
      // cssVariablesSelector=":host" ensures the dynamic MantineCssVariables
      // style tag also uses :host selectors, consistent with the static CSS.
      const root = ReactDOM.createRoot(uiContainer);
      root.render(
        <StrictMode>
          <MantineWrapper cssVariablesSelector=":host" getRootElement={() => shadowHost}>
            {options.render(uiContainer)}
          </MantineWrapper>
        </StrictMode>,
      );
      return root;
    },
    onRemove(root) {
      root?.unmount();
    },
    position: options.position ?? "inline",
  });

  ui.mount();
  return ui;
}
