import { Toaster } from "sonner-native";
import { TOAST_ENTER, TOAST_EXIT } from "../../theme/animations";
import { useResolvedMobileTheme } from "../../theme/useResolvedMobileTheme";
import { UI_TIMING_MS } from "../config";

export function AppToaster() {
  const theme = useResolvedMobileTheme();

  return (
    <Toaster
      animation={{ enter: TOAST_ENTER, exit: TOAST_EXIT }}
      closeButton={false}
      duration={UI_TIMING_MS.toastDuration}
      enableStacking
      offset={12}
      position="top-center"
      swipeToDismissDirection="up"
      theme={theme}
      unstyled
      visibleToasts={3}
    />
  );
}
