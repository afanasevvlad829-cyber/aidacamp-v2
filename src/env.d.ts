/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/** Яндекс.Метрика (глобал, подключается внешним скриптом). */
declare function ym(...args: any[]): void;

/** Tailwind CDN runtime config (demo-страницы на cdn.tailwindcss.com). */
declare const tailwind: any;

interface Window {
  ym?: (...args: any[]) => void;
  openSnakeOverlay?: () => void;
  closeSnakeOverlay?: () => void;
  tailwind?: any;
}

declare namespace App {
  interface Locals {
    portalRole?: 'admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel';
    portalRoles?: ('admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel')[];
    /** Имя залогиненного сотрудника (для шапки портала). Для ученика/общего пароля — undefined. */
    portalName?: string;
    /** telegram_id сотрудника/ученика (TG-вход: payload.sub; код-вход: telegram_id из portal_staff). */
    portalSub?: number;
    /** portal_staff.id при коде-входе (альтернатива sub для сотрудников без TG). */
    portalSid?: number;
  }
}
