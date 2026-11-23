import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@/shared/styles/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { appKindOf, resolveAppTarget } from "@/boot/resolve-app";
import { Root } from "@/boot/Root";

const target = resolveAppTarget(
  window.location,
  import.meta.env.VITE_PLATFORM_DOMAIN || "localhost",
);

// App scope on <html> (not a wrapper div) so portalled overlays — dialogs,
// menus, toasts — inherit the right tokens too.
document.documentElement.dataset.app = appKindOf(target);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root target={target} />
  </StrictMode>,
);
