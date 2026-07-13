import "@vitejs/plugin-react/preamble";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "@bondery/mantine-next/styles";
import PopupApp from "../../features/popup/PopupApp";
import { I18nProvider } from "../../lib/i18n/I18nProvider";
import { MantineWrapper } from "../../lib/ui";

const root = document.getElementById("popup-root");

if (root) {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <I18nProvider>
        <MantineWrapper>
          <PopupApp />
        </MantineWrapper>
      </I18nProvider>
    </StrictMode>,
  );
}
