import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { MantineWrapper } from "../shared/MantineWrapper";
import WelcomeApp from "./WelcomeApp";

const root = document.getElementById("welcome-root");

if (root) {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <MantineWrapper>
        <WelcomeApp />
      </MantineWrapper>
    </StrictMode>,
  );
}
