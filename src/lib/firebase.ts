// Firebase 클라이언트 SDK 싱글톤.
// HMR에서 initializeApp 중복 호출 → 에러 나므로 getApps()로 분기.
// Next.js 16 SSR에서 초기화되지 않도록 이 모듈은 "use client" 컴포넌트 트리에서만 import 한다.
// analytics(getAnalytics) 는 절대 쓰지 말 것 — SSR 환경에서 window 참조 에러.

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 앱 인스턴스 — HMR/중복 초기화 방어.
export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
