import "@vitejs/plugin-react/preamble";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "@bondery/mantine-next/styles";
import WelcomeApp from "../../features/welcome/WelcomeApp";
import { I18nProvider } from "../../lib/i18n/I18nProvider";
import { MantineWrapper } from "../../lib/ui";

const root = document.querySelector("#welcome-root");

if (root) {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <MantineWrapper>
        <I18nProvider>
          <WelcomeApp />
        </I18nProvider>
      </MantineWrapper>
    </StrictMode>,
  );
}
