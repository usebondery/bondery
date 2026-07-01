import "@vitejs/plugin-react/preamble";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "@bondery/mantine-next/styles";
import { MantineWrapper } from "../../shared/MantineWrapper";
import PopupApp from "../../popup/PopupApp";

const root = document.getElementById("popup-root");

if (root) {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <MantineWrapper>
        <PopupApp />
      </MantineWrapper>
    </StrictMode>,
  );
}
