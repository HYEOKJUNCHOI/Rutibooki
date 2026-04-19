"use client";

// AuthProvider 와 useAuth 가 공유하는 Context 타입·객체.
// 순환 import를 피하기 위해 Context 정의만 별도 파일에 분리.

import { createContext } from "react";
import type { User } from "firebase/auth";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
