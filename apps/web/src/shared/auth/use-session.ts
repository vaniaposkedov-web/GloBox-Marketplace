"use client";

import { useEffect, useState } from "react";
import {
  getStoredUser,
  getToken,
  onSessionChange,
  type AuthUser,
} from "./session";

interface SessionState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    token: null,
    user: null,
    hydrated: false,
  });

  useEffect(() => {
    const sync = () => {
      setState({
        token: getToken(),
        user: getStoredUser(),
        hydrated: true,
      });
    };
    sync();
    return onSessionChange(sync);
  }, []);

  return state;
}
