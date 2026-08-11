import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SolutionTwo from "../../app/solution-two/page";
import "../../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SolutionTwo />
  </StrictMode>,
);
