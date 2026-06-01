/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    portalRole?: 'admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel';
    portalRoles?: ('admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel')[];
    /** Имя залогиненного сотрудника (для шапки портала). Для ученика/общего пароля — undefined. */
    portalName?: string;
  }
}
