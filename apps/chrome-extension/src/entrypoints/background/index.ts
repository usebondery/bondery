/**
 * Background Service Worker Entry Point (WXT)
 */
import { defineBackground } from "#imports";
import { initBackground } from "../../features/background/init";

export default defineBackground(() => {
  initBackground();
});
