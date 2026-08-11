import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SolutionThree from "../../app/solution-three/page";
import "../../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SolutionThree />
  </StrictMode>,
);
