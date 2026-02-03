import { createContext, useContext } from "react";
import { APP_MODE, AppMode } from "@/config/appMode";

const AppModeContext = createContext<AppMode>(APP_MODE);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppModeContext.Provider value={APP_MODE}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppMode {
  return useContext(AppModeContext);
}
