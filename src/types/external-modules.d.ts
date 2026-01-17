// Tipos mínimos para dependências opcionais usadas em handlers/APIs
declare module "@prisma/client" {
  export class PrismaClient {
    task: {
      create(args: any): Promise<any>;
      findMany(args?: any): Promise<any[]>;
    };
    processo: { findFirst(args: any): Promise<any | null> };
    $disconnect(): Promise<void>;
  }
}

declare module "firebase/app" {
  export type FirebaseApp = unknown;
  export function initializeApp(config: Record<string, unknown>): FirebaseApp;
}

declare module "firebase/analytics" {
  import type { FirebaseApp } from "firebase/app";
  export type Analytics = unknown;
  export function getAnalytics(app: FirebaseApp): Analytics;
}
