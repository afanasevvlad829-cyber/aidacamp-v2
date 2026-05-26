/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    portalRole?: 'admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel';
    portalRealRole?: 'admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel';
    portalViewAs?: 'admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel' | null;
  }
}
