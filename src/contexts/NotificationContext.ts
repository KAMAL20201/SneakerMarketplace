import { createContext } from "react";
import type { NotificationContextType } from "../types/notifications";

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);
