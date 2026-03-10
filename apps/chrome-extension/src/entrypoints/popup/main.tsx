import "@vitejs/plugin-react/preamble";
import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "../../../../../packages/mantine-next/src/styles.css";
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
