import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { MantineWrapper } from "../shared/MantineWrapper";
import PopupApp from "./PopupApp";

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
