/**
 * Instagram GraphQL network interceptor (MAIN world).
 */
import { defineUnlistedScript } from "#imports";
import { installInstagramNetworkInterceptor } from "../features/instagram/intercept/networkInterceptor";

export default defineUnlistedScript(() => {
  installInstagramNetworkInterceptor();
});
