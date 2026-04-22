import { removeTrailingForwardSlash, appendForwardSlash, removeLeadingForwardSlash, collapseDuplicateSlashes, prependForwardSlash as prependForwardSlash$1, collapseDuplicateLeadingSlashes, joinPaths, isInternalPath, collapseDuplicateTrailingSlashes, hasFileExtension, fileExtension, slash } from '@astrojs/internal-helpers/path';
import { matchPattern } from '@astrojs/internal-helpers/remote';
import colors from 'piccolore';
import { parse as parse$1, stringify as stringify$1, unflatten as unflatten$1 } from 'devalue';
import 'es-module-lexer';
import { R as ROUTE_TYPE_HEADER, a as REROUTE_DIRECTIVE_HEADER, s as shouldAppendForwardSlash, A as AstroError, i as i18nNoLocaleFoundInPath, b as ResponseSentError, p as pipelineSymbol, c as ActionNotFoundError, d as REDIRECT_STATUS_CODES, e as ActionsReturnedInvalidDataError, E as EndpointDidNotReturnAResponse, f as REROUTABLE_STATUS_CODES, g as isPropagatingHint, h as getPropagationHint$1, M as MissingMediaQueryDirective, N as NoMatchingImport, j as escapeHTML, k as bufferPropagatedHead, l as isHeadAndContent, m as isRenderTemplateResult, O as OnlyResponseCanBeReturned, n as isPromise, o as promiseWithResolvers, q as encoder, r as chunkToByteArray, t as chunkToString, u as chunkToByteArrayOrString, v as toAttributeString, w as markHTMLString, x as renderSlotToString, y as maybeRenderHead, z as containsServerDirective, F as Fragment, B as renderSlots, S as ServerIslandComponent, C as createAstroComponentInstance, D as Renderer, G as NoMatchingRenderer, H as formatList, I as NoClientOnlyHint, J as internalSpreadAttributes, K as voidElementNames, L as renderTemplate, P as createRenderInstruction, Q as renderElement$1, T as SlotString, U as mergeSlotInstructions, V as HTMLString, W as isHTMLString, X as isRenderInstruction, Y as isAstroComponentInstance, Z as isRenderInstance, _ as renderCspContent, $ as isNode, a0 as isDeno, a1 as addAttribute, a2 as MiddlewareNoDataOrNextCalled, a3 as MiddlewareNotAResponse, a4 as CacheNotEnabled, a5 as defineMiddleware, a6 as NOOP_MIDDLEWARE_HEADER, a7 as decryptString, a8 as createSlotValueFromString, a9 as DEFAULT_404_COMPONENT, aa as DEFAULT_404_ROUTE, ab as default404Instance, ac as decodeKey, ad as RouteCache, ae as sequence, af as ReservedSlotName, ag as getRouteGenerator, ah as isRoute404, ai as isRoute500, aj as SessionStorageInitError, ak as SessionStorageSaveError, al as getParams, am as setOriginPathname, an as getProps, ao as ForbiddenRewrite, ap as copyRequest, aq as ASTRO_GENERATOR, ar as getOriginPathname, as as LocalsReassigned, at as generateCspDigest, au as PrerenderClientAddressNotAvailable, av as ClientAddressNotAvailable, aw as StaticClientAddressNotAvailable, ax as REWRITE_DIRECTIVE_HEADER_KEY, ay as REWRITE_DIRECTIVE_HEADER_VALUE, az as AstroResponseHeadersReassigned, aA as responseSentSymbol$1, aB as LocalsNotAnObject, aC as routeHasHtmlExtension, aD as clientAddressSymbol, aE as routeIsRedirect, aF as routeIsFallback, aG as getFallbackRoute, aH as findRouteToRewrite, aI as nodeRequestAbortControllerCleanupSymbol } from './sequence_C7YAHkIp.mjs';
import { clsx } from 'clsx';
import { serialize, parse } from 'cookie';
import { createStorage } from 'unstorage';
import fs, { createReadStream } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import enableDestroy from 'server-destroy';
import os from 'node:os';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import { Readable } from 'node:stream';
import { Http2ServerResponse } from 'node:http2';
import url from 'node:url';
import send from 'send';

function computeFallbackRoute(options) {
  const {
    pathname,
    responseStatus,
    fallback,
    fallbackType,
    locales,
    defaultLocale,
    strategy,
    base
  } = options;
  if (responseStatus !== 404) {
    return { type: "none" };
  }
  if (!fallback || Object.keys(fallback).length === 0) {
    return { type: "none" };
  }
  const segments = pathname.split("/");
  const urlLocale = segments.find((segment) => {
    for (const locale of locales) {
      if (typeof locale === "string") {
        if (locale === segment) {
          return true;
        }
      } else if (locale.path === segment) {
        return true;
      }
    }
    return false;
  });
  if (!urlLocale) {
    return { type: "none" };
  }
  const fallbackKeys = Object.keys(fallback);
  if (!fallbackKeys.includes(urlLocale)) {
    return { type: "none" };
  }
  const fallbackLocale = fallback[urlLocale];
  const pathFallbackLocale = getPathByLocale(fallbackLocale, locales);
  let newPathname;
  if (pathFallbackLocale === defaultLocale && strategy === "pathname-prefix-other-locales") {
    if (pathname.includes(`${base}`)) {
      newPathname = pathname.replace(`/${urlLocale}`, ``);
    } else {
      newPathname = pathname.replace(`/${urlLocale}`, `/`);
    }
  } else {
    newPathname = pathname.replace(`/${urlLocale}`, `/${pathFallbackLocale}`);
  }
  return {
    type: fallbackType,
    pathname: newPathname
  };
}

class I18nRouter {
  #strategy;
  #defaultLocale;
  #locales;
  #base;
  #domains;
  constructor(options) {
    this.#strategy = options.strategy;
    this.#defaultLocale = options.defaultLocale;
    this.#locales = options.locales;
    this.#base = options.base === "/" ? "/" : removeTrailingForwardSlash(options.base || "");
    this.#domains = options.domains;
  }
  /**
   * Evaluate routing strategy for a pathname.
   * Returns decision object (not HTTP Response).
   */
  match(pathname, context) {
    if (this.shouldSkipProcessing(pathname, context)) {
      return { type: "continue" };
    }
    switch (this.#strategy) {
      case "manual":
        return { type: "continue" };
      case "pathname-prefix-always":
        return this.matchPrefixAlways(pathname, context);
      case "domains-prefix-always":
        if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) {
          return { type: "continue" };
        }
        return this.matchPrefixAlways(pathname, context);
      case "pathname-prefix-other-locales":
        return this.matchPrefixOtherLocales(pathname, context);
      case "domains-prefix-other-locales":
        if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) {
          return { type: "continue" };
        }
        return this.matchPrefixOtherLocales(pathname, context);
      case "pathname-prefix-always-no-redirect":
        return this.matchPrefixAlwaysNoRedirect(pathname, context);
      case "domains-prefix-always-no-redirect":
        if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) {
          return { type: "continue" };
        }
        return this.matchPrefixAlwaysNoRedirect(pathname, context);
      default:
        return { type: "continue" };
    }
  }
  /**
   * Check if i18n processing should be skipped for this request
   */
  shouldSkipProcessing(pathname, context) {
    if (pathname.includes("/404") || pathname.includes("/500")) {
      return true;
    }
    if (pathname.includes("/_server-islands/")) {
      return true;
    }
    if (context.isReroute) {
      return true;
    }
    if (context.routeType && context.routeType !== "page" && context.routeType !== "fallback") {
      return true;
    }
    return false;
  }
  /**
   * Strategy: pathname-prefix-always
   * All locales must have a prefix, including the default locale.
   */
  matchPrefixAlways(pathname, _context) {
    const isRoot = pathname === this.#base + "/" || pathname === this.#base;
    if (isRoot) {
      const basePrefix = this.#base === "/" ? "" : this.#base;
      return {
        type: "redirect",
        location: `${basePrefix}/${this.#defaultLocale}`
      };
    }
    if (!pathHasLocale(pathname, this.#locales)) {
      return { type: "notFound" };
    }
    return { type: "continue" };
  }
  /**
   * Strategy: pathname-prefix-other-locales
   * Default locale has no prefix, other locales must have a prefix.
   */
  matchPrefixOtherLocales(pathname, _context) {
    let pathnameContainsDefaultLocale = false;
    for (const segment of pathname.split("/")) {
      if (normalizeTheLocale(segment) === normalizeTheLocale(this.#defaultLocale)) {
        pathnameContainsDefaultLocale = true;
        break;
      }
    }
    if (pathnameContainsDefaultLocale) {
      const newLocation = pathname.replace(`/${this.#defaultLocale}`, "");
      return {
        type: "notFound",
        location: newLocation
      };
    }
    return { type: "continue" };
  }
  /**
   * Strategy: pathname-prefix-always-no-redirect
   * Like prefix-always but allows root to serve instead of redirecting
   */
  matchPrefixAlwaysNoRedirect(pathname, _context) {
    const isRoot = pathname === this.#base + "/" || pathname === this.#base;
    if (isRoot) {
      return { type: "continue" };
    }
    if (!pathHasLocale(pathname, this.#locales)) {
      return { type: "notFound" };
    }
    return { type: "continue" };
  }
  /**
   * Check if the current locale doesn't belong to the configured domain.
   * Used for domain-based routing strategies.
   */
  localeHasntDomain(currentLocale, currentDomain) {
    if (!this.#domains || !currentDomain) {
      return false;
    }
    if (!currentLocale) {
      return false;
    }
    const localesForDomain = this.#domains[currentDomain];
    if (!localesForDomain) {
      return true;
    }
    return !localesForDomain.includes(currentLocale);
  }
}

function createI18nMiddleware(i18n, base, trailingSlash, format) {
  if (!i18n) return (_, next) => next();
  const i18nRouter = new I18nRouter({
    strategy: i18n.strategy,
    defaultLocale: i18n.defaultLocale,
    locales: i18n.locales,
    base,
    domains: i18n.domainLookupTable ? Object.keys(i18n.domainLookupTable).reduce(
      (acc, domain) => {
        const locale = i18n.domainLookupTable[domain];
        if (!acc[domain]) {
          acc[domain] = [];
        }
        acc[domain].push(locale);
        return acc;
      },
      {}
    ) : void 0
  });
  return async (context, next) => {
    const response = await next();
    const typeHeader = response.headers.get(ROUTE_TYPE_HEADER);
    const isReroute = response.headers.get(REROUTE_DIRECTIVE_HEADER);
    if (isReroute === "no" && typeof i18n.fallback === "undefined") {
      return response;
    }
    if (typeHeader !== "page" && typeHeader !== "fallback") {
      return response;
    }
    const routerContext = {
      currentLocale: context.currentLocale,
      currentDomain: context.url.hostname,
      routeType: typeHeader,
      isReroute: isReroute === "yes"
    };
    const routeDecision = i18nRouter.match(context.url.pathname, routerContext);
    switch (routeDecision.type) {
      case "redirect": {
        let location = routeDecision.location;
        if (shouldAppendForwardSlash(trailingSlash, format)) {
          location = appendForwardSlash(location);
        }
        return context.redirect(location, routeDecision.status);
      }
      case "notFound": {
        if (context.isPrerendered) {
          const prerenderedRes = new Response(response.body, {
            status: 404,
            headers: response.headers
          });
          prerenderedRes.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
          if (routeDecision.location) {
            prerenderedRes.headers.set("Location", routeDecision.location);
          }
          return prerenderedRes;
        }
        const headers = new Headers();
        if (routeDecision.location) {
          headers.set("Location", routeDecision.location);
        }
        return new Response(null, { status: 404, headers });
      }
    }
    if (i18n.fallback && i18n.fallbackType) {
      const fallbackDecision = computeFallbackRoute({
        pathname: context.url.pathname,
        responseStatus: response.status,
        currentLocale: context.currentLocale,
        fallback: i18n.fallback,
        fallbackType: i18n.fallbackType,
        locales: i18n.locales,
        defaultLocale: i18n.defaultLocale,
        strategy: i18n.strategy,
        base
      });
      switch (fallbackDecision.type) {
        case "redirect":
          return context.redirect(fallbackDecision.pathname + context.url.search);
        case "rewrite":
          return await context.rewrite(fallbackDecision.pathname + context.url.search);
      }
    }
    return response;
  };
}

function pathHasLocale(path, locales) {
  const segments = path.split("/").map(normalizeThePath);
  for (const segment of segments) {
    for (const locale of locales) {
      if (typeof locale === "string") {
        if (normalizeTheLocale(segment) === normalizeTheLocale(locale)) {
          return true;
        }
      } else if (segment === locale.path) {
        return true;
      }
    }
  }
  return false;
}
function getPathByLocale(locale, locales) {
  for (const loopLocale of locales) {
    if (typeof loopLocale === "string") {
      if (loopLocale === locale) {
        return loopLocale;
      }
    } else {
      for (const code of loopLocale.codes) {
        if (code === locale) {
          return loopLocale.path;
        }
      }
    }
  }
  throw new AstroError(i18nNoLocaleFoundInPath);
}
function normalizeTheLocale(locale) {
  return locale.replaceAll("_", "-").toLowerCase();
}
function normalizeThePath(path) {
  return path.endsWith(".html") ? path.slice(0, -5) : path;
}
function getAllCodes(locales) {
  const result = [];
  for (const loopLocale of locales) {
    if (typeof loopLocale === "string") {
      result.push(loopLocale);
    } else {
      result.push(...loopLocale.codes);
    }
  }
  return result;
}

const DELETED_EXPIRATION = /* @__PURE__ */ new Date(0);
const DELETED_VALUE = "deleted";
const responseSentSymbol = /* @__PURE__ */ Symbol.for("astro.responseSent");
const identity = (value) => value;
class AstroCookie {
  value;
  constructor(value) {
    this.value = value;
  }
  json() {
    if (this.value === void 0) {
      throw new Error(`Cannot convert undefined to an object.`);
    }
    return JSON.parse(this.value);
  }
  number() {
    return Number(this.value);
  }
  boolean() {
    if (this.value === "false") return false;
    if (this.value === "0") return false;
    return Boolean(this.value);
  }
}
class AstroCookies {
  #request;
  #requestValues;
  #outgoing;
  #consumed;
  constructor(request) {
    this.#request = request;
    this.#requestValues = null;
    this.#outgoing = null;
    this.#consumed = false;
  }
  /**
   * Astro.cookies.delete(key) is used to delete a cookie. Using this method will result
   * in a Set-Cookie header added to the response.
   * @param key The cookie to delete
   * @param options Options related to this deletion, such as the path of the cookie.
   */
  delete(key, options) {
    const {
      // @ts-expect-error
      maxAge: _ignoredMaxAge,
      // @ts-expect-error
      expires: _ignoredExpires,
      ...sanitizedOptions
    } = options || {};
    const serializeOptions = {
      expires: DELETED_EXPIRATION,
      ...sanitizedOptions
    };
    this.#ensureOutgoingMap().set(key, [
      DELETED_VALUE,
      serialize(key, DELETED_VALUE, serializeOptions),
      false
    ]);
  }
  /**
   * Astro.cookies.get(key) is used to get a cookie value. The cookie value is read from the
   * request. If you have set a cookie via Astro.cookies.set(key, value), the value will be taken
   * from that set call, overriding any values already part of the request.
   * @param key The cookie to get.
   * @returns An object containing the cookie value as well as convenience methods for converting its value.
   */
  get(key, options = void 0) {
    if (this.#outgoing?.has(key)) {
      let [serializedValue, , isSetValue] = this.#outgoing.get(key);
      if (isSetValue) {
        return new AstroCookie(serializedValue);
      } else {
        return void 0;
      }
    }
    const decode = options?.decode ?? decodeURIComponent;
    const values = this.#ensureParsed();
    if (key in values) {
      const value = values[key];
      if (value) {
        let decodedValue;
        try {
          decodedValue = decode(value);
        } catch (_error) {
          decodedValue = value;
        }
        return new AstroCookie(decodedValue);
      }
    }
  }
  /**
   * Astro.cookies.has(key) returns a boolean indicating whether this cookie is either
   * part of the initial request or set via Astro.cookies.set(key)
   * @param key The cookie to check for.
   * @param _options This parameter is no longer used.
   * @returns
   */
  has(key, _options) {
    if (this.#outgoing?.has(key)) {
      let [, , isSetValue] = this.#outgoing.get(key);
      return isSetValue;
    }
    const values = this.#ensureParsed();
    return values[key] !== void 0;
  }
  /**
   * Astro.cookies.set(key, value) is used to set a cookie's value. If provided
   * an object it will be stringified via JSON.stringify(value). Additionally you
   * can provide options customizing how this cookie will be set, such as setting httpOnly
   * in order to prevent the cookie from being read in client-side JavaScript.
   * @param key The name of the cookie to set.
   * @param value A value, either a string or other primitive or an object.
   * @param options Options for the cookie, such as the path and security settings.
   */
  set(key, value, options) {
    if (this.#consumed) {
      const warning = new Error(
        "Astro.cookies.set() was called after the cookies had already been sent to the browser.\nThis may have happened if this method was called in an imported component.\nPlease make sure that Astro.cookies.set() is only called in the frontmatter of the main page."
      );
      warning.name = "Warning";
      console.warn(warning);
    }
    let serializedValue;
    if (typeof value === "string") {
      serializedValue = value;
    } else {
      let toStringValue = value.toString();
      if (toStringValue === Object.prototype.toString.call(value)) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = toStringValue;
      }
    }
    const serializeOptions = {};
    if (options) {
      Object.assign(serializeOptions, options);
    }
    this.#ensureOutgoingMap().set(key, [
      serializedValue,
      serialize(key, serializedValue, serializeOptions),
      true
    ]);
    if (this.#request[responseSentSymbol]) {
      throw new AstroError({
        ...ResponseSentError
      });
    }
  }
  /**
   * Merges a new AstroCookies instance into the current instance. Any new cookies
   * will be added to the current instance, overwriting any existing cookies with the same name.
   */
  merge(cookies) {
    const outgoing = cookies.#outgoing;
    if (outgoing) {
      for (const [key, value] of outgoing) {
        this.#ensureOutgoingMap().set(key, value);
      }
    }
  }
  /**
   * Astro.cookies.header() returns an iterator for the cookies that have previously
   * been set by either Astro.cookies.set() or Astro.cookies.delete().
   * This method is primarily used by adapters to set the header on outgoing responses.
   * @returns
   */
  *headers() {
    if (this.#outgoing == null) return;
    for (const [, value] of this.#outgoing) {
      yield value[1];
    }
  }
  /**
   * Behaves the same as AstroCookies.prototype.headers(),
   * but allows a warning when cookies are set after the instance is consumed.
   */
  static consume(cookies) {
    cookies.#consumed = true;
    return cookies.headers();
  }
  #ensureParsed() {
    if (!this.#requestValues) {
      this.#parse();
    }
    if (!this.#requestValues) {
      this.#requestValues = /* @__PURE__ */ Object.create(null);
    }
    return this.#requestValues;
  }
  #ensureOutgoingMap() {
    if (!this.#outgoing) {
      this.#outgoing = /* @__PURE__ */ new Map();
    }
    return this.#outgoing;
  }
  #parse() {
    const raw = this.#request.headers.get("cookie");
    if (!raw) {
      return;
    }
    this.#requestValues = parse(raw, { decode: identity });
  }
}

const astroCookiesSymbol = /* @__PURE__ */ Symbol.for("astro.cookies");
function attachCookiesToResponse(response, cookies) {
  Reflect.set(response, astroCookiesSymbol, cookies);
}
function getCookiesFromResponse(response) {
  let cookies = Reflect.get(response, astroCookiesSymbol);
  if (cookies != null) {
    return cookies;
  } else {
    return void 0;
  }
}
function* getSetCookiesFromResponse(response) {
  const cookies = getCookiesFromResponse(response);
  if (!cookies) {
    return [];
  }
  for (const headerValue of AstroCookies.consume(cookies)) {
    yield headerValue;
  }
  return [];
}

const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90
};
function log(opts, level, label, message, newLine = true) {
  const logLevel = opts.level;
  const dest = opts.dest;
  const event = {
    label,
    level,
    message,
    newLine
  };
  if (!isLogLevelEnabled(logLevel, level)) {
    return;
  }
  dest.write(event);
}
function isLogLevelEnabled(configuredLogLevel, level) {
  return levels[configuredLogLevel] <= levels[level];
}
function info(opts, label, message, newLine = true) {
  return log(opts, "info", label, message, newLine);
}
function warn(opts, label, message, newLine = true) {
  return log(opts, "warn", label, message, newLine);
}
function error(opts, label, message, newLine = true) {
  return log(opts, "error", label, message, newLine);
}
function debug(...args) {
  if ("_astroGlobalDebug" in globalThis) {
    globalThis._astroGlobalDebug(...args);
  }
}
function getEventPrefix({ level, label }) {
  const timestamp = `${dateTimeFormat.format(/* @__PURE__ */ new Date())}`;
  const prefix = [];
  if (level === "error" || level === "warn") {
    prefix.push(colors.bold(timestamp));
    prefix.push(`[${level.toUpperCase()}]`);
  } else {
    prefix.push(timestamp);
  }
  if (label) {
    prefix.push(`[${label}]`);
  }
  if (level === "error") {
    return colors.red(prefix.join(" "));
  }
  if (level === "warn") {
    return colors.yellow(prefix.join(" "));
  }
  if (prefix.length === 1) {
    return colors.dim(prefix[0]);
  }
  return colors.dim(prefix[0]) + " " + colors.blue(prefix.splice(1).join(" "));
}
class Logger {
  options;
  constructor(options) {
    this.options = options;
  }
  info(label, message, newLine = true) {
    info(this.options, label, message, newLine);
  }
  warn(label, message, newLine = true) {
    warn(this.options, label, message, newLine);
  }
  error(label, message, newLine = true) {
    error(this.options, label, message, newLine);
  }
  debug(label, ...messages) {
    debug(label, ...messages);
  }
  level() {
    return this.options.level;
  }
  forkIntegrationLogger(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
}
class AstroIntegrationLogger {
  options;
  label;
  constructor(logging, label) {
    this.options = logging;
    this.label = label;
  }
  /**
   * Creates a new logger instance with a new label, but the same log options.
   */
  fork(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
  info(message) {
    info(this.options, this.label, message);
  }
  warn(message) {
    warn(this.options, this.label, message);
  }
  error(message) {
    error(this.options, this.label, message);
  }
  debug(message) {
    debug(this.label, message);
  }
}

const consoleLogDestination = {
  write(event) {
    let dest = console.error;
    if (levels[event.level] < levels["error"]) {
      dest = console.info;
    }
    if (event.label === "SKIP_FORMAT") {
      dest(event.message);
    } else {
      dest(getEventPrefix(event) + " " + event.message);
    }
    return true;
  }
};

const ACTION_QUERY_PARAMS = {
  actionName: "_action"};
const ACTION_RPC_ROUTE_PATTERN = "/_actions/[...path]";

const __vite_import_meta_env__$1 = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://aidacamp.ru", "SSR": true};
const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
const statusToCodeMap = Object.fromEntries(
  Object.entries(codeToStatusMap).map(([key, value]) => [value, key])
);
class ActionError extends Error {
  type = "AstroActionError";
  code = "INTERNAL_SERVER_ERROR";
  status = 500;
  constructor(params) {
    super(params.message);
    this.code = params.code;
    this.status = ActionError.codeToStatus(params.code);
    if (params.stack) {
      this.stack = params.stack;
    }
  }
  static codeToStatus(code) {
    return codeToStatusMap[code];
  }
  static statusToCode(status) {
    return statusToCodeMap[status] ?? "INTERNAL_SERVER_ERROR";
  }
  static fromJson(body) {
    if (isInputError(body)) {
      return new ActionInputError(body.issues);
    }
    if (isActionError(body)) {
      return new ActionError(body);
    }
    return new ActionError({
      code: "INTERNAL_SERVER_ERROR"
    });
  }
}
function isActionError(error) {
  return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionError";
}
function isInputError(error) {
  return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionInputError" && "issues" in error && Array.isArray(error.issues);
}
class ActionInputError extends ActionError {
  type = "AstroActionInputError";
  // We don't expose all ZodError properties.
  // Not all properties will serialize from server to client,
  // and we don't want to import the full ZodError object into the client.
  issues;
  fields;
  constructor(issues) {
    super({
      message: `Failed to validate: ${JSON.stringify(issues, null, 2)}`,
      code: "BAD_REQUEST"
    });
    this.issues = issues;
    this.fields = {};
    for (const issue of issues) {
      if (issue.path.length > 0) {
        const key = issue.path[0].toString();
        this.fields[key] ??= [];
        this.fields[key]?.push(issue.message);
      }
    }
  }
}
function deserializeActionResult(res) {
  if (res.type === "error") {
    let json;
    try {
      json = JSON.parse(res.body);
    } catch {
      return {
        data: void 0,
        error: new ActionError({
          message: res.body,
          code: "INTERNAL_SERVER_ERROR"
        })
      };
    }
    if (Object.assign(__vite_import_meta_env__$1, { _: "/Users/vladimirafanasev/Aidacamp-cloude/node_modules/.bin/astro" })?.PROD) {
      return { error: ActionError.fromJson(json), data: void 0 };
    } else {
      const error = ActionError.fromJson(json);
      error.stack = actionResultErrorStack.get();
      return {
        error,
        data: void 0
      };
    }
  }
  if (res.type === "empty") {
    return { data: void 0, error: void 0 };
  }
  return {
    data: parse$1(res.body, {
      URL: (href) => new URL(href)
    }),
    error: void 0
  };
}
const actionResultErrorStack = /* @__PURE__ */ (function actionResultErrorStackFn() {
  let errorStack;
  return {
    set(stack) {
      errorStack = stack;
    },
    get() {
      return errorStack;
    }
  };
})();
function getActionQueryString(name) {
  const searchParams = new URLSearchParams({ [ACTION_QUERY_PARAMS.actionName]: name });
  return `?${searchParams.toString()}`;
}

async function readBodyWithLimit(request, limit) {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > limit) {
      throw new BodySizeLimitError(limit);
    }
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > limit) {
        throw new BodySizeLimitError(limit);
      }
      chunks.push(value);
    }
  }
  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}
class BodySizeLimitError extends Error {
  limit;
  constructor(limit) {
    super(`Request body exceeds the configured limit of ${limit} bytes`);
    this.name = "BodySizeLimitError";
    this.limit = limit;
  }
}

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://aidacamp.ru", "SSR": true};
function getActionContext(context) {
  const callerInfo = getCallerInfo(context);
  const actionResultAlreadySet = Boolean(context.locals._actionPayload);
  let action = void 0;
  if (callerInfo && context.request.method === "POST" && !actionResultAlreadySet) {
    action = {
      calledFrom: callerInfo.from,
      name: callerInfo.name,
      handler: async () => {
        const pipeline = Reflect.get(context, pipelineSymbol);
        const callerInfoName = shouldAppendForwardSlash(
          pipeline.manifest.trailingSlash,
          pipeline.manifest.buildFormat
        ) ? removeTrailingForwardSlash(callerInfo.name) : callerInfo.name;
        let baseAction;
        try {
          baseAction = await pipeline.getAction(callerInfoName);
        } catch (error) {
          if (error instanceof Error && "name" in error && typeof error.name === "string" && error.name === ActionNotFoundError.name) {
            return { data: void 0, error: new ActionError({ code: "NOT_FOUND" }) };
          }
          throw error;
        }
        const bodySizeLimit = pipeline.manifest.actionBodySizeLimit;
        let input;
        try {
          input = await parseRequestBody(context.request, bodySizeLimit);
        } catch (e) {
          if (e instanceof ActionError) {
            return { data: void 0, error: e };
          }
          if (e instanceof TypeError) {
            return { data: void 0, error: new ActionError({ code: "UNSUPPORTED_MEDIA_TYPE" }) };
          }
          throw e;
        }
        const omitKeys = ["props", "getActionResult", "callAction", "redirect"];
        const actionAPIContext = Object.create(
          Object.getPrototypeOf(context),
          Object.fromEntries(
            Object.entries(Object.getOwnPropertyDescriptors(context)).filter(
              ([key]) => !omitKeys.includes(key)
            )
          )
        );
        Reflect.set(actionAPIContext, ACTION_API_CONTEXT_SYMBOL, true);
        const handler = baseAction.bind(actionAPIContext);
        return handler(input);
      }
    };
  }
  function setActionResult(actionName, actionResult) {
    context.locals._actionPayload = {
      actionResult,
      actionName
    };
  }
  return {
    action,
    setActionResult,
    serializeActionResult,
    deserializeActionResult
  };
}
function getCallerInfo(ctx) {
  if (ctx.routePattern === ACTION_RPC_ROUTE_PATTERN) {
    return { from: "rpc", name: ctx.url.pathname.replace(/^.*\/_actions\//, "") };
  }
  const queryParam = ctx.url.searchParams.get(ACTION_QUERY_PARAMS.actionName);
  if (queryParam) {
    return { from: "form", name: queryParam };
  }
  return void 0;
}
async function parseRequestBody(request, bodySizeLimit) {
  const contentType = request.headers.get("content-type");
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : void 0;
  const hasContentLength = typeof contentLength === "number" && Number.isFinite(contentLength);
  if (!contentType) return void 0;
  if (hasContentLength && contentLength > bodySizeLimit) {
    throw new ActionError({
      code: "CONTENT_TOO_LARGE",
      message: `Request body exceeds ${bodySizeLimit} bytes`
    });
  }
  try {
    if (hasContentType(contentType, formContentTypes)) {
      if (!hasContentLength) {
        const body = await readBodyWithLimit(request.clone(), bodySizeLimit);
        const formRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: toArrayBuffer(body)
        });
        return await formRequest.formData();
      }
      return await request.clone().formData();
    }
    if (hasContentType(contentType, ["application/json"])) {
      if (contentLength === 0) return void 0;
      if (!hasContentLength) {
        const body = await readBodyWithLimit(request.clone(), bodySizeLimit);
        if (body.byteLength === 0) return void 0;
        return JSON.parse(new TextDecoder().decode(body));
      }
      return await request.clone().json();
    }
  } catch (e) {
    if (e instanceof BodySizeLimitError) {
      throw new ActionError({
        code: "CONTENT_TOO_LARGE",
        message: `Request body exceeds ${bodySizeLimit} bytes`
      });
    }
    throw e;
  }
  throw new TypeError("Unsupported content type");
}
const ACTION_API_CONTEXT_SYMBOL = /* @__PURE__ */ Symbol.for("astro.actionAPIContext");
const formContentTypes = ["application/x-www-form-urlencoded", "multipart/form-data"];
function hasContentType(contentType, expected) {
  const type = contentType.split(";")[0].toLowerCase();
  return expected.some((t) => type === t);
}
function serializeActionResult(res) {
  if (res.error) {
    if (Object.assign(__vite_import_meta_env__, { _: "/Users/vladimirafanasev/Aidacamp-cloude/node_modules/.bin/astro" })?.DEV) {
      actionResultErrorStack.set(res.error.stack);
    }
    let body2;
    if (res.error instanceof ActionInputError) {
      body2 = {
        type: res.error.type,
        issues: res.error.issues,
        fields: res.error.fields
      };
    } else {
      body2 = {
        ...res.error,
        message: res.error.message
      };
    }
    return {
      type: "error",
      status: res.error.status,
      contentType: "application/json",
      body: JSON.stringify(body2)
    };
  }
  if (res.data === void 0) {
    return {
      type: "empty",
      status: 204
    };
  }
  let body;
  try {
    body = stringify$1(res.data, {
      // Add support for URL objects
      URL: (value) => value instanceof URL && value.href
    });
  } catch (e) {
    let hint = ActionsReturnedInvalidDataError.hint;
    if (res.data instanceof Response) {
      hint = REDIRECT_STATUS_CODES.includes(res.data.status) ? "If you need to redirect when the action succeeds, trigger a redirect where the action is called. See the Actions guide for server and client redirect examples: https://docs.astro.build/en/guides/actions." : "If you need to return a Response object, try using a server endpoint instead. See https://docs.astro.build/en/guides/endpoints/#server-endpoints-api-routes";
    }
    throw new AstroError({
      ...ActionsReturnedInvalidDataError,
      message: ActionsReturnedInvalidDataError.message(String(e)),
      hint
    });
  }
  return {
    type: "data",
    status: 200,
    contentType: "application/json+devalue",
    body
  };
}
function toArrayBuffer(buffer) {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

function hasActionPayload(locals) {
  return "_actionPayload" in locals;
}
function createGetActionResult(locals) {
  return (actionFn) => {
    if (!hasActionPayload(locals) || actionFn.toString() !== getActionQueryString(locals._actionPayload.actionName)) {
      return void 0;
    }
    return deserializeActionResult(locals._actionPayload.actionResult);
  };
}
function createCallAction(context) {
  return (baseAction, input) => {
    Reflect.set(context, ACTION_API_CONTEXT_SYMBOL, true);
    const action = baseAction.bind(context);
    return action(input);
  };
}

function parseLocale(header) {
  if (header === "*") {
    return [{ locale: header, qualityValue: void 0 }];
  }
  const result = [];
  const localeValues = header.split(",").map((str) => str.trim());
  for (const localeValue of localeValues) {
    const split = localeValue.split(";").map((str) => str.trim());
    const localeName = split[0];
    const qualityValue = split[1];
    if (!split) {
      continue;
    }
    if (qualityValue && qualityValue.startsWith("q=")) {
      const qualityValueAsFloat = Number.parseFloat(qualityValue.slice("q=".length));
      if (Number.isNaN(qualityValueAsFloat) || qualityValueAsFloat > 1) {
        result.push({
          locale: localeName,
          qualityValue: void 0
        });
      } else {
        result.push({
          locale: localeName,
          qualityValue: qualityValueAsFloat
        });
      }
    } else {
      result.push({
        locale: localeName,
        qualityValue: void 0
      });
    }
  }
  return result;
}
function sortAndFilterLocales(browserLocaleList, locales) {
  const normalizedLocales = getAllCodes(locales).map(normalizeTheLocale);
  return browserLocaleList.filter((browserLocale) => {
    if (browserLocale.locale !== "*") {
      return normalizedLocales.includes(normalizeTheLocale(browserLocale.locale));
    }
    return true;
  }).sort((a, b) => {
    if (a.qualityValue && b.qualityValue) {
      return Math.sign(b.qualityValue - a.qualityValue);
    }
    return 0;
  });
}
function computePreferredLocale(request, locales) {
  const acceptHeader = request.headers.get("Accept-Language");
  let result = void 0;
  if (acceptHeader) {
    const browserLocaleList = sortAndFilterLocales(parseLocale(acceptHeader), locales);
    const firstResult = browserLocaleList.at(0);
    if (firstResult && firstResult.locale !== "*") {
      for (const currentLocale of locales) {
        if (typeof currentLocale === "string") {
          if (normalizeTheLocale(currentLocale) === normalizeTheLocale(firstResult.locale)) {
            result = currentLocale;
            break;
          }
        } else {
          for (const currentCode of currentLocale.codes) {
            if (normalizeTheLocale(currentCode) === normalizeTheLocale(firstResult.locale)) {
              result = currentCode;
              break;
            }
          }
        }
      }
    }
  }
  return result;
}
function computePreferredLocaleList(request, locales) {
  const acceptHeader = request.headers.get("Accept-Language");
  let result = [];
  if (acceptHeader) {
    const browserLocaleList = sortAndFilterLocales(parseLocale(acceptHeader), locales);
    if (browserLocaleList.length === 1 && browserLocaleList.at(0).locale === "*") {
      return getAllCodes(locales);
    } else if (browserLocaleList.length > 0) {
      for (const browserLocale of browserLocaleList) {
        for (const loopLocale of locales) {
          if (typeof loopLocale === "string") {
            if (normalizeTheLocale(loopLocale) === normalizeTheLocale(browserLocale.locale)) {
              result.push(loopLocale);
            }
          } else {
            for (const code of loopLocale.codes) {
              if (code === browserLocale.locale) {
                result.push(code);
              }
            }
          }
        }
      }
    }
  }
  return result;
}
function computeCurrentLocale(pathname, locales, defaultLocale) {
  for (const segment of pathname.split("/").map(normalizeThePath)) {
    for (const locale of locales) {
      if (typeof locale === "string") {
        if (!segment.includes(locale)) continue;
        if (normalizeTheLocale(locale) === normalizeTheLocale(segment)) {
          return locale;
        }
      } else {
        if (locale.path === segment) {
          return locale.codes.at(0);
        } else {
          for (const code of locale.codes) {
            if (normalizeTheLocale(code) === normalizeTheLocale(segment)) {
              return code;
            }
          }
        }
      }
    }
  }
  for (const locale of locales) {
    if (typeof locale === "string") {
      if (locale === defaultLocale) {
        return locale;
      }
    } else {
      if (locale.path === defaultLocale) {
        return locale.codes.at(0);
      }
    }
  }
}
function computeCurrentLocaleFromParams(params, locales) {
  const byNormalizedCode = /* @__PURE__ */ new Map();
  const byPath = /* @__PURE__ */ new Map();
  for (const locale of locales) {
    if (typeof locale === "string") {
      byNormalizedCode.set(normalizeTheLocale(locale), locale);
    } else {
      byPath.set(locale.path, locale.codes[0]);
      for (const code of locale.codes) {
        byNormalizedCode.set(normalizeTheLocale(code), code);
      }
    }
  }
  for (const value of Object.values(params)) {
    if (!value) continue;
    const pathMatch = byPath.get(value);
    if (pathMatch) return pathMatch;
    const codeMatch = byNormalizedCode.get(normalizeTheLocale(value));
    if (codeMatch) return codeMatch;
  }
}

async function renderEndpoint(mod, context, isPrerendered, logger) {
  const { request, url } = context;
  const method = request.method.toUpperCase();
  let handler = mod[method] ?? mod["ALL"];
  if (!handler && method === "HEAD" && mod["GET"]) {
    handler = mod["GET"];
  }
  if (isPrerendered && !["GET", "HEAD"].includes(method)) {
    logger.warn(
      "router",
      `${url.pathname} ${colors.bold(
        method
      )} requests are not available in static endpoints. Mark this page as server-rendered (\`export const prerender = false;\`) or update your config to \`output: 'server'\` to make all your pages server-rendered by default.`
    );
  }
  if (handler === void 0) {
    logger.warn(
      "router",
      `No API Route handler exists for the method "${method}" for the route "${url.pathname}".
Found handlers: ${Object.keys(mod).map((exp) => JSON.stringify(exp)).join(", ")}
` + ("all" in mod ? `One of the exported handlers is "all" (lowercase), did you mean to export 'ALL'?
` : "")
    );
    return new Response(null, { status: 404 });
  }
  if (typeof handler !== "function") {
    logger.error(
      "router",
      `The route "${url.pathname}" exports a value for the method "${method}", but it is of the type ${typeof handler} instead of a function.`
    );
    return new Response(null, { status: 500 });
  }
  let response = await handler.call(mod, context);
  if (!response || response instanceof Response === false) {
    throw new AstroError(EndpointDidNotReturnAResponse);
  }
  if (REROUTABLE_STATUS_CODES.includes(response.status)) {
    try {
      response.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
    } catch (err) {
      if (err.message?.includes("immutable")) {
        response = new Response(response.body, response);
        response.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
      } else {
        throw err;
      }
    }
  }
  if (method === "HEAD") {
    return new Response(null, response);
  }
  return response;
}

const AstroJSX = "astro:jsx";
function isVNode(vnode) {
  return vnode && typeof vnode === "object" && vnode[AstroJSX];
}

function isAstroComponentFactory(obj) {
  return obj == null ? false : obj.isAstroComponentFactory === true;
}
function isAPropagatingComponent(result, factory) {
  return isPropagatingHint(getPropagationHint(result, factory));
}
function getPropagationHint(result, factory) {
  return getPropagationHint$1(result, factory);
}

const PROP_TYPE = {
  Value: 0,
  JSON: 1,
  // Actually means Array
  RegExp: 2,
  Date: 3,
  Map: 4,
  Set: 5,
  BigInt: 6,
  URL: 7,
  Uint8Array: 8,
  Uint16Array: 9,
  Uint32Array: 10,
  Infinity: 11
};
function serializeArray(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = value.map((v) => {
    return convertToSerializedForm(v, metadata, parents);
  });
  parents.delete(value);
  return serialized;
}
function serializeObject(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = Object.fromEntries(
    Object.entries(value).map(([k, v]) => {
      return [k, convertToSerializedForm(v, metadata, parents)];
    })
  );
  parents.delete(value);
  return serialized;
}
function convertToSerializedForm(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  const tag = Object.prototype.toString.call(value);
  switch (tag) {
    case "[object Date]": {
      return [PROP_TYPE.Date, value.toISOString()];
    }
    case "[object RegExp]": {
      return [PROP_TYPE.RegExp, value.source];
    }
    case "[object Map]": {
      return [PROP_TYPE.Map, serializeArray(Array.from(value), metadata, parents)];
    }
    case "[object Set]": {
      return [PROP_TYPE.Set, serializeArray(Array.from(value), metadata, parents)];
    }
    case "[object BigInt]": {
      return [PROP_TYPE.BigInt, value.toString()];
    }
    case "[object URL]": {
      return [PROP_TYPE.URL, value.toString()];
    }
    case "[object Array]": {
      return [PROP_TYPE.JSON, serializeArray(value, metadata, parents)];
    }
    case "[object Uint8Array]": {
      return [PROP_TYPE.Uint8Array, Array.from(value)];
    }
    case "[object Uint16Array]": {
      return [PROP_TYPE.Uint16Array, Array.from(value)];
    }
    case "[object Uint32Array]": {
      return [PROP_TYPE.Uint32Array, Array.from(value)];
    }
    default: {
      if (value !== null && typeof value === "object") {
        return [PROP_TYPE.Value, serializeObject(value, metadata, parents)];
      }
      if (value === Number.POSITIVE_INFINITY) {
        return [PROP_TYPE.Infinity, 1];
      }
      if (value === Number.NEGATIVE_INFINITY) {
        return [PROP_TYPE.Infinity, -1];
      }
      if (value === void 0) {
        return [PROP_TYPE.Value];
      }
      return [PROP_TYPE.Value, value];
    }
  }
}
function serializeProps(props, metadata) {
  const serialized = JSON.stringify(serializeObject(props, metadata));
  return serialized;
}

const transitionDirectivesToCopyOnIsland = Object.freeze([
  "data-astro-transition-scope",
  "data-astro-transition-persist",
  "data-astro-transition-persist-props"
]);
function extractDirectives(inputProps, clientDirectives) {
  let extracted = {
    isPage: false,
    hydration: null,
    props: {},
    propsWithoutTransitionAttributes: {}
  };
  for (const [key, value] of Object.entries(inputProps)) {
    if (key.startsWith("server:")) {
      if (key === "server:root") {
        extracted.isPage = true;
      }
    }
    if (key.startsWith("client:")) {
      if (!extracted.hydration) {
        extracted.hydration = {
          directive: "",
          value: "",
          componentUrl: "",
          componentExport: { value: "" }
        };
      }
      switch (key) {
        case "client:component-path": {
          extracted.hydration.componentUrl = value;
          break;
        }
        case "client:component-export": {
          extracted.hydration.componentExport.value = value;
          break;
        }
        // This is a special prop added to prove that the client hydration method
        // was added statically.
        case "client:component-hydration": {
          break;
        }
        case "client:display-name": {
          break;
        }
        default: {
          extracted.hydration.directive = key.split(":")[1];
          extracted.hydration.value = value;
          if (!clientDirectives.has(extracted.hydration.directive)) {
            const hydrationMethods = Array.from(clientDirectives.keys()).map((d) => `client:${d}`).join(", ");
            throw new Error(
              `Error: invalid hydration directive "${key}". Supported hydration methods: ${hydrationMethods}`
            );
          }
          if (extracted.hydration.directive === "media" && typeof extracted.hydration.value !== "string") {
            throw new AstroError(MissingMediaQueryDirective);
          }
          break;
        }
      }
    } else {
      extracted.props[key] = value;
      if (!transitionDirectivesToCopyOnIsland.includes(key)) {
        extracted.propsWithoutTransitionAttributes[key] = value;
      }
    }
  }
  for (const sym of Object.getOwnPropertySymbols(inputProps)) {
    extracted.props[sym] = inputProps[sym];
    extracted.propsWithoutTransitionAttributes[sym] = inputProps[sym];
  }
  return extracted;
}
async function generateHydrateScript(scriptOptions, metadata) {
  const { renderer, result, astroId, props, attrs } = scriptOptions;
  const { hydrate, componentUrl, componentExport } = metadata;
  if (!componentExport.value) {
    throw new AstroError({
      ...NoMatchingImport,
      message: NoMatchingImport.message(metadata.displayName)
    });
  }
  const island = {
    children: "",
    props: {
      // This is for HMR, probably can avoid it in prod
      uid: astroId
    }
  };
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      island.props[key] = escapeHTML(value);
    }
  }
  island.props["component-url"] = await result.resolve(decodeURI(componentUrl));
  if (renderer.clientEntrypoint) {
    island.props["component-export"] = componentExport.value;
    island.props["renderer-url"] = await result.resolve(
      decodeURI(renderer.clientEntrypoint.toString())
    );
    island.props["props"] = escapeHTML(serializeProps(props, metadata));
  }
  island.props["ssr"] = "";
  island.props["client"] = hydrate;
  let beforeHydrationUrl = await result.resolve("astro:scripts/before-hydration.js");
  if (beforeHydrationUrl.length) {
    island.props["before-hydration-url"] = beforeHydrationUrl;
  }
  island.props["opts"] = escapeHTML(
    JSON.stringify({
      name: metadata.displayName,
      value: metadata.hydrateArgs || ""
    })
  );
  transitionDirectivesToCopyOnIsland.forEach((name) => {
    if (typeof props[name] !== "undefined") {
      island.props[name] = props[name];
    }
  });
  return island;
}

/**
 * shortdash - https://github.com/bibig/node-shorthash
 *
 * @license
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Bibig <bibig@me.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
const dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY";
const binary = dictionary.length;
function bitwise(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash = hash & hash;
  }
  return hash;
}
function shorthash(text) {
  let num;
  let result = "";
  let integer = bitwise(text);
  const sign = integer < 0 ? "Z" : "";
  integer = Math.abs(integer);
  while (integer >= binary) {
    num = integer % binary;
    integer = Math.floor(integer / binary);
    result = dictionary[num] + result;
  }
  if (integer > 0) {
    result = dictionary[integer] + result;
  }
  return sign + result;
}

const DOCTYPE_EXP = /<!doctype html/i;
async function renderToString(result, componentFactory, props, children, isPage = false, route) {
  const templateResult = await callComponentAsTemplateResultOrResponse(
    result,
    componentFactory,
    props,
    children,
    route
  );
  if (templateResult instanceof Response) return templateResult;
  let str = "";
  let renderedFirstPageChunk = false;
  if (isPage) {
    await bufferHeadContent(result);
  }
  const destination = {
    write(chunk) {
      if (isPage && !renderedFirstPageChunk) {
        renderedFirstPageChunk = true;
        if (!result.partial && !DOCTYPE_EXP.test(String(chunk))) {
          const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
          str += doctype;
        }
      }
      if (chunk instanceof Response) return;
      str += chunkToString(result, chunk);
    }
  };
  await templateResult.render(destination);
  return str;
}
async function renderToReadableStream(result, componentFactory, props, children, isPage = false, route) {
  const templateResult = await callComponentAsTemplateResultOrResponse(
    result,
    componentFactory,
    props,
    children,
    route
  );
  if (templateResult instanceof Response) return templateResult;
  let renderedFirstPageChunk = false;
  if (isPage) {
    await bufferHeadContent(result);
  }
  return new ReadableStream({
    start(controller) {
      const destination = {
        write(chunk) {
          if (isPage && !renderedFirstPageChunk) {
            renderedFirstPageChunk = true;
            if (!result.partial && !DOCTYPE_EXP.test(String(chunk))) {
              const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
              controller.enqueue(encoder.encode(doctype));
            }
          }
          if (chunk instanceof Response) {
            throw new AstroError({
              ...ResponseSentError
            });
          }
          const bytes = chunkToByteArray(result, chunk);
          controller.enqueue(bytes);
        }
      };
      (async () => {
        try {
          await templateResult.render(destination);
          controller.close();
        } catch (e) {
          if (AstroError.is(e) && !e.loc) {
            e.setLocation({
              file: route?.component
            });
          }
          setTimeout(() => controller.error(e), 0);
        }
      })();
    },
    cancel() {
      result.cancelled = true;
    }
  });
}
async function callComponentAsTemplateResultOrResponse(result, componentFactory, props, children, route) {
  const factoryResult = await componentFactory(result, props, children);
  if (factoryResult instanceof Response) {
    return factoryResult;
  } else if (isHeadAndContent(factoryResult)) {
    if (!isRenderTemplateResult(factoryResult.content)) {
      throw new AstroError({
        ...OnlyResponseCanBeReturned,
        message: OnlyResponseCanBeReturned.message(
          route?.route,
          typeof factoryResult
        ),
        location: {
          file: route?.component
        }
      });
    }
    return factoryResult.content;
  } else if (!isRenderTemplateResult(factoryResult)) {
    throw new AstroError({
      ...OnlyResponseCanBeReturned,
      message: OnlyResponseCanBeReturned.message(route?.route, typeof factoryResult),
      location: {
        file: route?.component
      }
    });
  }
  return factoryResult;
}
async function bufferHeadContent(result) {
  await bufferPropagatedHead(result);
}
async function renderToAsyncIterable(result, componentFactory, props, children, isPage = false, route) {
  const templateResult = await callComponentAsTemplateResultOrResponse(
    result,
    componentFactory,
    props,
    children,
    route
  );
  if (templateResult instanceof Response) return templateResult;
  let renderedFirstPageChunk = false;
  if (isPage) {
    await bufferHeadContent(result);
  }
  let error = null;
  let next = null;
  const buffer = [];
  let renderingComplete = false;
  const iterator = {
    async next() {
      if (result.cancelled) return { done: true, value: void 0 };
      if (next !== null) {
        await next.promise;
      } else if (!renderingComplete && !buffer.length) {
        next = promiseWithResolvers();
        await next.promise;
      }
      if (!renderingComplete) {
        next = promiseWithResolvers();
      }
      if (error) {
        throw error;
      }
      let length = 0;
      let stringToEncode = "";
      for (let i = 0, len = buffer.length; i < len; i++) {
        const bufferEntry = buffer[i];
        if (typeof bufferEntry === "string") {
          const nextIsString = i + 1 < len && typeof buffer[i + 1] === "string";
          stringToEncode += bufferEntry;
          if (!nextIsString) {
            const encoded = encoder.encode(stringToEncode);
            length += encoded.length;
            stringToEncode = "";
            buffer[i] = encoded;
          } else {
            buffer[i] = "";
          }
        } else {
          length += bufferEntry.length;
        }
      }
      let mergedArray = new Uint8Array(length);
      let offset = 0;
      for (let i = 0, len = buffer.length; i < len; i++) {
        const item = buffer[i];
        if (item === "") {
          continue;
        }
        mergedArray.set(item, offset);
        offset += item.length;
      }
      buffer.length = 0;
      const returnValue = {
        // The iterator is done when rendering has finished
        // and there are no more chunks to return.
        done: length === 0 && renderingComplete,
        value: mergedArray
      };
      return returnValue;
    },
    async return() {
      result.cancelled = true;
      return { done: true, value: void 0 };
    }
  };
  const destination = {
    write(chunk) {
      if (isPage && !renderedFirstPageChunk) {
        renderedFirstPageChunk = true;
        if (!result.partial && !DOCTYPE_EXP.test(String(chunk))) {
          const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
          buffer.push(encoder.encode(doctype));
        }
      }
      if (chunk instanceof Response) {
        throw new AstroError(ResponseSentError);
      }
      const bytes = chunkToByteArrayOrString(result, chunk);
      if (bytes.length > 0) {
        buffer.push(bytes);
        next?.resolve();
      } else if (buffer.length > 0) {
        next?.resolve();
      }
    }
  };
  const renderResult = toPromise(() => templateResult.render(destination));
  renderResult.catch((err) => {
    error = err;
  }).finally(() => {
    renderingComplete = true;
    next?.resolve();
  });
  return {
    [Symbol.asyncIterator]() {
      return iterator;
    }
  };
}
function toPromise(fn) {
  try {
    const result = fn();
    return isPromise(result) ? result : Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
}

function componentIsHTMLElement(Component) {
  return typeof HTMLElement !== "undefined" && HTMLElement.isPrototypeOf(Component);
}
async function renderHTMLElement$1(result, constructor, props, slots) {
  const name = getHTMLElementName(constructor);
  let attrHTML = "";
  for (const attr in props) {
    attrHTML += ` ${attr}="${toAttributeString(await props[attr])}"`;
  }
  return markHTMLString(
    `<${name}${attrHTML}>${await renderSlotToString(result, slots?.default)}</${name}>`
  );
}
function getHTMLElementName(constructor) {
  const definedName = customElements.getName(constructor);
  if (definedName) return definedName;
  const assignedName = constructor.name.replace(/^HTML|Element$/g, "").replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "html-");
  return assignedName;
}

const needsHeadRenderingSymbol = /* @__PURE__ */ Symbol.for("astro.needsHeadRendering");
const rendererAliases = /* @__PURE__ */ new Map([["solid", "solid-js"]]);
const clientOnlyValues = /* @__PURE__ */ new Set(["solid-js", "react", "preact", "vue", "svelte"]);
function guessRenderers(componentUrl) {
  const extname = componentUrl?.split(".").pop();
  switch (extname) {
    case "svelte":
      return ["@astrojs/svelte"];
    case "vue":
      return ["@astrojs/vue"];
    case "jsx":
    case "tsx":
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/solid-js", "@astrojs/vue (jsx)"];
    case void 0:
    default:
      return [
        "@astrojs/react",
        "@astrojs/preact",
        "@astrojs/solid-js",
        "@astrojs/vue",
        "@astrojs/svelte"
      ];
  }
}
function isFragmentComponent(Component) {
  return Component === Fragment;
}
function isHTMLComponent(Component) {
  return Component && Component["astro:html"] === true;
}
const ASTRO_SLOT_EXP = /<\/?astro-slot\b[^>]*>/g;
const ASTRO_STATIC_SLOT_EXP = /<\/?astro-static-slot\b[^>]*>/g;
function removeStaticAstroSlot(html, supportsAstroStaticSlot = true) {
  const exp = supportsAstroStaticSlot ? ASTRO_STATIC_SLOT_EXP : ASTRO_SLOT_EXP;
  return html.replace(exp, "");
}
async function renderFrameworkComponent(result, displayName, Component, _props, slots = {}) {
  if (!Component && "client:only" in _props === false) {
    throw new Error(
      `Unable to render ${displayName} because it is ${Component}!
Did you forget to import the component or is it possible there is a typo?`
    );
  }
  const { renderers, clientDirectives } = result;
  const metadata = {
    astroStaticSlot: true,
    displayName
  };
  const { hydration, isPage, props, propsWithoutTransitionAttributes } = extractDirectives(
    _props,
    clientDirectives
  );
  let html = "";
  let attrs = void 0;
  if (hydration) {
    metadata.hydrate = hydration.directive;
    metadata.hydrateArgs = hydration.value;
    metadata.componentExport = hydration.componentExport;
    metadata.componentUrl = hydration.componentUrl;
  }
  const probableRendererNames = guessRenderers(metadata.componentUrl);
  const validRenderers = renderers.filter((r) => r.name !== "astro:jsx");
  const { children, slotInstructions } = await renderSlots(result, slots);
  let renderer;
  if (metadata.hydrate !== "only") {
    let isTagged = false;
    try {
      isTagged = Component && Component[Renderer];
    } catch {
    }
    if (isTagged) {
      const rendererName = Component[Renderer];
      renderer = renderers.find(({ name }) => name === rendererName);
    }
    if (!renderer) {
      let error;
      for (const r of renderers) {
        try {
          if (await r.ssr.check.call({ result }, Component, props, children, metadata)) {
            renderer = r;
            break;
          }
        } catch (e) {
          error ??= e;
        }
      }
      if (!renderer && error) {
        throw error;
      }
    }
    if (!renderer && typeof HTMLElement === "function" && componentIsHTMLElement(Component)) {
      const output = await renderHTMLElement$1(
        result,
        Component,
        _props,
        slots
      );
      return {
        render(destination) {
          destination.write(output);
        }
      };
    }
  } else {
    if (metadata.hydrateArgs) {
      const rendererName = rendererAliases.has(metadata.hydrateArgs) ? rendererAliases.get(metadata.hydrateArgs) : metadata.hydrateArgs;
      if (clientOnlyValues.has(rendererName)) {
        renderer = renderers.find(
          ({ name }) => name === `@astrojs/${rendererName}` || name === rendererName
        );
      }
    }
    if (!renderer && validRenderers.length === 1) {
      renderer = validRenderers[0];
    }
    if (!renderer) {
      const extname = metadata.componentUrl?.split(".").pop();
      renderer = renderers.find(({ name }) => name === `@astrojs/${extname}` || name === extname);
    }
    if (!renderer && metadata.hydrateArgs) {
      const rendererName = metadata.hydrateArgs;
      if (typeof rendererName === "string") {
        renderer = renderers.find(({ name }) => name === rendererName);
      }
    }
  }
  let componentServerRenderEndTime;
  if (!renderer) {
    if (metadata.hydrate === "only") {
      const rendererName = rendererAliases.has(metadata.hydrateArgs) ? rendererAliases.get(metadata.hydrateArgs) : metadata.hydrateArgs;
      if (clientOnlyValues.has(rendererName)) {
        const plural = validRenderers.length > 1;
        throw new AstroError({
          ...NoMatchingRenderer,
          message: NoMatchingRenderer.message(
            metadata.displayName,
            metadata?.componentUrl?.split(".").pop(),
            plural,
            validRenderers.length
          ),
          hint: NoMatchingRenderer.hint(
            formatList(probableRendererNames.map((r) => "`" + r + "`"))
          )
        });
      } else {
        throw new AstroError({
          ...NoClientOnlyHint,
          message: NoClientOnlyHint.message(metadata.displayName),
          hint: NoClientOnlyHint.hint(
            probableRendererNames.map((r) => r.replace("@astrojs/", "")).join("|")
          )
        });
      }
    } else if (typeof Component !== "string") {
      const matchingRenderers = validRenderers.filter(
        (r) => probableRendererNames.includes(r.name)
      );
      const plural = validRenderers.length > 1;
      if (matchingRenderers.length === 0) {
        throw new AstroError({
          ...NoMatchingRenderer,
          message: NoMatchingRenderer.message(
            metadata.displayName,
            metadata?.componentUrl?.split(".").pop(),
            plural,
            validRenderers.length
          ),
          hint: NoMatchingRenderer.hint(
            formatList(probableRendererNames.map((r) => "`" + r + "`"))
          )
        });
      } else if (matchingRenderers.length === 1) {
        renderer = matchingRenderers[0];
        ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
          { result },
          Component,
          propsWithoutTransitionAttributes,
          children,
          metadata
        ));
      } else {
        throw new Error(`Unable to render ${metadata.displayName}!

This component likely uses ${formatList(probableRendererNames)},
but Astro encountered an error during server-side rendering.

Please ensure that ${metadata.displayName}:
1. Does not unconditionally access browser-specific globals like \`window\` or \`document\`.
   If this is unavoidable, use the \`client:only\` hydration directive.
2. Does not conditionally return \`null\` or \`undefined\` when rendered on the server.
3. If using multiple JSX frameworks at the same time (e.g. React + Preact), pass the correct \`include\`/\`exclude\` options to integrations.

If you're still stuck, please open an issue on GitHub or join us at https://astro.build/chat.`);
      }
    }
  } else {
    if (metadata.hydrate === "only") {
      html = await renderSlotToString(result, slots?.fallback);
    } else {
      const componentRenderStartTime = performance.now();
      ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
        { result },
        Component,
        propsWithoutTransitionAttributes,
        children,
        metadata
      ));
      if (process.env.NODE_ENV === "development")
        componentServerRenderEndTime = performance.now() - componentRenderStartTime;
    }
  }
  if (!html && typeof Component === "string") {
    const Tag = sanitizeElementName(Component);
    const childSlots = Object.values(children).join("");
    const renderTemplateResult = renderTemplate`<${Tag}${internalSpreadAttributes(
      props,
      true,
      Tag
    )}${markHTMLString(
      childSlots === "" && voidElementNames.test(Tag) ? `/>` : `>${childSlots}</${Tag}>`
    )}`;
    html = "";
    const destination = {
      write(chunk) {
        if (chunk instanceof Response) return;
        html += chunkToString(result, chunk);
      }
    };
    await renderTemplateResult.render(destination);
  }
  if (!hydration) {
    return {
      render(destination) {
        if (slotInstructions) {
          for (const instruction of slotInstructions) {
            destination.write(instruction);
          }
        }
        if (isPage || renderer?.name === "astro:jsx") {
          destination.write(html);
        } else if (html && html.length > 0) {
          destination.write(
            markHTMLString(removeStaticAstroSlot(html, renderer?.ssr?.supportsAstroStaticSlot))
          );
        }
      }
    };
  }
  const astroId = shorthash(
    `<!--${metadata.componentExport.value}:${metadata.componentUrl}-->
${html}
${serializeProps(
      props,
      metadata
    )}`
  );
  const island = await generateHydrateScript(
    { renderer, result, astroId, props, attrs },
    metadata
  );
  if (componentServerRenderEndTime && process.env.NODE_ENV === "development")
    island.props["server-render-time"] = componentServerRenderEndTime;
  let unrenderedSlots = [];
  if (html) {
    if (Object.keys(children).length > 0) {
      for (const key of Object.keys(children)) {
        let tagName = renderer?.ssr?.supportsAstroStaticSlot ? !!metadata.hydrate ? "astro-slot" : "astro-static-slot" : "astro-slot";
        let expectedHTML = key === "default" ? `<${tagName}>` : `<${tagName} name="${key}">`;
        if (!html.includes(expectedHTML)) {
          unrenderedSlots.push(key);
        }
      }
    }
  } else {
    unrenderedSlots = Object.keys(children);
  }
  const template = unrenderedSlots.length > 0 ? unrenderedSlots.map(
    (key) => `<template data-astro-template${key !== "default" ? `="${key}"` : ""}>${children[key]}</template>`
  ).join("") : "";
  island.children = `${html ?? ""}${template}`;
  if (island.children) {
    island.props["await-children"] = "";
    island.children += `<!--astro:end-->`;
  }
  return {
    render(destination) {
      if (slotInstructions) {
        for (const instruction of slotInstructions) {
          destination.write(instruction);
        }
      }
      destination.write(createRenderInstruction({ type: "directive", hydration }));
      if (hydration.directive !== "only" && renderer?.ssr.renderHydrationScript) {
        destination.write(
          createRenderInstruction({
            type: "renderer-hydration-script",
            rendererName: renderer.name,
            render: renderer.ssr.renderHydrationScript
          })
        );
      }
      const renderedElement = renderElement$1("astro-island", island, false);
      destination.write(markHTMLString(renderedElement));
    }
  };
}
function sanitizeElementName(tag) {
  const unsafe = /[&<>'"\s]+/;
  if (!unsafe.test(tag)) return tag;
  return tag.trim().split(unsafe)[0].trim();
}
async function renderFragmentComponent(result, slots = {}) {
  const children = await renderSlotToString(result, slots?.default);
  return {
    render(destination) {
      if (children == null) return;
      destination.write(children);
    }
  };
}
async function renderHTMLComponent(result, Component, _props, slots = {}) {
  const { slotInstructions, children } = await renderSlots(result, slots);
  const html = Component({ slots: children });
  const hydrationHtml = slotInstructions ? slotInstructions.map((instr) => chunkToString(result, instr)).join("") : "";
  return {
    render(destination) {
      destination.write(markHTMLString(hydrationHtml + html));
    }
  };
}
function renderAstroComponent(result, displayName, Component, props, slots = {}) {
  if (containsServerDirective(props)) {
    const serverIslandComponent = new ServerIslandComponent(result, props, slots, displayName);
    result._metadata.propagators.add(serverIslandComponent);
    return serverIslandComponent;
  }
  const instance = createAstroComponentInstance(result, displayName, Component, props, slots);
  return {
    render(destination) {
      return instance.render(destination);
    }
  };
}
function renderComponent(result, displayName, Component, props, slots = {}) {
  if (isPromise(Component)) {
    return Component.catch(handleCancellation).then((x) => {
      return renderComponent(result, displayName, x, props, slots);
    });
  }
  if (isFragmentComponent(Component)) {
    return renderFragmentComponent(result, slots).catch(handleCancellation);
  }
  props = normalizeProps(props);
  if (isHTMLComponent(Component)) {
    return renderHTMLComponent(result, Component, props, slots).catch(handleCancellation);
  }
  if (isAstroComponentFactory(Component)) {
    return renderAstroComponent(result, displayName, Component, props, slots);
  }
  return renderFrameworkComponent(result, displayName, Component, props, slots).catch(
    handleCancellation
  );
  function handleCancellation(e) {
    if (result.cancelled)
      return {
        render() {
        }
      };
    throw e;
  }
}
function normalizeProps(props) {
  if (props["class:list"] !== void 0) {
    const value = props["class:list"];
    delete props["class:list"];
    props["class"] = clsx(props["class"], value);
    if (props["class"] === "") {
      delete props["class"];
    }
  }
  return props;
}
async function renderComponentToString(result, displayName, Component, props, slots = {}, isPage = false, route) {
  let str = "";
  let renderedFirstPageChunk = false;
  let head = "";
  if (isPage && !result.partial && nonAstroPageNeedsHeadInjection(Component)) {
    head += chunkToString(result, maybeRenderHead());
  }
  try {
    const destination = {
      write(chunk) {
        if (isPage && !result.partial && !renderedFirstPageChunk) {
          renderedFirstPageChunk = true;
          if (!/<!doctype html/i.test(String(chunk))) {
            const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
            str += doctype + head;
          }
        }
        if (chunk instanceof Response) return;
        str += chunkToString(result, chunk);
      }
    };
    const renderInstance = await renderComponent(result, displayName, Component, props, slots);
    if (containsServerDirective(props)) {
      await bufferHeadContent(result);
    }
    await renderInstance.render(destination);
  } catch (e) {
    if (AstroError.is(e) && !e.loc) {
      e.setLocation({
        file: route?.component
      });
    }
    throw e;
  }
  return str;
}
function nonAstroPageNeedsHeadInjection(pageComponent) {
  return !!pageComponent?.[needsHeadRenderingSymbol];
}

const ClientOnlyPlaceholder$1 = "astro-client-only";
const hasTriedRenderComponentSymbol = /* @__PURE__ */ Symbol("hasTriedRenderComponent");
async function renderJSX(result, vnode) {
  switch (true) {
    case vnode instanceof HTMLString:
      if (vnode.toString().trim() === "") {
        return "";
      }
      return vnode;
    case typeof vnode === "string":
      return markHTMLString(escapeHTML(vnode));
    case typeof vnode === "function":
      return vnode;
    case (!vnode && vnode !== 0):
      return "";
    case Array.isArray(vnode): {
      const renderedItems = await Promise.all(vnode.map((v) => renderJSX(result, v)));
      let instructions = null;
      let content = "";
      for (const item of renderedItems) {
        if (item instanceof SlotString) {
          content += item;
          instructions = mergeSlotInstructions(instructions, item);
        } else {
          content += item;
        }
      }
      if (instructions) {
        return markHTMLString(new SlotString(content, instructions));
      }
      return markHTMLString(content);
    }
  }
  return renderJSXVNode(result, vnode);
}
async function renderJSXVNode(result, vnode) {
  if (isVNode(vnode)) {
    switch (true) {
      case !vnode.type: {
        throw new Error(`Unable to render ${result.pathname} because it contains an undefined Component!
Did you forget to import the component or is it possible there is a typo?`);
      }
      case vnode.type === /* @__PURE__ */ Symbol.for("astro:fragment"):
        return renderJSX(result, vnode.props.children);
      case isAstroComponentFactory(vnode.type): {
        let props = {};
        let slots = {};
        for (const [key, value] of Object.entries(vnode.props ?? {})) {
          if (key === "children" || value && typeof value === "object" && value["$$slot"]) {
            slots[key === "children" ? "default" : key] = () => renderJSX(result, value);
          } else {
            props[key] = value;
          }
        }
        const str = await renderComponentToString(
          result,
          vnode.type.name,
          vnode.type,
          props,
          slots
        );
        const html = markHTMLString(str);
        return html;
      }
      case (!vnode.type && vnode.type !== 0):
        return "";
      case (typeof vnode.type === "string" && vnode.type !== ClientOnlyPlaceholder$1):
        return markHTMLString(await renderElement(result, vnode.type, vnode.props ?? {}));
    }
    if (vnode.type) {
      let extractSlots2 = function(child) {
        if (Array.isArray(child)) {
          return child.map((c) => extractSlots2(c));
        }
        if (!isVNode(child)) {
          _slots.default.push(child);
          return;
        }
        if ("slot" in child.props) {
          _slots[child.props.slot] = [..._slots[child.props.slot] ?? [], child];
          delete child.props.slot;
          return;
        }
        _slots.default.push(child);
      };
      if (typeof vnode.type === "function" && vnode.props["server:root"]) {
        const output2 = await vnode.type(vnode.props ?? {});
        return await renderJSX(result, output2);
      }
      if (typeof vnode.type === "function") {
        if (vnode.props[hasTriedRenderComponentSymbol]) {
          delete vnode.props[hasTriedRenderComponentSymbol];
          const output2 = await vnode.type(vnode.props ?? {});
          if (output2?.[AstroJSX] || !output2) {
            return await renderJSXVNode(result, output2);
          } else {
            return;
          }
        } else {
          vnode.props[hasTriedRenderComponentSymbol] = true;
        }
      }
      const { children = null, ...props } = vnode.props ?? {};
      const _slots = {
        default: []
      };
      extractSlots2(children);
      for (const [key, value] of Object.entries(props)) {
        if (value?.["$$slot"]) {
          _slots[key] = value;
          delete props[key];
        }
      }
      const slotPromises = [];
      const slots = {};
      for (const [key, value] of Object.entries(_slots)) {
        slotPromises.push(
          renderJSX(result, value).then((output2) => {
            if (output2.toString().trim().length === 0) return;
            slots[key] = () => output2;
          })
        );
      }
      await Promise.all(slotPromises);
      let output;
      if (vnode.type === ClientOnlyPlaceholder$1 && vnode.props["client:only"]) {
        output = await renderComponentToString(
          result,
          vnode.props["client:display-name"] ?? "",
          null,
          props,
          slots
        );
      } else {
        output = await renderComponentToString(
          result,
          typeof vnode.type === "function" ? vnode.type.name : vnode.type,
          vnode.type,
          props,
          slots
        );
      }
      return markHTMLString(output);
    }
  }
  return markHTMLString(`${vnode}`);
}
async function renderElement(result, tag, { children, ...props }) {
  return markHTMLString(
    `<${tag}${spreadAttributes(props)}${markHTMLString(
      (children == null || children === "") && voidElementNames.test(tag) ? `/>` : `>${children == null ? "" : await renderJSX(result, prerenderElementChildren$1(tag, children))}</${tag}>`
    )}`
  );
}
function prerenderElementChildren$1(tag, children) {
  if (typeof children === "string" && (tag === "style" || tag === "script")) {
    return markHTMLString(children);
  } else {
    return children;
  }
}

const ClientOnlyPlaceholder = "astro-client-only";
function renderJSXToQueue(vnode, result, queue, pool, stack, parent, metadata) {
  if (vnode instanceof HTMLString) {
    const html = vnode.toString();
    if (html.trim() === "") return;
    const node = pool.acquire("html-string", html);
    node.html = html;
    queue.nodes.push(node);
    return;
  }
  if (typeof vnode === "string") {
    const node = pool.acquire("text", vnode);
    node.content = vnode;
    queue.nodes.push(node);
    return;
  }
  if (typeof vnode === "number" || typeof vnode === "boolean") {
    const str = String(vnode);
    const node = pool.acquire("text", str);
    node.content = str;
    queue.nodes.push(node);
    return;
  }
  if (vnode == null || vnode === false) {
    return;
  }
  if (Array.isArray(vnode)) {
    for (let i = vnode.length - 1; i >= 0; i = i - 1) {
      stack.push({ node: vnode[i], parent, metadata });
    }
    return;
  }
  if (!isVNode(vnode)) {
    const str = String(vnode);
    const node = pool.acquire("text", str);
    node.content = str;
    queue.nodes.push(node);
    return;
  }
  handleVNode(vnode, result, queue, pool, stack, parent, metadata);
}
function handleVNode(vnode, result, queue, pool, stack, parent, metadata) {
  if (!vnode.type) {
    throw new Error(
      `Unable to render ${result.pathname} because it contains an undefined Component!
Did you forget to import the component or is it possible there is a typo?`
    );
  }
  if (vnode.type === /* @__PURE__ */ Symbol.for("astro:fragment")) {
    stack.push({ node: vnode.props?.children, parent, metadata });
    return;
  }
  if (isAstroComponentFactory(vnode.type)) {
    const factory = vnode.type;
    let props = {};
    let slots = {};
    for (const [key, value] of Object.entries(vnode.props ?? {})) {
      if (key === "children" || value && typeof value === "object" && value["$$slot"]) {
        slots[key === "children" ? "default" : key] = () => renderJSX(result, value);
      } else {
        props[key] = value;
      }
    }
    const displayName = metadata?.displayName || factory.name || "Anonymous";
    const instance = createAstroComponentInstance(result, displayName, factory, props, slots);
    const queueNode = pool.acquire("component");
    queueNode.instance = instance;
    queue.nodes.push(queueNode);
    return;
  }
  if (typeof vnode.type === "string" && vnode.type !== ClientOnlyPlaceholder) {
    renderHTMLElement(vnode, result, queue, pool, stack, parent, metadata);
    return;
  }
  if (typeof vnode.type === "function") {
    if (vnode.props?.["server:root"]) {
      const output3 = vnode.type(vnode.props ?? {});
      stack.push({ node: output3, parent, metadata });
      return;
    }
    const output2 = vnode.type(vnode.props ?? {});
    stack.push({ node: output2, parent, metadata });
    return;
  }
  const output = renderJSX(result, vnode);
  stack.push({ node: output, parent, metadata });
}
function renderHTMLElement(vnode, _result, queue, pool, stack, parent, metadata) {
  const tag = vnode.type;
  const { children, ...props } = vnode.props ?? {};
  const attrs = spreadAttributes(props);
  const isVoidElement = (children == null || children === "") && voidElementNames.test(tag);
  if (isVoidElement) {
    const html = `<${tag}${attrs}/>`;
    const node = pool.acquire("html-string", html);
    node.html = html;
    queue.nodes.push(node);
    return;
  }
  const openTag = `<${tag}${attrs}>`;
  const openTagHtml = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(openTag) : markHTMLString(openTag);
  stack.push({ node: openTagHtml, parent, metadata });
  if (children != null && children !== "") {
    const processedChildren = prerenderElementChildren(tag, children, queue.htmlStringCache);
    stack.push({ node: processedChildren, parent, metadata });
  }
  const closeTag = `</${tag}>`;
  const closeTagHtml = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(closeTag) : markHTMLString(closeTag);
  stack.push({ node: closeTagHtml, parent, metadata });
}
function prerenderElementChildren(tag, children, htmlStringCache) {
  if (typeof children === "string" && (tag === "style" || tag === "script")) {
    return htmlStringCache ? htmlStringCache.getOrCreate(children) : markHTMLString(children);
  }
  return children;
}

async function buildRenderQueue(root, result, pool) {
  const queue = {
    nodes: [],
    result,
    pool,
    htmlStringCache: result._experimentalQueuedRendering?.htmlStringCache
  };
  const stack = [{ node: root, parent: null }];
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) {
      continue;
    }
    let { node, parent } = item;
    if (isPromise(node)) {
      try {
        const resolved = await node;
        stack.push({ node: resolved, parent, metadata: item.metadata });
      } catch (error) {
        throw error;
      }
      continue;
    }
    if (node == null || node === false) {
      continue;
    }
    if (typeof node === "string") {
      const queueNode = pool.acquire("text", node);
      queueNode.content = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (typeof node === "number" || typeof node === "boolean") {
      const str = String(node);
      const queueNode = pool.acquire("text", str);
      queueNode.content = str;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isHTMLString(node)) {
      const html = node.toString();
      const queueNode = pool.acquire("html-string", html);
      queueNode.html = html;
      queue.nodes.push(queueNode);
      continue;
    }
    if (node instanceof SlotString) {
      const html = node.toString();
      const queueNode = pool.acquire("html-string", html);
      queueNode.html = html;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isVNode(node)) {
      renderJSXToQueue(node, result, queue, pool, stack, parent, item.metadata);
      continue;
    }
    if (Array.isArray(node)) {
      for (const n of node) {
        stack.push({ node: n, parent, metadata: item.metadata });
      }
      continue;
    }
    if (isRenderInstruction(node)) {
      const queueNode = pool.acquire("instruction");
      queueNode.instruction = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isRenderTemplateResult(node)) {
      const htmlParts = node["htmlParts"];
      const expressions = node["expressions"];
      if (htmlParts[0]) {
        const htmlString = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(htmlParts[0]) : markHTMLString(htmlParts[0]);
        stack.push({
          node: htmlString,
          parent,
          metadata: item.metadata
        });
      }
      for (let i = 0; i < expressions.length; i = i + 1) {
        stack.push({ node: expressions[i], parent, metadata: item.metadata });
        if (htmlParts[i + 1]) {
          const htmlString = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(htmlParts[i + 1]) : markHTMLString(htmlParts[i + 1]);
          stack.push({
            node: htmlString,
            parent,
            metadata: item.metadata
          });
        }
      }
      continue;
    }
    if (isAstroComponentInstance(node)) {
      const queueNode = pool.acquire("component");
      queueNode.instance = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isAstroComponentFactory(node)) {
      const factory = node;
      const props = item.metadata?.props || {};
      const slots = item.metadata?.slots || {};
      const displayName = item.metadata?.displayName || factory.name || "Anonymous";
      const instance = createAstroComponentInstance(result, displayName, factory, props, slots);
      const queueNode = pool.acquire("component");
      queueNode.instance = instance;
      if (isAPropagatingComponent(result, factory)) {
        try {
          const returnValue = await instance.init(result);
          if (isHeadAndContent(returnValue) && returnValue.head) {
            result._metadata.extraHead.push(returnValue.head);
          }
        } catch (error) {
          throw error;
        }
      }
      queue.nodes.push(queueNode);
      continue;
    }
    if (isRenderInstance(node)) {
      const queueNode = pool.acquire("component");
      queueNode.instance = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (typeof node === "object" && Symbol.iterator in node) {
      const items = Array.from(node);
      for (const iterItem of items) {
        stack.push({ node: iterItem, parent, metadata: item.metadata });
      }
      continue;
    }
    if (typeof node === "object" && Symbol.asyncIterator in node) {
      try {
        const items = [];
        for await (const asyncItem of node) {
          items.push(asyncItem);
        }
        for (const iterItem of items) {
          stack.push({ node: iterItem, parent, metadata: item.metadata });
        }
      } catch (error) {
        throw error;
      }
      continue;
    }
    if (node instanceof Response) {
      const queueNode = pool.acquire("html-string", "");
      queueNode.html = "";
      queue.nodes.push(queueNode);
      continue;
    }
    if (isHTMLString(node)) {
      const html = String(node);
      const queueNode = pool.acquire("html-string", html);
      queueNode.html = html;
      queue.nodes.push(queueNode);
    } else {
      const str = String(node);
      const queueNode = pool.acquire("text", str);
      queueNode.content = str;
      queue.nodes.push(queueNode);
    }
  }
  queue.nodes.reverse();
  return queue;
}

async function renderQueue(queue, destination) {
  const result = queue.result;
  const pool = queue.pool;
  const cache = queue.htmlStringCache;
  let batchBuffer = "";
  let i = 0;
  while (i < queue.nodes.length) {
    const node = queue.nodes[i];
    try {
      if (canBatch(node)) {
        const batchStart = i;
        while (i < queue.nodes.length && canBatch(queue.nodes[i])) {
          batchBuffer += renderNodeToString(queue.nodes[i]);
          i = i + 1;
        }
        if (batchBuffer) {
          const htmlString = cache ? cache.getOrCreate(batchBuffer) : markHTMLString(batchBuffer);
          destination.write(htmlString);
          batchBuffer = "";
        }
        if (pool) {
          for (let j = batchStart; j < i; j++) {
            pool.release(queue.nodes[j]);
          }
        }
      } else {
        await renderNode(node, destination, result);
        if (pool) {
          pool.release(node);
        }
        i = i + 1;
      }
    } catch (error) {
      throw error;
    }
  }
  if (batchBuffer) {
    const htmlString = cache ? cache.getOrCreate(batchBuffer) : markHTMLString(batchBuffer);
    destination.write(htmlString);
  }
}
function canBatch(node) {
  return node.type === "text" || node.type === "html-string";
}
function renderNodeToString(node) {
  switch (node.type) {
    case "text":
      return node.content ? escapeHTML(node.content) : "";
    case "html-string":
      return node.html || "";
    case "component":
    case "instruction": {
      return "";
    }
  }
}
async function renderNode(node, destination, result) {
  const cache = result._experimentalQueuedRendering?.htmlStringCache;
  switch (node.type) {
    case "text": {
      if (node.content) {
        const escaped = escapeHTML(node.content);
        const htmlString = cache ? cache.getOrCreate(escaped) : markHTMLString(escaped);
        destination.write(htmlString);
      }
      break;
    }
    case "html-string": {
      if (node.html) {
        const htmlString = cache ? cache.getOrCreate(node.html) : markHTMLString(node.html);
        destination.write(htmlString);
      }
      break;
    }
    case "instruction": {
      if (node.instruction) {
        destination.write(node.instruction);
      }
      break;
    }
    case "component": {
      if (node.instance) {
        let componentHtml = "";
        const componentDestination = {
          write(chunk) {
            if (chunk instanceof Response) return;
            componentHtml += chunkToString(result, chunk);
          }
        };
        await node.instance.render(componentDestination);
        if (componentHtml) {
          destination.write(componentHtml);
        }
      }
      break;
    }
  }
}

async function renderPage(result, componentFactory, props, children, streaming, route) {
  if (!isAstroComponentFactory(componentFactory)) {
    result._metadata.headInTree = result.componentMetadata.get(componentFactory.moduleId)?.containsHead ?? false;
    const pageProps = { ...props ?? {}, "server:root": true };
    let str;
    if (result._experimentalQueuedRendering && result._experimentalQueuedRendering.enabled) {
      let vnode = await componentFactory(pageProps);
      if (componentFactory["astro:html"] && typeof vnode === "string") {
        vnode = markHTMLString(vnode);
      }
      const queue = await buildRenderQueue(
        vnode,
        result,
        result._experimentalQueuedRendering.pool
      );
      let html = "";
      let renderedFirst = false;
      const destination = {
        write(chunk) {
          if (chunk instanceof Response) return;
          if (!renderedFirst && !result.partial) {
            renderedFirst = true;
            const chunkStr = String(chunk);
            if (!/<!doctype html/i.test(chunkStr)) {
              const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
              html += doctype;
            }
          }
          html += chunkToString(result, chunk);
        }
      };
      await renderQueue(queue, destination);
      str = html;
    } else {
      str = await renderComponentToString(
        result,
        componentFactory.name,
        componentFactory,
        pageProps,
        {},
        true,
        route
      );
    }
    const bytes = encoder.encode(str);
    const headers2 = new Headers([
      ["Content-Type", "text/html"],
      ["Content-Length", bytes.byteLength.toString()]
    ]);
    if (result.shouldInjectCspMetaTags && (result.cspDestination === "header" || result.cspDestination === "adapter")) {
      headers2.set("content-security-policy", renderCspContent(result));
    }
    return new Response(bytes, {
      headers: headers2,
      status: result.response.status
    });
  }
  result._metadata.headInTree = result.componentMetadata.get(componentFactory.moduleId)?.containsHead ?? false;
  let body;
  if (streaming) {
    if (isNode && !isDeno) {
      const nodeBody = await renderToAsyncIterable(
        result,
        componentFactory,
        props,
        children,
        true,
        route
      );
      body = nodeBody;
    } else {
      body = await renderToReadableStream(result, componentFactory, props, children, true, route);
    }
  } else {
    body = await renderToString(result, componentFactory, props, children, true, route);
  }
  if (body instanceof Response) return body;
  const init = result.response;
  const headers = new Headers(init.headers);
  if (result.shouldInjectCspMetaTags && result.cspDestination === "header" || result.cspDestination === "adapter") {
    headers.set("content-security-policy", renderCspContent(result));
  }
  if (!streaming && typeof body === "string") {
    body = encoder.encode(body);
    headers.set("Content-Length", body.byteLength.toString());
  }
  let status = init.status;
  let statusText = init.statusText;
  if (route?.route === "/404") {
    status = 404;
    if (statusText === "OK") {
      statusText = "Not Found";
    }
  } else if (route?.route === "/500") {
    status = 500;
    if (statusText === "OK") {
      statusText = "Internal Server Error";
    }
  }
  if (status) {
    return new Response(body, { ...init, headers, status, statusText });
  } else {
    return new Response(body, { ...init, headers });
  }
}

function spreadAttributes(values = {}, _name, { class: scopedClassName } = {}) {
  let output = "";
  if (scopedClassName) {
    if (typeof values.class !== "undefined") {
      values.class += ` ${scopedClassName}`;
    } else if (typeof values["class:list"] !== "undefined") {
      values["class:list"] = [values["class:list"], scopedClassName];
    } else {
      values.class = scopedClassName;
    }
  }
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, true, _name);
  }
  return markHTMLString(output);
}

function deduplicateDirectiveValues(existingDirective, newDirective) {
  const [directiveName, ...existingValues] = existingDirective.split(/\s+/).filter(Boolean);
  const [newDirectiveName, ...newValues] = newDirective.split(/\s+/).filter(Boolean);
  if (directiveName !== newDirectiveName) {
    return void 0;
  }
  const finalDirectives = Array.from(/* @__PURE__ */ new Set([...existingValues, ...newValues]));
  return `${directiveName} ${finalDirectives.join(" ")}`;
}
function pushDirective(directives, newDirective) {
  let deduplicated = false;
  if (directives.length === 0) {
    return [newDirective];
  }
  const finalDirectives = [];
  for (const directive of directives) {
    if (deduplicated) {
      finalDirectives.push(directive);
      continue;
    }
    const result = deduplicateDirectiveValues(directive, newDirective);
    if (result) {
      finalDirectives.push(result);
      deduplicated = true;
    } else {
      finalDirectives.push(directive);
      finalDirectives.push(newDirective);
    }
  }
  return finalDirectives;
}

async function callMiddleware(onRequest, apiContext, responseFunction) {
  let nextCalled = false;
  let responseFunctionPromise = void 0;
  const next = async (payload) => {
    nextCalled = true;
    responseFunctionPromise = responseFunction(apiContext, payload);
    return responseFunctionPromise;
  };
  const middlewarePromise = onRequest(apiContext, next);
  return await Promise.resolve(middlewarePromise).then(async (value) => {
    if (nextCalled) {
      if (typeof value !== "undefined") {
        if (value instanceof Response === false) {
          throw new AstroError(MiddlewareNotAResponse);
        }
        return value;
      } else {
        if (responseFunctionPromise) {
          return responseFunctionPromise;
        } else {
          throw new AstroError(MiddlewareNotAResponse);
        }
      }
    } else if (typeof value === "undefined") {
      throw new AstroError(MiddlewareNoDataOrNextCalled);
    } else if (value instanceof Response === false) {
      throw new AstroError(MiddlewareNotAResponse);
    } else {
      return value;
    }
  });
}

const EMPTY_OPTIONS = Object.freeze({ tags: [] });
class NoopAstroCache {
  enabled = false;
  set() {
  }
  get tags() {
    return [];
  }
  get options() {
    return EMPTY_OPTIONS;
  }
  async invalidate() {
  }
}
let hasWarned = false;
class DisabledAstroCache {
  enabled = false;
  #logger;
  constructor(logger) {
    this.#logger = logger;
  }
  #warn() {
    if (!hasWarned) {
      hasWarned = true;
      this.#logger?.warn(
        "cache",
        "`cache.set()` was called but caching is not enabled. Configure a cache provider in your Astro config under `experimental.cache` to enable caching."
      );
    }
  }
  set() {
    this.#warn();
  }
  get tags() {
    return [];
  }
  get options() {
    return EMPTY_OPTIONS;
  }
  async invalidate() {
    throw new AstroError(CacheNotEnabled);
  }
}

const NOOP_ACTIONS_MOD = {
  server: {}
};

const FORM_CONTENT_TYPES = [
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain"
];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
function createOriginCheckMiddleware() {
  return defineMiddleware((context, next) => {
    const { request, url, isPrerendered } = context;
    if (isPrerendered) {
      return next();
    }
    if (SAFE_METHODS.includes(request.method)) {
      return next();
    }
    const isSameOrigin = request.headers.get("origin") === url.origin;
    const hasContentType = request.headers.has("content-type");
    if (hasContentType) {
      const formLikeHeader = hasFormLikeHeader(request.headers.get("content-type"));
      if (formLikeHeader && !isSameOrigin) {
        return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
          status: 403
        });
      }
    } else {
      if (!isSameOrigin) {
        return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
          status: 403
        });
      }
    }
    return next();
  });
}
function hasFormLikeHeader(contentType) {
  if (contentType) {
    for (const FORM_CONTENT_TYPE of FORM_CONTENT_TYPES) {
      if (contentType.toLowerCase().includes(FORM_CONTENT_TYPE)) {
        return true;
      }
    }
  }
  return false;
}

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const RedirectComponentInstance = {
  default() {
    return new Response(null, {
      status: 301
    });
  }
};
const RedirectSinglePageBuiltModule = {
  page: () => Promise.resolve(RedirectComponentInstance),
  onRequest: (_, next) => next()
};

function getPattern(segments, base, addTrailingSlash) {
  const pathname = segments.map((segment) => {
    if (segment.length === 1 && segment[0].spread) {
      return "(?:\\/(.*?))?";
    } else {
      return "\\/" + segment.map((part) => {
        if (part.spread) {
          return "(.*?)";
        } else if (part.dynamic) {
          return "([^/]+?)";
        } else {
          return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
      }).join("");
    }
  }).join("");
  const trailing = addTrailingSlash && segments.length ? getTrailingSlashPattern(addTrailingSlash) : "$";
  let initial = "\\/";
  if (addTrailingSlash === "never" && base !== "/") {
    initial = "";
  }
  return new RegExp(`^${pathname || initial}${trailing}`);
}
function getTrailingSlashPattern(addTrailingSlash) {
  if (addTrailingSlash === "always") {
    return "\\/$";
  }
  if (addTrailingSlash === "never") {
    return "$";
  }
  return "\\/?$";
}

const SERVER_ISLAND_ROUTE = "/_server-islands/[name]";
const SERVER_ISLAND_COMPONENT = "_server-islands.astro";
function badRequest(reason) {
  return new Response(null, {
    status: 400,
    statusText: "Bad request: " + reason
  });
}
const DEFAULT_BODY_SIZE_LIMIT = 1024 * 1024;
async function getRequestData(request, bodySizeLimit = DEFAULT_BODY_SIZE_LIMIT) {
  switch (request.method) {
    case "GET": {
      const url = new URL(request.url);
      const params = url.searchParams;
      if (!params.has("s") || !params.has("e") || !params.has("p")) {
        return badRequest("Missing required query parameters.");
      }
      const encryptedSlots = params.get("s");
      return {
        encryptedComponentExport: params.get("e"),
        encryptedProps: params.get("p"),
        encryptedSlots
      };
    }
    case "POST": {
      try {
        const body = await readBodyWithLimit(request, bodySizeLimit);
        const raw = new TextDecoder().decode(body);
        const data = JSON.parse(raw);
        if (Object.hasOwn(data, "slots") && typeof data.slots === "object") {
          return badRequest("Plaintext slots are not allowed. Slots must be encrypted.");
        }
        if (Object.hasOwn(data, "componentExport") && typeof data.componentExport === "string") {
          return badRequest(
            "Plaintext componentExport is not allowed. componentExport must be encrypted."
          );
        }
        return data;
      } catch (e) {
        if (e instanceof BodySizeLimitError) {
          return new Response(null, {
            status: 413,
            statusText: e.message
          });
        }
        if (e instanceof SyntaxError) {
          return badRequest("Request format is invalid.");
        }
        throw e;
      }
    }
    default: {
      return new Response(null, { status: 405 });
    }
  }
}
function createEndpoint(manifest) {
  const page = async (result) => {
    const params = result.params;
    if (!params.name) {
      return new Response(null, {
        status: 400,
        statusText: "Bad request"
      });
    }
    const componentId = params.name;
    const data = await getRequestData(result.request, manifest.serverIslandBodySizeLimit);
    if (data instanceof Response) {
      return data;
    }
    const serverIslandMappings = await manifest.serverIslandMappings?.();
    const serverIslandMap = await serverIslandMappings?.serverIslandMap;
    let imp = serverIslandMap?.get(componentId);
    if (!imp) {
      return new Response(null, {
        status: 404,
        statusText: "Not found"
      });
    }
    const key = await manifest.key;
    let componentExport;
    try {
      componentExport = await decryptString(key, data.encryptedComponentExport);
    } catch (_e) {
      return badRequest("Encrypted componentExport value is invalid.");
    }
    const encryptedProps = data.encryptedProps;
    let props = {};
    if (encryptedProps !== "") {
      try {
        const propString = await decryptString(key, encryptedProps);
        props = JSON.parse(propString);
      } catch (_e) {
        return badRequest("Encrypted props value is invalid.");
      }
    }
    let decryptedSlots = {};
    const encryptedSlots = data.encryptedSlots;
    if (encryptedSlots !== "") {
      try {
        const slotsString = await decryptString(key, encryptedSlots);
        decryptedSlots = JSON.parse(slotsString);
      } catch (_e) {
        return badRequest("Encrypted slots value is invalid.");
      }
    }
    const componentModule = await imp();
    let Component = componentModule[componentExport];
    const slots = {};
    for (const prop in decryptedSlots) {
      slots[prop] = createSlotValueFromString(decryptedSlots[prop]);
    }
    result.response.headers.set("X-Robots-Tag", "noindex");
    if (isAstroComponentFactory(Component)) {
      const ServerIsland = Component;
      Component = function(...args) {
        return ServerIsland.apply(this, args);
      };
      Object.assign(Component, ServerIsland);
      Component.propagation = "self";
    }
    return renderTemplate`${renderComponent(result, "Component", Component, props, slots)}`;
  };
  page.isAstroComponentFactory = true;
  const instance = {
    default: page,
    partial: true
  };
  return instance;
}

function createDefaultRoutes(manifest) {
  const root = new URL(manifest.rootDir);
  return [
    {
      instance: default404Instance,
      matchesComponent: (filePath) => filePath.href === new URL(DEFAULT_404_COMPONENT, root).href,
      route: DEFAULT_404_ROUTE.route,
      component: DEFAULT_404_COMPONENT
    },
    {
      instance: createEndpoint(manifest),
      matchesComponent: (filePath) => filePath.href === new URL(SERVER_ISLAND_COMPONENT, root).href,
      route: SERVER_ISLAND_ROUTE,
      component: SERVER_ISLAND_COMPONENT
    }
  ];
}

function deserializeManifest(serializedManifest, routesList) {
  const routes = [];
  if (serializedManifest.routes) {
    for (const serializedRoute of serializedManifest.routes) {
      routes.push({
        ...serializedRoute,
        routeData: deserializeRouteData(serializedRoute.routeData)
      });
      const route = serializedRoute;
      route.routeData = deserializeRouteData(serializedRoute.routeData);
    }
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    rootDir: new URL(serializedManifest.rootDir),
    srcDir: new URL(serializedManifest.srcDir),
    publicDir: new URL(serializedManifest.publicDir),
    outDir: new URL(serializedManifest.outDir),
    cacheDir: new URL(serializedManifest.cacheDir),
    buildClientDir: new URL(serializedManifest.buildClientDir),
    buildServerDir: new URL(serializedManifest.buildServerDir),
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    key
  };
}
function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin,
    distURL: rawRouteData.distURL
  };
}
function deserializeRouteInfo(rawRouteInfo) {
  return {
    styles: rawRouteInfo.styles,
    file: rawRouteInfo.file,
    links: rawRouteInfo.links,
    scripts: rawRouteInfo.scripts,
    routeData: deserializeRouteData(rawRouteInfo.routeData)
  };
}

class NodePool {
  textPool = [];
  htmlStringPool = [];
  componentPool = [];
  instructionPool = [];
  maxSize;
  enableStats;
  stats = {
    acquireFromPool: 0,
    acquireNew: 0,
    released: 0,
    releasedDropped: 0
  };
  /**
   * Creates a new object pool for queue nodes.
   *
   * @param maxSize - Maximum number of nodes to keep in the pool (default: 1000).
   *   The cap is shared across all typed sub-pools.
   * @param enableStats - Enable statistics tracking (default: false for performance)
   */
  constructor(maxSize = 1e3, enableStats = false) {
    this.maxSize = maxSize;
    this.enableStats = enableStats;
  }
  /**
   * Acquires a queue node from the pool or creates a new one if the pool is empty.
   * Pops from the type-specific sub-pool to reuse an existing object when available.
   *
   * @param type - The type of queue node to acquire
   * @param content - Optional content to set on the node (for text or html-string types)
   * @returns A queue node ready to be populated with data
   */
  acquire(type, content) {
    const pooledNode = this.popFromTypedPool(type);
    if (pooledNode) {
      if (this.enableStats) {
        this.stats.acquireFromPool = this.stats.acquireFromPool + 1;
      }
      this.resetNodeContent(pooledNode, type, content);
      return pooledNode;
    }
    if (this.enableStats) {
      this.stats.acquireNew = this.stats.acquireNew + 1;
    }
    return this.createNode(type, content);
  }
  /**
   * Creates a new node of the specified type with the given content.
   * Helper method to reduce branching in acquire().
   */
  createNode(type, content = "") {
    switch (type) {
      case "text":
        return { type: "text", content };
      case "html-string":
        return { type: "html-string", html: content };
      case "component":
        return { type: "component", instance: void 0 };
      case "instruction":
        return { type: "instruction", instruction: void 0 };
    }
  }
  /**
   * Pops a node from the type-specific sub-pool.
   * Returns undefined if the sub-pool for the requested type is empty.
   */
  popFromTypedPool(type) {
    switch (type) {
      case "text":
        return this.textPool.pop();
      case "html-string":
        return this.htmlStringPool.pop();
      case "component":
        return this.componentPool.pop();
      case "instruction":
        return this.instructionPool.pop();
    }
  }
  /**
   * Resets the content/value field on a reused pooled node.
   * The type discriminant is already correct since we pop from the matching sub-pool.
   */
  resetNodeContent(node, type, content) {
    switch (type) {
      case "text":
        node.content = content ?? "";
        break;
      case "html-string":
        node.html = content ?? "";
        break;
      case "component":
        node.instance = void 0;
        break;
      case "instruction":
        node.instruction = void 0;
        break;
    }
  }
  /**
   * Returns the total number of nodes across all typed sub-pools.
   */
  totalPoolSize() {
    return this.textPool.length + this.htmlStringPool.length + this.componentPool.length + this.instructionPool.length;
  }
  /**
   * Releases a queue node back to the pool for reuse.
   * If the pool is at max capacity, the node is discarded (will be GC'd).
   *
   * @param node - The node to release back to the pool
   */
  release(node) {
    if (this.totalPoolSize() >= this.maxSize) {
      if (this.enableStats) {
        this.stats.releasedDropped = this.stats.releasedDropped + 1;
      }
      return;
    }
    switch (node.type) {
      case "text":
        node.content = "";
        this.textPool.push(node);
        break;
      case "html-string":
        node.html = "";
        this.htmlStringPool.push(node);
        break;
      case "component":
        node.instance = void 0;
        this.componentPool.push(node);
        break;
      case "instruction":
        node.instruction = void 0;
        this.instructionPool.push(node);
        break;
    }
    if (this.enableStats) {
      this.stats.released = this.stats.released + 1;
    }
  }
  /**
   * Releases all nodes in an array back to the pool.
   * This is a convenience method for releasing multiple nodes at once.
   *
   * @param nodes - Array of nodes to release
   */
  releaseAll(nodes) {
    for (const node of nodes) {
      this.release(node);
    }
  }
  /**
   * Clears all typed sub-pools, discarding all cached nodes.
   * This can be useful if you want to free memory after a large render.
   */
  clear() {
    this.textPool.length = 0;
    this.htmlStringPool.length = 0;
    this.componentPool.length = 0;
    this.instructionPool.length = 0;
  }
  /**
   * Gets the current total number of nodes across all typed sub-pools.
   * Useful for monitoring pool usage and tuning maxSize.
   *
   * @returns Number of nodes currently available in the pool
   */
  size() {
    return this.totalPoolSize();
  }
  /**
   * Gets pool statistics for debugging.
   *
   * @returns Pool usage statistics including computed metrics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.totalPoolSize(),
      maxSize: this.maxSize,
      hitRate: this.stats.acquireFromPool + this.stats.acquireNew > 0 ? this.stats.acquireFromPool / (this.stats.acquireFromPool + this.stats.acquireNew) * 100 : 0
    };
  }
  /**
   * Resets pool statistics.
   */
  resetStats() {
    this.stats = {
      acquireFromPool: 0,
      acquireNew: 0,
      released: 0,
      releasedDropped: 0
    };
  }
}

class HTMLStringCache {
  cache = /* @__PURE__ */ new Map();
  maxSize;
  constructor(maxSize = 1e3) {
    this.maxSize = maxSize;
    this.warm(COMMON_HTML_PATTERNS);
  }
  /**
   * Get or create an HTMLString for the given content.
   * If cached, the existing object is returned and moved to end (most recently used).
   * If not cached, a new HTMLString is created, cached, and returned.
   *
   * @param content - The HTML string content
   * @returns HTMLString object (cached or newly created)
   */
  getOrCreate(content) {
    const cached = this.cache.get(content);
    if (cached) {
      this.cache.delete(content);
      this.cache.set(content, cached);
      return cached;
    }
    const htmlString = new HTMLString(content);
    this.cache.set(content, htmlString);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== void 0) {
        this.cache.delete(firstKey);
      }
    }
    return htmlString;
  }
  /**
   * Get current cache size
   */
  size() {
    return this.cache.size;
  }
  /**
   * Pre-warms the cache with common HTML patterns.
   * This ensures first-render cache hits for frequently used tags.
   *
   * @param patterns - Array of HTML strings to pre-cache
   */
  warm(patterns) {
    for (const pattern of patterns) {
      if (!this.cache.has(pattern)) {
        this.cache.set(pattern, new HTMLString(pattern));
      }
    }
  }
  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }
}
const COMMON_HTML_PATTERNS = [
  // Structural elements
  "<div>",
  "</div>",
  "<span>",
  "</span>",
  "<p>",
  "</p>",
  "<section>",
  "</section>",
  "<article>",
  "</article>",
  "<header>",
  "</header>",
  "<footer>",
  "</footer>",
  "<nav>",
  "</nav>",
  "<main>",
  "</main>",
  "<aside>",
  "</aside>",
  // List elements
  "<ul>",
  "</ul>",
  "<ol>",
  "</ol>",
  "<li>",
  "</li>",
  // Void/self-closing elements
  "<br>",
  "<hr>",
  "<br/>",
  "<hr/>",
  // Heading elements
  "<h1>",
  "</h1>",
  "<h2>",
  "</h2>",
  "<h3>",
  "</h3>",
  "<h4>",
  "</h4>",
  // Inline elements
  "<a>",
  "</a>",
  "<strong>",
  "</strong>",
  "<em>",
  "</em>",
  "<code>",
  "</code>",
  // Common whitespace
  " ",
  "\n"
];

class Pipeline {
  internalMiddleware;
  resolvedMiddleware = void 0;
  resolvedActions = void 0;
  resolvedSessionDriver = void 0;
  resolvedCacheProvider = void 0;
  compiledCacheRoutes = void 0;
  nodePool;
  htmlStringCache;
  logger;
  manifest;
  /**
   * "development" or "production" only
   */
  runtimeMode;
  renderers;
  resolve;
  streaming;
  /**
   * Used to provide better error messages for `Astro.clientAddress`
   */
  adapterName;
  clientDirectives;
  inlinedScripts;
  compressHTML;
  i18n;
  middleware;
  routeCache;
  /**
   * Used for `Astro.site`.
   */
  site;
  /**
   * Array of built-in, internal, routes.
   * Used to find the route module
   */
  defaultRoutes;
  actions;
  sessionDriver;
  cacheProvider;
  cacheConfig;
  serverIslands;
  constructor(logger, manifest, runtimeMode, renderers, resolve, streaming, adapterName = manifest.adapterName, clientDirectives = manifest.clientDirectives, inlinedScripts = manifest.inlinedScripts, compressHTML = manifest.compressHTML, i18n = manifest.i18n, middleware = manifest.middleware, routeCache = new RouteCache(logger, runtimeMode), site = manifest.site ? new URL(manifest.site) : void 0, defaultRoutes = createDefaultRoutes(manifest), actions = manifest.actions, sessionDriver = manifest.sessionDriver, cacheProvider = manifest.cacheProvider, cacheConfig = manifest.cacheConfig, serverIslands = manifest.serverIslandMappings) {
    this.logger = logger;
    this.manifest = manifest;
    this.runtimeMode = runtimeMode;
    this.renderers = renderers;
    this.resolve = resolve;
    this.streaming = streaming;
    this.adapterName = adapterName;
    this.clientDirectives = clientDirectives;
    this.inlinedScripts = inlinedScripts;
    this.compressHTML = compressHTML;
    this.i18n = i18n;
    this.middleware = middleware;
    this.routeCache = routeCache;
    this.site = site;
    this.defaultRoutes = defaultRoutes;
    this.actions = actions;
    this.sessionDriver = sessionDriver;
    this.cacheProvider = cacheProvider;
    this.cacheConfig = cacheConfig;
    this.serverIslands = serverIslands;
    this.internalMiddleware = [];
    if (i18n?.strategy !== "manual") {
      this.internalMiddleware.push(
        createI18nMiddleware(i18n, manifest.base, manifest.trailingSlash, manifest.buildFormat)
      );
    }
    if (manifest.experimentalQueuedRendering.enabled) {
      this.nodePool = this.createNodePool(
        manifest.experimentalQueuedRendering.poolSize ?? 1e3,
        false
      );
      if (manifest.experimentalQueuedRendering.contentCache) {
        this.htmlStringCache = this.createStringCache();
      }
    }
  }
  /**
   * Resolves the middleware from the manifest, and returns the `onRequest` function. If `onRequest` isn't there,
   * it returns a no-op function
   */
  async getMiddleware() {
    if (this.resolvedMiddleware) {
      return this.resolvedMiddleware;
    }
    if (this.middleware) {
      const middlewareInstance = await this.middleware();
      const onRequest = middlewareInstance.onRequest ?? NOOP_MIDDLEWARE_FN;
      const internalMiddlewares = [onRequest];
      if (this.manifest.checkOrigin) {
        internalMiddlewares.unshift(createOriginCheckMiddleware());
      }
      this.resolvedMiddleware = sequence(...internalMiddlewares);
      return this.resolvedMiddleware;
    } else {
      this.resolvedMiddleware = NOOP_MIDDLEWARE_FN;
      return this.resolvedMiddleware;
    }
  }
  /**
   * Clears the cached middleware so it is re-resolved on the next request.
   * Called via HMR when middleware files change during development.
   */
  clearMiddleware() {
    this.resolvedMiddleware = void 0;
  }
  async getActions() {
    if (this.resolvedActions) {
      return this.resolvedActions;
    } else if (this.actions) {
      return this.actions();
    }
    return NOOP_ACTIONS_MOD;
  }
  async getSessionDriver() {
    if (this.resolvedSessionDriver !== void 0) {
      return this.resolvedSessionDriver;
    }
    if (this.sessionDriver) {
      const driverModule = await this.sessionDriver();
      this.resolvedSessionDriver = driverModule?.default || null;
      return this.resolvedSessionDriver;
    }
    this.resolvedSessionDriver = null;
    return null;
  }
  async getCacheProvider() {
    if (this.resolvedCacheProvider !== void 0) {
      return this.resolvedCacheProvider;
    }
    if (this.cacheProvider) {
      const mod = await this.cacheProvider();
      const factory = mod?.default || null;
      this.resolvedCacheProvider = factory ? factory(this.cacheConfig?.options) : null;
      return this.resolvedCacheProvider;
    }
    this.resolvedCacheProvider = null;
    return null;
  }
  async getServerIslands() {
    if (this.serverIslands) {
      return this.serverIslands();
    }
    return {
      serverIslandMap: /* @__PURE__ */ new Map(),
      serverIslandNameMap: /* @__PURE__ */ new Map()
    };
  }
  async getAction(path) {
    const pathKeys = path.split(".").map((key) => decodeURIComponent(key));
    let { server } = await this.getActions();
    if (!server || !(typeof server === "object")) {
      throw new TypeError(
        `Expected \`server\` export in actions file to be an object. Received ${typeof server}.`
      );
    }
    for (const key of pathKeys) {
      if (!Object.hasOwn(server, key)) {
        throw new AstroError({
          ...ActionNotFoundError,
          message: ActionNotFoundError.message(pathKeys.join("."))
        });
      }
      server = server[key];
    }
    if (typeof server !== "function") {
      throw new TypeError(
        `Expected handler for action ${pathKeys.join(".")} to be a function. Received ${typeof server}.`
      );
    }
    return server;
  }
  async getModuleForRoute(route) {
    for (const defaultRoute of this.defaultRoutes) {
      if (route.component === defaultRoute.component) {
        return {
          page: () => Promise.resolve(defaultRoute.instance)
        };
      }
    }
    if (route.type === "redirect") {
      return RedirectSinglePageBuiltModule;
    } else {
      if (this.manifest.pageMap) {
        const importComponentInstance = this.manifest.pageMap.get(route.component);
        if (!importComponentInstance) {
          throw new Error(
            `Unexpectedly unable to find a component instance for route ${route.route}`
          );
        }
        return await importComponentInstance();
      } else if (this.manifest.pageModule) {
        return this.manifest.pageModule;
      }
      throw new Error(
        "Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error, please file an issue."
      );
    }
  }
  createNodePool(poolSize, stats) {
    return new NodePool(poolSize, stats);
  }
  createStringCache() {
    return new HTMLStringCache(1e3);
  }
}

function getFunctionExpression(slot) {
  if (!slot) return;
  const expressions = slot?.expressions?.filter((e) => isRenderInstruction(e) === false);
  if (expressions?.length !== 1) return;
  return expressions[0];
}
class Slots {
  #result;
  #slots;
  #logger;
  constructor(result, slots, logger) {
    this.#result = result;
    this.#slots = slots;
    this.#logger = logger;
    if (slots) {
      for (const key of Object.keys(slots)) {
        if (this[key] !== void 0) {
          throw new AstroError({
            ...ReservedSlotName,
            message: ReservedSlotName.message(key)
          });
        }
        Object.defineProperty(this, key, {
          get() {
            return true;
          },
          enumerable: true
        });
      }
    }
  }
  has(name) {
    if (!this.#slots) return false;
    return Boolean(this.#slots[name]);
  }
  async render(name, args = []) {
    if (!this.#slots || !this.has(name)) return;
    const result = this.#result;
    if (!Array.isArray(args)) {
      this.#logger.warn(
        null,
        `Expected second parameter to be an array, received a ${typeof args}. If you're trying to pass an array as a single argument and getting unexpected results, make sure you're passing your array as an item of an array. Ex: Astro.slots.render('default', [["Hello", "World"]])`
      );
    } else if (args.length > 0) {
      const slotValue = this.#slots[name];
      const component = typeof slotValue === "function" ? await slotValue(result) : await slotValue;
      const expression = getFunctionExpression(component);
      if (expression) {
        const slot = async () => typeof expression === "function" ? expression(...args) : expression;
        return await renderSlotToString(result, slot).then((res) => {
          return res;
        });
      }
      if (typeof component === "function") {
        return await renderJSX(result, component(...args)).then(
          (res) => res != null ? String(res) : res
        );
      }
    }
    const content = await renderSlotToString(result, this.#slots[name]);
    const outHTML = chunkToString(result, content);
    return outHTML;
  }
}

function isExternalURL(url) {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
}
function redirectIsExternal(redirect) {
  if (typeof redirect === "string") {
    return isExternalURL(redirect);
  } else {
    return isExternalURL(redirect.destination);
  }
}
function computeRedirectStatus(method, redirect, redirectRoute) {
  return redirectRoute && typeof redirect === "object" ? redirect.status : method === "GET" ? 301 : 308;
}
function resolveRedirectTarget(params, redirect, redirectRoute, trailingSlash) {
  if (typeof redirectRoute !== "undefined") {
    const generate = getRouteGenerator(redirectRoute.segments, trailingSlash);
    return generate(params);
  } else if (typeof redirect === "string") {
    if (redirectIsExternal(redirect)) {
      return redirect;
    } else {
      let target = redirect;
      for (const param of Object.keys(params)) {
        const paramValue = params[param];
        target = target.replace(`[${param}]`, paramValue).replace(`[...${param}]`, paramValue);
      }
      return target;
    }
  } else if (typeof redirect === "undefined") {
    return "/";
  }
  return redirect.destination;
}
async function renderRedirect(renderContext) {
  const {
    request: { method },
    routeData
  } = renderContext;
  const { redirect, redirectRoute } = routeData;
  const status = computeRedirectStatus(method, redirect, redirectRoute);
  const headers = {
    location: encodeURI(
      resolveRedirectTarget(
        renderContext.params,
        redirect,
        redirectRoute,
        renderContext.pipeline.manifest.trailingSlash
      )
    )
  };
  if (redirect && redirectIsExternal(redirect)) {
    if (typeof redirect === "string") {
      return Response.redirect(redirect, status);
    } else {
      return Response.redirect(redirect.destination, status);
    }
  }
  return new Response(null, { status, headers });
}

function matchRoute(pathname, manifest) {
  if (isRoute404(pathname)) {
    const errorRoute = manifest.routes.find((route) => isRoute404(route.route));
    if (errorRoute) return errorRoute;
  }
  if (isRoute500(pathname)) {
    const errorRoute = manifest.routes.find((route) => isRoute500(route.route));
    if (errorRoute) return errorRoute;
  }
  return manifest.routes.find((route) => {
    return route.pattern.test(pathname) || route.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
  });
}
function isRoute404or500(route) {
  return isRoute404(route.route) || isRoute500(route.route);
}
function isRouteServerIsland(route) {
  return route.component === SERVER_ISLAND_COMPONENT;
}
function isRouteExternalRedirect(route) {
  return !!(route.type === "redirect" && route.redirect && redirectIsExternal(route.redirect));
}

function defaultSetHeaders(options) {
  const headers = new Headers();
  const directives = [];
  if (options.maxAge !== void 0) {
    directives.push(`max-age=${options.maxAge}`);
  }
  if (options.swr !== void 0) {
    directives.push(`stale-while-revalidate=${options.swr}`);
  }
  if (directives.length > 0) {
    headers.set("CDN-Cache-Control", directives.join(", "));
  }
  if (options.tags && options.tags.length > 0) {
    headers.set("Cache-Tag", options.tags.join(", "));
  }
  if (options.lastModified) {
    headers.set("Last-Modified", options.lastModified.toUTCString());
  }
  if (options.etag) {
    headers.set("ETag", options.etag);
  }
  return headers;
}
function isLiveDataEntry(value) {
  return value != null && typeof value === "object" && "id" in value && "data" in value && "cacheHint" in value;
}

const APPLY_HEADERS = /* @__PURE__ */ Symbol.for("astro:cache:apply");
const IS_ACTIVE = /* @__PURE__ */ Symbol.for("astro:cache:active");
class AstroCache {
  #options = {};
  #tags = /* @__PURE__ */ new Set();
  #disabled = false;
  #provider;
  enabled = true;
  constructor(provider) {
    this.#provider = provider;
  }
  set(input) {
    if (input === false) {
      this.#disabled = true;
      this.#tags.clear();
      this.#options = {};
      return;
    }
    this.#disabled = false;
    let options;
    if (isLiveDataEntry(input)) {
      if (!input.cacheHint) return;
      options = input.cacheHint;
    } else {
      options = input;
    }
    if ("maxAge" in options && options.maxAge !== void 0) this.#options.maxAge = options.maxAge;
    if ("swr" in options && options.swr !== void 0)
      this.#options.swr = options.swr;
    if ("etag" in options && options.etag !== void 0)
      this.#options.etag = options.etag;
    if (options.lastModified !== void 0) {
      if (!this.#options.lastModified || options.lastModified > this.#options.lastModified) {
        this.#options.lastModified = options.lastModified;
      }
    }
    if (options.tags) {
      for (const tag of options.tags) this.#tags.add(tag);
    }
  }
  get tags() {
    return [...this.#tags];
  }
  /**
   * Get the current cache options (read-only snapshot).
   * Includes all accumulated options: maxAge, swr, tags, etag, lastModified.
   */
  get options() {
    return {
      ...this.#options,
      tags: this.tags
    };
  }
  async invalidate(input) {
    if (!this.#provider) {
      throw new AstroError(CacheNotEnabled);
    }
    let options;
    if (isLiveDataEntry(input)) {
      options = { tags: input.cacheHint?.tags ?? [] };
    } else {
      options = input;
    }
    return this.#provider.invalidate(options);
  }
  /** @internal */
  [APPLY_HEADERS](response) {
    if (this.#disabled) return;
    const finalOptions = { ...this.#options, tags: this.tags };
    if (finalOptions.maxAge === void 0 && !finalOptions.tags?.length) return;
    const headers = this.#provider?.setHeaders?.(finalOptions) ?? defaultSetHeaders(finalOptions);
    for (const [key, value] of headers) {
      response.headers.set(key, value);
    }
  }
  /** @internal */
  get [IS_ACTIVE]() {
    return !this.#disabled && (this.#options.maxAge !== void 0 || this.#tags.size > 0);
  }
}
function applyCacheHeaders(cache, response) {
  if (APPLY_HEADERS in cache) {
    cache[APPLY_HEADERS](response);
  }
}

const ROUTE_DYNAMIC_SPLIT = /\[(.+?\(.+?\)|.+?)\]/;
const ROUTE_SPREAD = /^\.{3}.+$/;
function getParts(part, file) {
  const result = [];
  part.split(ROUTE_DYNAMIC_SPLIT).map((str, i) => {
    if (!str) return;
    const dynamic = i % 2 === 1;
    const [, content] = dynamic ? /([^(]+)$/.exec(str) || [null, null] : [null, str];
    if (!content || dynamic && !/^(?:\.\.\.)?[\w$]+$/.test(content)) {
      throw new Error(`Invalid route ${file} \u2014 parameter name must match /^[a-zA-Z0-9_$]+$/`);
    }
    result.push({
      content,
      dynamic,
      spread: dynamic && ROUTE_SPREAD.test(content)
    });
  });
  return result;
}

function routeComparator(a, b) {
  const commonLength = Math.min(a.segments.length, b.segments.length);
  for (let index = 0; index < commonLength; index++) {
    const aSegment = a.segments[index];
    const bSegment = b.segments[index];
    const aIsStatic = aSegment.every((part) => !part.dynamic && !part.spread);
    const bIsStatic = bSegment.every((part) => !part.dynamic && !part.spread);
    if (aIsStatic && bIsStatic) {
      const aContent = aSegment.map((part) => part.content).join("");
      const bContent = bSegment.map((part) => part.content).join("");
      if (aContent !== bContent) {
        return aContent.localeCompare(bContent);
      }
    }
    if (aIsStatic !== bIsStatic) {
      return aIsStatic ? -1 : 1;
    }
    const aAllDynamic = aSegment.every((part) => part.dynamic);
    const bAllDynamic = bSegment.every((part) => part.dynamic);
    if (aAllDynamic !== bAllDynamic) {
      return aAllDynamic ? 1 : -1;
    }
    const aHasSpread = aSegment.some((part) => part.spread);
    const bHasSpread = bSegment.some((part) => part.spread);
    if (aHasSpread !== bHasSpread) {
      return aHasSpread ? 1 : -1;
    }
  }
  const aLength = a.segments.length;
  const bLength = b.segments.length;
  if (aLength !== bLength) {
    const aEndsInRest = a.segments.at(-1)?.some((part) => part.spread);
    const bEndsInRest = b.segments.at(-1)?.some((part) => part.spread);
    if (aEndsInRest !== bEndsInRest && Math.abs(aLength - bLength) === 1) {
      if (aLength > bLength && aEndsInRest) {
        return 1;
      }
      if (bLength > aLength && bEndsInRest) {
        return -1;
      }
    }
    return aLength > bLength ? -1 : 1;
  }
  if (a.type === "endpoint" !== (b.type === "endpoint")) {
    return a.type === "endpoint" ? -1 : 1;
  }
  return a.route.localeCompare(b.route);
}

function compileCacheRoutes(routes, base, trailingSlash) {
  const compiled = Object.entries(routes).map(([path, options]) => {
    const segments = removeLeadingForwardSlash(path).split("/").filter(Boolean).map((s) => getParts(s, path));
    const pattern = getPattern(segments, base, trailingSlash);
    return { pattern, options, segments, route: path };
  });
  compiled.sort(
    (a, b) => routeComparator(
      { segments: a.segments, route: a.route, type: "page" },
      { segments: b.segments, route: b.route, type: "page" }
    )
  );
  return compiled;
}
function matchCacheRoute(pathname, compiledRoutes) {
  for (const route of compiledRoutes) {
    if (route.pattern.test(pathname)) return route.options;
  }
  return null;
}

const PERSIST_SYMBOL = /* @__PURE__ */ Symbol();
const DEFAULT_COOKIE_NAME = "astro-session";
const VALID_COOKIE_REGEX = /^[\w-]+$/;
const unflatten = (parsed, _) => {
  return unflatten$1(parsed, {
    URL: (href) => new URL(href)
  });
};
const stringify = (data, _) => {
  return stringify$1(data, {
    // Support URL objects
    URL: (val) => val instanceof URL && val.href
  });
};
class AstroSession {
  // The cookies object.
  #cookies;
  // The session configuration.
  #config;
  // The cookie config
  #cookieConfig;
  // The cookie name
  #cookieName;
  // The unstorage object for the session driver.
  #storage;
  #data;
  // The session ID. A v4 UUID.
  #sessionID;
  // Sessions to destroy. Needed because we won't have the old session ID after it's destroyed locally.
  #toDestroy = /* @__PURE__ */ new Set();
  // Session keys to delete. Used for partial data sets to avoid overwriting the deleted value.
  #toDelete = /* @__PURE__ */ new Set();
  // Whether the session is dirty and needs to be saved.
  #dirty = false;
  // Whether the session cookie has been set.
  #cookieSet = false;
  // Whether the session ID was sourced from a client cookie rather than freshly generated.
  #sessionIDFromCookie = false;
  // The local data is "partial" if it has not been loaded from storage yet and only
  // contains values that have been set or deleted in-memory locally.
  // We do this to avoid the need to block on loading data when it is only being set.
  // When we load the data from storage, we need to merge it with the local partial data,
  // preserving in-memory changes and deletions.
  #partial = true;
  // The driver factory function provided by the pipeline
  #driverFactory;
  static #sharedStorage = /* @__PURE__ */ new Map();
  constructor({
    cookies,
    config,
    runtimeMode,
    driverFactory,
    mockStorage
  }) {
    if (!config) {
      throw new AstroError({
        ...SessionStorageInitError,
        message: SessionStorageInitError.message(
          "No driver was defined in the session configuration and the adapter did not provide a default driver."
        )
      });
    }
    this.#cookies = cookies;
    this.#driverFactory = driverFactory;
    const { cookie: cookieConfig = DEFAULT_COOKIE_NAME, ...configRest } = config;
    let cookieConfigObject;
    if (typeof cookieConfig === "object") {
      const { name = DEFAULT_COOKIE_NAME, ...rest } = cookieConfig;
      this.#cookieName = name;
      cookieConfigObject = rest;
    } else {
      this.#cookieName = cookieConfig || DEFAULT_COOKIE_NAME;
    }
    this.#cookieConfig = {
      sameSite: "lax",
      secure: runtimeMode === "production",
      path: "/",
      ...cookieConfigObject,
      httpOnly: true
    };
    this.#config = configRest;
    if (mockStorage) {
      this.#storage = mockStorage;
    }
  }
  /**
   * Gets a session value. Returns `undefined` if the session or value does not exist.
   */
  async get(key) {
    return (await this.#ensureData()).get(key)?.data;
  }
  /**
   * Checks if a session value exists.
   */
  async has(key) {
    return (await this.#ensureData()).has(key);
  }
  /**
   * Gets all session values.
   */
  async keys() {
    return (await this.#ensureData()).keys();
  }
  /**
   * Gets all session values.
   */
  async values() {
    return [...(await this.#ensureData()).values()].map((entry) => entry.data);
  }
  /**
   * Gets all session entries.
   */
  async entries() {
    return [...(await this.#ensureData()).entries()].map(([key, entry]) => [key, entry.data]);
  }
  /**
   * Deletes a session value.
   */
  delete(key) {
    this.#data?.delete(key);
    if (this.#partial) {
      this.#toDelete.add(key);
    }
    this.#dirty = true;
  }
  /**
   * Sets a session value. The session is created if it does not exist.
   */
  set(key, value, { ttl } = {}) {
    if (!key) {
      throw new AstroError({
        ...SessionStorageSaveError,
        message: "The session key was not provided."
      });
    }
    let cloned;
    try {
      cloned = unflatten(JSON.parse(stringify(value)));
    } catch (err) {
      throw new AstroError(
        {
          ...SessionStorageSaveError,
          message: `The session data for ${key} could not be serialized.`,
          hint: "See the devalue library for all supported types: https://github.com/rich-harris/devalue"
        },
        { cause: err }
      );
    }
    if (!this.#cookieSet) {
      this.#setCookie();
      this.#cookieSet = true;
    }
    this.#data ??= /* @__PURE__ */ new Map();
    const lifetime = ttl ?? this.#config.ttl;
    const expires = typeof lifetime === "number" ? Date.now() + lifetime * 1e3 : lifetime;
    this.#data.set(key, {
      data: cloned,
      expires
    });
    this.#dirty = true;
  }
  /**
   * Destroys the session, clearing the cookie and storage if it exists.
   */
  destroy() {
    const sessionId = this.#sessionID ?? this.#cookies.get(this.#cookieName)?.value;
    if (sessionId) {
      this.#toDestroy.add(sessionId);
    }
    this.#cookies.delete(this.#cookieName, this.#cookieConfig);
    this.#sessionID = void 0;
    this.#data = void 0;
    this.#dirty = true;
  }
  /**
   * Regenerates the session, creating a new session ID. The existing session data is preserved.
   */
  async regenerate() {
    let data = /* @__PURE__ */ new Map();
    try {
      data = await this.#ensureData();
    } catch (err) {
      console.error("Failed to load session data during regeneration:", err);
    }
    const oldSessionId = this.#sessionID;
    this.#sessionID = crypto.randomUUID();
    this.#sessionIDFromCookie = false;
    this.#data = data;
    this.#dirty = true;
    await this.#setCookie();
    if (oldSessionId && this.#storage) {
      this.#storage.removeItem(oldSessionId).catch((err) => {
        console.error("Failed to remove old session data:", err);
      });
    }
  }
  // Persists the session data to storage.
  // This is called automatically at the end of the request.
  // Uses a symbol to prevent users from calling it directly.
  async [PERSIST_SYMBOL]() {
    if (!this.#dirty && !this.#toDestroy.size) {
      return;
    }
    const storage = await this.#ensureStorage();
    if (this.#dirty && this.#data) {
      const data = await this.#ensureData();
      this.#toDelete.forEach((key2) => data.delete(key2));
      const key = this.#ensureSessionID();
      let serialized;
      try {
        serialized = stringify(data);
      } catch (err) {
        throw new AstroError(
          {
            ...SessionStorageSaveError,
            message: SessionStorageSaveError.message(
              "The session data could not be serialized.",
              this.#config.driver
            )
          },
          { cause: err }
        );
      }
      await storage.setItem(key, serialized);
      this.#dirty = false;
    }
    if (this.#toDestroy.size > 0) {
      const cleanupPromises = [...this.#toDestroy].map(
        (sessionId) => storage.removeItem(sessionId).catch((err) => {
          console.error(`Failed to clean up session ${sessionId}:`, err);
        })
      );
      await Promise.all(cleanupPromises);
      this.#toDestroy.clear();
    }
  }
  get sessionID() {
    return this.#sessionID;
  }
  /**
   * Loads a session from storage with the given ID, and replaces the current session.
   * Any changes made to the current session will be lost.
   * This is not normally needed, as the session is automatically loaded using the cookie.
   * However it can be used to restore a session where the ID has been recorded somewhere
   * else (e.g. in a database).
   */
  async load(sessionID) {
    this.#sessionID = sessionID;
    this.#data = void 0;
    await this.#setCookie();
    await this.#ensureData();
  }
  /**
   * Sets the session cookie.
   */
  async #setCookie() {
    if (!VALID_COOKIE_REGEX.test(this.#cookieName)) {
      throw new AstroError({
        ...SessionStorageSaveError,
        message: "Invalid cookie name. Cookie names can only contain letters, numbers, and dashes."
      });
    }
    const value = this.#ensureSessionID();
    this.#cookies.set(this.#cookieName, value, this.#cookieConfig);
  }
  /**
   * Attempts to load the session data from storage, or creates a new data object if none exists.
   * If there is existing partial data, it will be merged into the new data object.
   */
  async #ensureData() {
    const storage = await this.#ensureStorage();
    if (this.#data && !this.#partial) {
      return this.#data;
    }
    this.#data ??= /* @__PURE__ */ new Map();
    const raw = await storage.get(this.#ensureSessionID());
    if (!raw) {
      if (this.#sessionIDFromCookie) {
        this.#sessionID = crypto.randomUUID();
        this.#sessionIDFromCookie = false;
        if (this.#cookieSet) {
          await this.#setCookie();
        }
      }
      return this.#data;
    }
    try {
      const storedMap = unflatten(raw);
      if (!(storedMap instanceof Map)) {
        await this.destroy();
        throw new AstroError({
          ...SessionStorageInitError,
          message: SessionStorageInitError.message(
            "The session data was an invalid type.",
            this.#config.driver
          )
        });
      }
      const now = Date.now();
      for (const [key, value] of storedMap) {
        const expired = typeof value.expires === "number" && value.expires < now;
        if (!this.#data.has(key) && !this.#toDelete.has(key) && !expired) {
          this.#data.set(key, value);
        }
      }
      this.#partial = false;
      return this.#data;
    } catch (err) {
      await this.destroy();
      if (err instanceof AstroError) {
        throw err;
      }
      throw new AstroError(
        {
          ...SessionStorageInitError,
          message: SessionStorageInitError.message(
            "The session data could not be parsed.",
            this.#config.driver
          )
        },
        { cause: err }
      );
    }
  }
  /**
   * Returns the session ID, generating a new one if it does not exist.
   */
  #ensureSessionID() {
    if (!this.#sessionID) {
      const cookieValue = this.#cookies.get(this.#cookieName)?.value;
      if (cookieValue) {
        this.#sessionID = cookieValue;
        this.#sessionIDFromCookie = true;
      } else {
        this.#sessionID = crypto.randomUUID();
      }
    }
    return this.#sessionID;
  }
  /**
   * Ensures the storage is initialized.
   * This is called automatically when a storage operation is needed.
   */
  async #ensureStorage() {
    if (this.#storage) {
      return this.#storage;
    }
    if (AstroSession.#sharedStorage.has(this.#config.driver)) {
      this.#storage = AstroSession.#sharedStorage.get(this.#config.driver);
      return this.#storage;
    }
    if (!this.#driverFactory) {
      throw new AstroError({
        ...SessionStorageInitError,
        message: SessionStorageInitError.message(
          "Astro could not load the driver correctly. Does it exist?",
          this.#config.driver
        )
      });
    }
    const driver = this.#driverFactory;
    try {
      this.#storage = createStorage({
        driver: {
          ...driver(this.#config.options),
          // Unused methods
          hasItem() {
            return false;
          },
          getKeys() {
            return [];
          }
        }
      });
      AstroSession.#sharedStorage.set(this.#config.driver, this.#storage);
      return this.#storage;
    } catch (err) {
      throw new AstroError(
        {
          ...SessionStorageInitError,
          message: SessionStorageInitError.message("Unknown error", this.#config.driver)
        },
        { cause: err }
      );
    }
  }
}

function validateAndDecodePathname(pathname) {
  let decoded;
  try {
    decoded = decodeURI(pathname);
  } catch (_e) {
    throw new Error("Invalid URL encoding");
  }
  const hasDecoding = decoded !== pathname;
  const decodedStillHasEncoding = /%[0-9a-fA-F]{2}/.test(decoded);
  if (hasDecoding && decodedStillHasEncoding) {
    throw new Error("Multi-level URL encoding is not allowed");
  }
  return decoded;
}

class RenderContext {
  pipeline;
  locals;
  middleware;
  actions;
  serverIslands;
  // It must be a DECODED pathname
  pathname;
  request;
  routeData;
  status;
  clientAddress;
  cookies;
  params;
  url;
  props;
  partial;
  shouldInjectCspMetaTags;
  session;
  cache;
  skipMiddleware;
  constructor(pipeline, locals, middleware, actions, serverIslands, pathname, request, routeData, status, clientAddress, cookies = new AstroCookies(request), params = getParams(routeData, pathname), url = RenderContext.#createNormalizedUrl(request.url), props = {}, partial = void 0, shouldInjectCspMetaTags = pipeline.manifest.shouldInjectCspMetaTags, session = void 0, cache, skipMiddleware = false) {
    this.pipeline = pipeline;
    this.locals = locals;
    this.middleware = middleware;
    this.actions = actions;
    this.serverIslands = serverIslands;
    this.pathname = pathname;
    this.request = request;
    this.routeData = routeData;
    this.status = status;
    this.clientAddress = clientAddress;
    this.cookies = cookies;
    this.params = params;
    this.url = url;
    this.props = props;
    this.partial = partial;
    this.shouldInjectCspMetaTags = shouldInjectCspMetaTags;
    this.session = session;
    this.cache = cache;
    this.skipMiddleware = skipMiddleware;
  }
  static #createNormalizedUrl(requestUrl) {
    const url = new URL(requestUrl);
    try {
      url.pathname = validateAndDecodePathname(url.pathname);
    } catch {
      try {
        url.pathname = decodeURI(url.pathname);
      } catch {
      }
    }
    url.pathname = collapseDuplicateSlashes(url.pathname);
    return url;
  }
  /**
   * A flag that tells the render content if the rewriting was triggered
   */
  isRewriting = false;
  /**
   * A safety net in case of loops
   */
  counter = 0;
  result = void 0;
  static async create({
    locals = {},
    pathname,
    pipeline,
    request,
    routeData,
    clientAddress,
    status = 200,
    props,
    partial = void 0,
    shouldInjectCspMetaTags,
    skipMiddleware = false
  }) {
    const pipelineMiddleware = await pipeline.getMiddleware();
    const pipelineActions = await pipeline.getActions();
    const pipelineSessionDriver = await pipeline.getSessionDriver();
    const serverIslands = await pipeline.getServerIslands();
    setOriginPathname(
      request,
      pathname,
      pipeline.manifest.trailingSlash,
      pipeline.manifest.buildFormat
    );
    const cookies = new AstroCookies(request);
    const session = pipeline.manifest.sessionConfig && pipelineSessionDriver ? new AstroSession({
      cookies,
      config: pipeline.manifest.sessionConfig,
      runtimeMode: pipeline.runtimeMode,
      driverFactory: pipelineSessionDriver,
      mockStorage: null
    }) : void 0;
    let cache;
    if (!pipeline.cacheConfig) {
      cache = new DisabledAstroCache(pipeline.logger);
    } else if (pipeline.runtimeMode === "development") {
      cache = new NoopAstroCache();
    } else {
      const cacheProvider = await pipeline.getCacheProvider();
      cache = new AstroCache(cacheProvider);
      if (pipeline.cacheConfig?.routes) {
        if (!pipeline.compiledCacheRoutes) {
          pipeline.compiledCacheRoutes = compileCacheRoutes(
            pipeline.cacheConfig.routes,
            pipeline.manifest.base,
            pipeline.manifest.trailingSlash
          );
        }
        const matched = matchCacheRoute(pathname, pipeline.compiledCacheRoutes);
        if (matched) {
          cache.set(matched);
        }
      }
    }
    return new RenderContext(
      pipeline,
      locals,
      sequence(...pipeline.internalMiddleware, pipelineMiddleware),
      pipelineActions,
      serverIslands,
      pathname,
      request,
      routeData,
      status,
      clientAddress,
      cookies,
      void 0,
      void 0,
      props,
      partial,
      shouldInjectCspMetaTags ?? pipeline.manifest.shouldInjectCspMetaTags,
      session,
      cache,
      skipMiddleware
    );
  }
  /**
   * The main function of the RenderContext.
   *
   * Use this function to render any route known to Astro.
   * It attempts to render a route. A route can be a:
   *
   * - page
   * - redirect
   * - endpoint
   * - fallback
   */
  async render(componentInstance, slots = {}) {
    const { middleware, pipeline } = this;
    const { logger, streaming, manifest } = pipeline;
    const props = Object.keys(this.props).length > 0 ? this.props : await getProps({
      mod: componentInstance,
      routeData: this.routeData,
      routeCache: this.pipeline.routeCache,
      pathname: this.pathname,
      logger,
      serverLike: manifest.serverLike,
      base: manifest.base,
      trailingSlash: manifest.trailingSlash
    });
    const actionApiContext = this.createActionAPIContext();
    const apiContext = this.createAPIContext(props, actionApiContext);
    this.counter++;
    if (this.counter === 4) {
      return new Response("Loop Detected", {
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/508
        status: 508,
        statusText: "Astro detected a loop where you tried to call the rewriting logic more than four times."
      });
    }
    const lastNext = async (ctx, payload) => {
      if (payload) {
        const oldPathname = this.pathname;
        pipeline.logger.debug("router", "Called rewriting to:", payload);
        const {
          routeData,
          componentInstance: newComponent,
          pathname,
          newUrl
        } = await pipeline.tryRewrite(payload, this.request);
        if (this.pipeline.manifest.serverLike === true && this.routeData.prerender === false && routeData.prerender === true) {
          throw new AstroError({
            ...ForbiddenRewrite,
            message: ForbiddenRewrite.message(this.pathname, pathname, routeData.component),
            hint: ForbiddenRewrite.hint(routeData.component)
          });
        }
        this.routeData = routeData;
        componentInstance = newComponent;
        if (payload instanceof Request) {
          this.request = payload;
        } else {
          this.request = copyRequest(
            newUrl,
            this.request,
            // need to send the flag of the previous routeData
            routeData.prerender,
            this.pipeline.logger,
            this.routeData.route
          );
        }
        this.isRewriting = true;
        this.url = RenderContext.#createNormalizedUrl(this.request.url);
        this.params = getParams(routeData, pathname);
        this.pathname = pathname;
        this.status = 200;
        setOriginPathname(
          this.request,
          oldPathname,
          this.pipeline.manifest.trailingSlash,
          this.pipeline.manifest.buildFormat
        );
      }
      let response2;
      if (!ctx.isPrerendered && !this.skipMiddleware) {
        const { action, setActionResult, serializeActionResult } = getActionContext(ctx);
        if (action?.calledFrom === "form") {
          const actionResult = await action.handler();
          setActionResult(action.name, serializeActionResult(actionResult));
        }
      }
      switch (this.routeData.type) {
        case "endpoint": {
          response2 = await renderEndpoint(
            componentInstance,
            ctx,
            this.routeData.prerender,
            logger
          );
          break;
        }
        case "redirect":
          return renderRedirect(this);
        case "page": {
          this.result = await this.createResult(componentInstance, actionApiContext);
          try {
            response2 = await renderPage(
              this.result,
              componentInstance?.default,
              props,
              slots,
              streaming,
              this.routeData
            );
          } catch (e) {
            this.result.cancelled = true;
            throw e;
          }
          response2.headers.set(ROUTE_TYPE_HEADER, "page");
          if (this.routeData.route === "/404" || this.routeData.route === "/500") {
            response2.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
          }
          if (this.isRewriting) {
            response2.headers.set(REWRITE_DIRECTIVE_HEADER_KEY, REWRITE_DIRECTIVE_HEADER_VALUE);
          }
          break;
        }
        case "fallback": {
          return new Response(null, { status: 500, headers: { [ROUTE_TYPE_HEADER]: "fallback" } });
        }
      }
      const responseCookies = getCookiesFromResponse(response2);
      if (responseCookies) {
        this.cookies.merge(responseCookies);
      }
      return response2;
    };
    if (isRouteExternalRedirect(this.routeData)) {
      return renderRedirect(this);
    }
    const response = this.skipMiddleware ? await lastNext(apiContext) : await callMiddleware(middleware, apiContext, lastNext);
    if (response.headers.get(ROUTE_TYPE_HEADER)) {
      response.headers.delete(ROUTE_TYPE_HEADER);
    }
    attachCookiesToResponse(response, this.cookies);
    return response;
  }
  createAPIContext(props, context) {
    const redirect = (path, status = 302) => new Response(null, { status, headers: { Location: path } });
    const rewrite = async (reroutePayload) => {
      return await this.#executeRewrite(reroutePayload);
    };
    Reflect.set(context, pipelineSymbol, this.pipeline);
    return Object.assign(context, {
      props,
      redirect,
      rewrite,
      getActionResult: createGetActionResult(context.locals),
      callAction: createCallAction(context)
    });
  }
  async #executeRewrite(reroutePayload) {
    this.pipeline.logger.debug("router", "Calling rewrite: ", reroutePayload);
    const oldPathname = this.pathname;
    const { routeData, componentInstance, newUrl, pathname } = await this.pipeline.tryRewrite(
      reroutePayload,
      this.request
    );
    const isI18nFallback = routeData.fallbackRoutes && routeData.fallbackRoutes.length > 0;
    if (this.pipeline.manifest.serverLike && !this.routeData.prerender && routeData.prerender && !isI18nFallback) {
      throw new AstroError({
        ...ForbiddenRewrite,
        message: ForbiddenRewrite.message(this.pathname, pathname, routeData.component),
        hint: ForbiddenRewrite.hint(routeData.component)
      });
    }
    this.routeData = routeData;
    if (reroutePayload instanceof Request) {
      this.request = reroutePayload;
    } else {
      this.request = copyRequest(
        newUrl,
        this.request,
        // need to send the flag of the previous routeData
        routeData.prerender,
        this.pipeline.logger,
        this.routeData.route
      );
    }
    this.url = RenderContext.#createNormalizedUrl(this.request.url);
    const newCookies = new AstroCookies(this.request);
    if (this.cookies) {
      newCookies.merge(this.cookies);
    }
    this.cookies = newCookies;
    this.params = getParams(routeData, pathname);
    this.pathname = pathname;
    this.isRewriting = true;
    this.status = 200;
    setOriginPathname(
      this.request,
      oldPathname,
      this.pipeline.manifest.trailingSlash,
      this.pipeline.manifest.buildFormat
    );
    return await this.render(componentInstance);
  }
  createActionAPIContext() {
    const renderContext = this;
    const { params, pipeline, url } = this;
    return {
      // Don't allow reassignment of cookies because it doesn't work
      get cookies() {
        return renderContext.cookies;
      },
      routePattern: this.routeData.route,
      isPrerendered: this.routeData.prerender,
      get clientAddress() {
        return renderContext.getClientAddress();
      },
      get currentLocale() {
        return renderContext.computeCurrentLocale();
      },
      generator: ASTRO_GENERATOR,
      get locals() {
        return renderContext.locals;
      },
      set locals(_) {
        throw new AstroError(LocalsReassigned);
      },
      params,
      get preferredLocale() {
        return renderContext.computePreferredLocale();
      },
      get preferredLocaleList() {
        return renderContext.computePreferredLocaleList();
      },
      request: this.request,
      site: pipeline.site,
      url,
      get originPathname() {
        return getOriginPathname(renderContext.request);
      },
      get session() {
        if (this.isPrerendered) {
          pipeline.logger.warn(
            "session",
            `context.session was used when rendering the route ${colors.green(this.routePattern)}, but it is not available on prerendered routes. If you need access to sessions, make sure that the route is server-rendered using \`export const prerender = false;\` or by setting \`output\` to \`"server"\` in your Astro config to make all your routes server-rendered by default. For more information, see https://docs.astro.build/en/guides/sessions/`
          );
          return void 0;
        }
        if (!renderContext.session) {
          pipeline.logger.warn(
            "session",
            `context.session was used when rendering the route ${colors.green(this.routePattern)}, but no storage configuration was provided. Either configure the storage manually or use an adapter that provides session storage. For more information, see https://docs.astro.build/en/guides/sessions/`
          );
          return void 0;
        }
        return renderContext.session;
      },
      get cache() {
        return renderContext.cache;
      },
      get csp() {
        if (!pipeline.manifest.csp) {
          if (pipeline.runtimeMode === "production") {
            pipeline.logger.warn(
              "csp",
              `context.csp was used when rendering the route ${colors.green(this.routePattern)}, but CSP was not configured. For more information, see https://docs.astro.build/en/reference/experimental-flags/csp/`
            );
          }
          return void 0;
        }
        return {
          insertDirective(payload) {
            if (renderContext?.result?.directives) {
              renderContext.result.directives = pushDirective(
                renderContext.result.directives,
                payload
              );
            } else {
              renderContext?.result?.directives.push(payload);
            }
          },
          insertScriptResource(resource) {
            renderContext.result?.scriptResources.push(resource);
          },
          insertStyleResource(resource) {
            renderContext.result?.styleResources.push(resource);
          },
          insertStyleHash(hash) {
            renderContext.result?.styleHashes.push(hash);
          },
          insertScriptHash(hash) {
            renderContext.result?.scriptHashes.push(hash);
          }
        };
      }
    };
  }
  async createResult(mod, ctx) {
    const { cookies, pathname, pipeline, routeData, status } = this;
    const { clientDirectives, inlinedScripts, compressHTML, manifest, renderers, resolve } = pipeline;
    const { links, scripts, styles } = await pipeline.headElements(routeData);
    const extraStyleHashes = [];
    const extraScriptHashes = [];
    const shouldInjectCspMetaTags = this.shouldInjectCspMetaTags;
    const cspAlgorithm = manifest.csp?.algorithm ?? "SHA-256";
    if (shouldInjectCspMetaTags) {
      for (const style of styles) {
        extraStyleHashes.push(await generateCspDigest(style.children, cspAlgorithm));
      }
      for (const script of scripts) {
        extraScriptHashes.push(await generateCspDigest(script.children, cspAlgorithm));
      }
    }
    const componentMetadata = await pipeline.componentMetadata(routeData) ?? manifest.componentMetadata;
    const headers = new Headers({ "Content-Type": "text/html" });
    const partial = typeof this.partial === "boolean" ? this.partial : Boolean(mod.partial);
    const actionResult = hasActionPayload(this.locals) ? deserializeActionResult(this.locals._actionPayload.actionResult) : void 0;
    const response = {
      status: actionResult?.error ? actionResult?.error.status : status,
      statusText: actionResult?.error ? actionResult?.error.type : "OK",
      get headers() {
        return headers;
      },
      // Disallow `Astro.response.headers = new Headers`
      set headers(_) {
        throw new AstroError(AstroResponseHeadersReassigned);
      }
    };
    const result = {
      base: manifest.base,
      userAssetsBase: manifest.userAssetsBase,
      cancelled: false,
      clientDirectives,
      inlinedScripts,
      componentMetadata,
      compressHTML,
      cookies,
      /** This function returns the `Astro` faux-global */
      createAstro: (props, slots) => this.createAstro(result, props, slots, ctx),
      links,
      params: this.params,
      partial,
      pathname,
      renderers,
      resolve,
      response,
      request: this.request,
      scripts,
      styles,
      actionResult,
      serverIslandNameMap: this.serverIslands.serverIslandNameMap ?? /* @__PURE__ */ new Map(),
      key: manifest.key,
      trailingSlash: manifest.trailingSlash,
      _experimentalQueuedRendering: {
        pool: pipeline.nodePool,
        htmlStringCache: pipeline.htmlStringCache,
        enabled: manifest.experimentalQueuedRendering?.enabled,
        poolSize: manifest.experimentalQueuedRendering?.poolSize,
        contentCache: manifest.experimentalQueuedRendering?.contentCache
      },
      _metadata: {
        hasHydrationScript: false,
        rendererSpecificHydrationScripts: /* @__PURE__ */ new Set(),
        hasRenderedHead: false,
        renderedScripts: /* @__PURE__ */ new Set(),
        hasDirectives: /* @__PURE__ */ new Set(),
        hasRenderedServerIslandRuntime: false,
        headInTree: false,
        extraHead: [],
        extraStyleHashes,
        extraScriptHashes,
        propagators: /* @__PURE__ */ new Set()
      },
      cspDestination: manifest.csp?.cspDestination ?? (routeData.prerender ? "meta" : "header"),
      shouldInjectCspMetaTags,
      cspAlgorithm,
      // The following arrays must be cloned; otherwise, they become mutable across routes.
      scriptHashes: manifest.csp?.scriptHashes ? [...manifest.csp.scriptHashes] : [],
      scriptResources: manifest.csp?.scriptResources ? [...manifest.csp.scriptResources] : [],
      styleHashes: manifest.csp?.styleHashes ? [...manifest.csp.styleHashes] : [],
      styleResources: manifest.csp?.styleResources ? [...manifest.csp.styleResources] : [],
      directives: manifest.csp?.directives ? [...manifest.csp.directives] : [],
      isStrictDynamic: manifest.csp?.isStrictDynamic ?? false,
      internalFetchHeaders: manifest.internalFetchHeaders
    };
    return result;
  }
  #astroPagePartial;
  /**
   * The Astro global is sourced in 3 different phases:
   * - **Static**: `.generator` and `.glob` is printed by the compiler, instantiated once per process per astro file
   * - **Page-level**: `.request`, `.cookies`, `.locals` etc. These remain the same for the duration of the request.
   * - **Component-level**: `.props`, `.slots`, and `.self` are unique to each _use_ of each component.
   *
   * The page level partial is used as the prototype of the user-visible `Astro` global object, which is instantiated once per use of a component.
   */
  createAstro(result, props, slotValues, apiContext) {
    let astroPagePartial;
    if (this.isRewriting) {
      astroPagePartial = this.#astroPagePartial = this.createAstroPagePartial(result, apiContext);
    } else {
      astroPagePartial = this.#astroPagePartial ??= this.createAstroPagePartial(result, apiContext);
    }
    const astroComponentPartial = { props, self: null };
    const Astro = Object.assign(
      Object.create(astroPagePartial),
      astroComponentPartial
    );
    let _slots;
    Object.defineProperty(Astro, "slots", {
      get: () => {
        if (!_slots) {
          _slots = new Slots(
            result,
            slotValues,
            this.pipeline.logger
          );
        }
        return _slots;
      }
    });
    return Astro;
  }
  createAstroPagePartial(result, apiContext) {
    const renderContext = this;
    const { cookies, locals, params, pipeline, url } = this;
    const { response } = result;
    const redirect = (path, status = 302) => {
      if (this.request[responseSentSymbol$1]) {
        throw new AstroError({
          ...ResponseSentError
        });
      }
      return new Response(null, { status, headers: { Location: path } });
    };
    const rewrite = async (reroutePayload) => {
      return await this.#executeRewrite(reroutePayload);
    };
    const callAction = createCallAction(apiContext);
    return {
      generator: ASTRO_GENERATOR,
      routePattern: this.routeData.route,
      isPrerendered: this.routeData.prerender,
      cookies,
      get session() {
        if (this.isPrerendered) {
          pipeline.logger.warn(
            "session",
            `Astro.session was used when rendering the route ${colors.green(this.routePattern)}, but it is not available on prerendered pages. If you need access to sessions, make sure that the page is server-rendered using \`export const prerender = false;\` or by setting \`output\` to \`"server"\` in your Astro config to make all your pages server-rendered by default. For more information, see https://docs.astro.build/en/guides/sessions/`
          );
          return void 0;
        }
        if (!renderContext.session) {
          pipeline.logger.warn(
            "session",
            `Astro.session was used when rendering the route ${colors.green(this.routePattern)}, but no storage configuration was provided. Either configure the storage manually or use an adapter that provides session storage. For more information, see https://docs.astro.build/en/guides/sessions/`
          );
          return void 0;
        }
        return renderContext.session;
      },
      get cache() {
        return renderContext.cache;
      },
      get clientAddress() {
        return renderContext.getClientAddress();
      },
      get currentLocale() {
        return renderContext.computeCurrentLocale();
      },
      params,
      get preferredLocale() {
        return renderContext.computePreferredLocale();
      },
      get preferredLocaleList() {
        return renderContext.computePreferredLocaleList();
      },
      locals,
      redirect,
      rewrite,
      request: this.request,
      response,
      site: pipeline.site,
      getActionResult: createGetActionResult(locals),
      get callAction() {
        return callAction;
      },
      url,
      get originPathname() {
        return getOriginPathname(renderContext.request);
      },
      get csp() {
        if (!pipeline.manifest.csp) {
          if (pipeline.runtimeMode === "production") {
            pipeline.logger.warn(
              "csp",
              `Astro.csp was used when rendering the route ${colors.green(this.routePattern)}, but CSP was not configured. For more information, see https://docs.astro.build/en/reference/experimental-flags/csp/`
            );
          }
          return void 0;
        }
        return {
          insertDirective(payload) {
            if (renderContext?.result?.directives) {
              renderContext.result.directives = pushDirective(
                renderContext.result.directives,
                payload
              );
            } else {
              renderContext?.result?.directives.push(payload);
            }
          },
          insertScriptResource(resource) {
            renderContext.result?.scriptResources.push(resource);
          },
          insertStyleResource(resource) {
            renderContext.result?.styleResources.push(resource);
          },
          insertStyleHash(hash) {
            renderContext.result?.styleHashes.push(hash);
          },
          insertScriptHash(hash) {
            renderContext.result?.scriptHashes.push(hash);
          }
        };
      }
    };
  }
  getClientAddress() {
    const { pipeline, routeData, clientAddress } = this;
    if (routeData.prerender) {
      throw new AstroError({
        ...PrerenderClientAddressNotAvailable,
        message: PrerenderClientAddressNotAvailable.message(routeData.component)
      });
    }
    if (clientAddress) {
      return clientAddress;
    }
    if (pipeline.adapterName) {
      throw new AstroError({
        ...ClientAddressNotAvailable,
        message: ClientAddressNotAvailable.message(pipeline.adapterName)
      });
    }
    throw new AstroError(StaticClientAddressNotAvailable);
  }
  /**
   * API Context may be created multiple times per request, i18n data needs to be computed only once.
   * So, it is computed and saved here on creation of the first APIContext and reused for later ones.
   */
  #currentLocale;
  computeCurrentLocale() {
    const {
      url,
      pipeline: { i18n },
      routeData
    } = this;
    if (!i18n) return;
    const { defaultLocale, locales, strategy } = i18n;
    const fallbackTo = strategy === "pathname-prefix-other-locales" || strategy === "domains-prefix-other-locales" ? defaultLocale : void 0;
    if (this.#currentLocale) {
      return this.#currentLocale;
    }
    let computedLocale;
    if (isRouteServerIsland(routeData)) {
      let referer = this.request.headers.get("referer");
      if (referer) {
        if (URL.canParse(referer)) {
          referer = new URL(referer).pathname;
        }
        computedLocale = computeCurrentLocale(referer, locales, defaultLocale);
      }
    } else {
      let pathname = routeData.pathname;
      if (!routeData.pattern.test(url.pathname)) {
        for (const fallbackRoute of routeData.fallbackRoutes) {
          if (fallbackRoute.pattern.test(url.pathname)) {
            pathname = fallbackRoute.pathname;
            break;
          }
        }
      }
      pathname = pathname && !isRoute404or500(routeData) ? pathname : url.pathname;
      computedLocale = computeCurrentLocale(pathname, locales, defaultLocale);
      if (routeData.params.length > 0) {
        const localeFromParams = computeCurrentLocaleFromParams(this.params, locales);
        if (localeFromParams) {
          computedLocale = localeFromParams;
        }
      }
    }
    this.#currentLocale = computedLocale ?? fallbackTo;
    return this.#currentLocale;
  }
  #preferredLocale;
  computePreferredLocale() {
    const {
      pipeline: { i18n },
      request
    } = this;
    if (!i18n) return;
    return this.#preferredLocale ??= computePreferredLocale(request, i18n.locales);
  }
  #preferredLocaleList;
  computePreferredLocaleList() {
    const {
      pipeline: { i18n },
      request
    } = this;
    if (!i18n) return;
    return this.#preferredLocaleList ??= computePreferredLocaleList(request, i18n.locales);
  }
}

function redirectTemplate({
  status,
  absoluteLocation,
  relativeLocation,
  from
}) {
  const delay = status === 302 ? 2 : 0;
  return `<!doctype html>
<title>Redirecting to: ${relativeLocation}</title>
<meta http-equiv="refresh" content="${delay};url=${relativeLocation}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${absoluteLocation}">
<body>
	<a href="${relativeLocation}">Redirecting ${from ? `from <code>${from}</code> ` : ""}to <code>${relativeLocation}</code></a>
</body>`;
}

function ensure404Route(manifest) {
  if (!manifest.routes.some((route) => route.route === "/404")) {
    manifest.routes.push(DEFAULT_404_ROUTE);
  }
  return manifest;
}

class Router {
  #routes;
  #base;
  #baseWithoutTrailingSlash;
  #buildFormat;
  #trailingSlash;
  constructor(routes, options) {
    this.#routes = [...routes].sort(routeComparator);
    this.#base = normalizeBase(options.base);
    this.#baseWithoutTrailingSlash = removeTrailingForwardSlash(this.#base);
    this.#buildFormat = options.buildFormat;
    this.#trailingSlash = options.trailingSlash;
  }
  /**
   * Match an input pathname against the route list.
   * If allowWithoutBase is true, a non-base-prefixed path is still considered.
   */
  match(inputPathname, { allowWithoutBase = false } = {}) {
    const normalized = getRedirectForPathname(inputPathname);
    if (normalized.redirect) {
      return { type: "redirect", location: normalized.redirect, status: 301 };
    }
    if (this.#base !== "/") {
      const baseWithSlash = `${this.#baseWithoutTrailingSlash}/`;
      if (this.#trailingSlash === "always" && (normalized.pathname === this.#baseWithoutTrailingSlash || normalized.pathname === this.#base)) {
        return { type: "redirect", location: baseWithSlash, status: 301 };
      }
      if (this.#trailingSlash === "never" && normalized.pathname === baseWithSlash) {
        return { type: "redirect", location: this.#baseWithoutTrailingSlash, status: 301 };
      }
    }
    const baseResult = stripBase(
      normalized.pathname,
      this.#base,
      this.#baseWithoutTrailingSlash,
      this.#trailingSlash
    );
    if (!baseResult) {
      if (!allowWithoutBase) {
        return { type: "none", reason: "outside-base" };
      }
    }
    let pathname = baseResult ?? normalized.pathname;
    if (this.#buildFormat === "file") {
      pathname = normalizeFileFormatPathname(pathname);
    }
    const route = this.#routes.find((candidate) => {
      if (candidate.pattern.test(pathname)) return true;
      return candidate.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
    });
    if (!route) {
      return { type: "none", reason: "no-match" };
    }
    const params = getParams(route, pathname);
    return { type: "match", route, params, pathname };
  }
}
function normalizeBase(base) {
  if (!base) return "/";
  if (base === "/") return base;
  return prependForwardSlash$1(base);
}
function getRedirectForPathname(pathname) {
  let value = prependForwardSlash$1(pathname);
  if (value.startsWith("//")) {
    const collapsed = `/${value.replace(/^\/+/, "")}`;
    return { pathname: value, redirect: collapsed };
  }
  return { pathname: value };
}
function stripBase(pathname, base, baseWithoutTrailingSlash, trailingSlash) {
  if (base === "/") return pathname;
  const baseWithSlash = `${baseWithoutTrailingSlash}/`;
  if (pathname === baseWithoutTrailingSlash || pathname === base) {
    return trailingSlash === "always" ? null : "/";
  }
  if (pathname === baseWithSlash) {
    return trailingSlash === "never" ? null : "/";
  }
  if (pathname.startsWith(baseWithSlash)) {
    return pathname.slice(baseWithoutTrailingSlash.length);
  }
  return null;
}
function normalizeFileFormatPathname(pathname) {
  if (pathname.endsWith("/index.html")) {
    const trimmed = pathname.slice(0, -"/index.html".length);
    return trimmed === "" ? "/" : trimmed;
  }
  if (pathname.endsWith(".html")) {
    const trimmed = pathname.slice(0, -".html".length);
    return trimmed === "" ? "/" : trimmed;
  }
  return pathname;
}

class BaseApp {
  manifest;
  manifestData;
  pipeline;
  adapterLogger;
  baseWithoutTrailingSlash;
  logger;
  #router;
  constructor(manifest, streaming = true, ...args) {
    this.manifest = manifest;
    this.manifestData = { routes: manifest.routes.map((route) => route.routeData) };
    this.baseWithoutTrailingSlash = removeTrailingForwardSlash(manifest.base);
    this.pipeline = this.createPipeline(streaming, manifest, ...args);
    this.logger = new Logger({
      dest: consoleLogDestination,
      level: manifest.logLevel
    });
    this.adapterLogger = new AstroIntegrationLogger(this.logger.options, manifest.adapterName);
    ensure404Route(this.manifestData);
    this.#router = this.createRouter(this.manifestData);
  }
  async createRenderContext(payload) {
    return RenderContext.create(payload);
  }
  getAdapterLogger() {
    return this.adapterLogger;
  }
  getAllowedDomains() {
    return this.manifest.allowedDomains;
  }
  matchesAllowedDomains(forwardedHost, protocol) {
    return BaseApp.validateForwardedHost(forwardedHost, this.manifest.allowedDomains, protocol);
  }
  static validateForwardedHost(forwardedHost, allowedDomains, protocol) {
    if (!allowedDomains || allowedDomains.length === 0) {
      return false;
    }
    try {
      const testUrl = new URL(`${protocol || "https"}://${forwardedHost}`);
      return allowedDomains.some((pattern) => {
        return matchPattern(testUrl, pattern);
      });
    } catch {
      return false;
    }
  }
  set setManifestData(newManifestData) {
    this.manifestData = newManifestData;
    this.#router = this.createRouter(this.manifestData);
  }
  removeBase(pathname) {
    pathname = collapseDuplicateLeadingSlashes(pathname);
    if (pathname.startsWith(this.manifest.base)) {
      return pathname.slice(this.baseWithoutTrailingSlash.length + 1);
    }
    return pathname;
  }
  /**
   * It removes the base from the request URL, prepends it with a forward slash and attempts to decoded it.
   *
   * If the decoding fails, it logs the error and return the pathname as is.
   * @param request
   */
  getPathnameFromRequest(request) {
    const url = new URL(request.url);
    const pathname = prependForwardSlash$1(this.removeBase(url.pathname));
    try {
      return decodeURI(pathname);
    } catch (e) {
      this.getAdapterLogger().error(e.toString());
      return pathname;
    }
  }
  /**
   * Given a `Request`, it returns the `RouteData` that matches its `pathname`. By default, prerendered
   * routes aren't returned, even if they are matched.
   *
   * When `allowPrerenderedRoutes` is `true`, the function returns matched prerendered routes too.
   * @param request
   * @param allowPrerenderedRoutes
   */
  match(request, allowPrerenderedRoutes = false) {
    const url = new URL(request.url);
    if (this.manifest.assets.has(url.pathname)) return void 0;
    let pathname = this.computePathnameFromDomain(request);
    if (!pathname) {
      pathname = prependForwardSlash$1(this.removeBase(url.pathname));
    }
    const match = this.#router.match(decodeURI(pathname), { allowWithoutBase: true });
    if (match.type !== "match") return void 0;
    const routeData = match.route;
    if (allowPrerenderedRoutes) {
      return routeData;
    } else if (routeData.prerender) {
      return void 0;
    }
    return routeData;
  }
  createRouter(manifestData) {
    return new Router(manifestData.routes, {
      base: this.manifest.base,
      trailingSlash: this.manifest.trailingSlash,
      buildFormat: this.manifest.buildFormat
    });
  }
  /**
   * A matching route function to use in the development server.
   * Contrary to the `.match` function, this function resolves props and params, returning the correct
   * route based on the priority, segments. It also returns the correct, resolved pathname.
   * @param pathname
   */
  devMatch(pathname) {
    return void 0;
  }
  computePathnameFromDomain(request) {
    let pathname = void 0;
    const url = new URL(request.url);
    if (this.manifest.i18n && (this.manifest.i18n.strategy === "domains-prefix-always" || this.manifest.i18n.strategy === "domains-prefix-other-locales" || this.manifest.i18n.strategy === "domains-prefix-always-no-redirect")) {
      let host = request.headers.get("X-Forwarded-Host");
      let protocol = request.headers.get("X-Forwarded-Proto");
      if (protocol) {
        protocol = protocol + ":";
      } else {
        protocol = url.protocol;
      }
      if (!host) {
        host = request.headers.get("Host");
      }
      if (host && protocol) {
        host = host.split(":")[0];
        try {
          let locale;
          const hostAsUrl = new URL(`${protocol}//${host}`);
          for (const [domainKey, localeValue] of Object.entries(
            this.manifest.i18n.domainLookupTable
          )) {
            const domainKeyAsUrl = new URL(domainKey);
            if (hostAsUrl.host === domainKeyAsUrl.host && hostAsUrl.protocol === domainKeyAsUrl.protocol) {
              locale = localeValue;
              break;
            }
          }
          if (locale) {
            pathname = prependForwardSlash$1(
              joinPaths(normalizeTheLocale(locale), this.removeBase(url.pathname))
            );
            if (url.pathname.endsWith("/")) {
              pathname = appendForwardSlash(pathname);
            }
          }
        } catch (e) {
          this.logger.error(
            "router",
            `Astro tried to parse ${protocol}//${host} as an URL, but it threw a parsing error. Check the X-Forwarded-Host and X-Forwarded-Proto headers.`
          );
          this.logger.error("router", `Error: ${e}`);
        }
      }
    }
    return pathname;
  }
  redirectTrailingSlash(pathname) {
    const { trailingSlash } = this.manifest;
    if (pathname === "/" || isInternalPath(pathname)) {
      return pathname;
    }
    const path = collapseDuplicateTrailingSlashes(pathname, trailingSlash !== "never");
    if (path !== pathname) {
      return path;
    }
    if (trailingSlash === "ignore") {
      return pathname;
    }
    if (trailingSlash === "always" && !hasFileExtension(pathname)) {
      return appendForwardSlash(pathname);
    }
    if (trailingSlash === "never") {
      return removeTrailingForwardSlash(pathname);
    }
    return pathname;
  }
  async render(request, {
    addCookieHeader = false,
    clientAddress = Reflect.get(request, clientAddressSymbol),
    locals,
    prerenderedErrorPageFetch = fetch,
    routeData
  } = {}) {
    const timeStart = performance.now();
    const url = new URL(request.url);
    const redirect = this.redirectTrailingSlash(url.pathname);
    if (redirect !== url.pathname) {
      const status = request.method === "GET" ? 301 : 308;
      const response2 = new Response(
        redirectTemplate({
          status,
          relativeLocation: url.pathname,
          absoluteLocation: redirect,
          from: request.url
        }),
        {
          status,
          headers: {
            location: redirect + url.search
          }
        }
      );
      this.#prepareResponse(response2, { addCookieHeader });
      return response2;
    }
    if (routeData) {
      this.logger.debug(
        "router",
        "The adapter " + this.manifest.adapterName + " provided a custom RouteData for ",
        request.url
      );
      this.logger.debug("router", "RouteData");
      this.logger.debug("router", routeData);
    }
    const resolvedRenderOptions = {
      addCookieHeader,
      clientAddress,
      prerenderedErrorPageFetch,
      locals,
      routeData
    };
    if (locals) {
      if (typeof locals !== "object") {
        const error = new AstroError(LocalsNotAnObject);
        this.logger.error(null, error.stack);
        return this.renderError(request, {
          ...resolvedRenderOptions,
          // If locals are invalid, we don't want to include them when
          // rendering the error page
          locals: void 0,
          status: 500,
          error
        });
      }
    }
    if (!routeData) {
      if (this.isDev()) {
        const result = await this.devMatch(this.getPathnameFromRequest(request));
        if (result) {
          routeData = result.routeData;
        }
      } else {
        routeData = this.match(request);
      }
      this.logger.debug("router", "Astro matched the following route for " + request.url);
      this.logger.debug("router", "RouteData:\n" + routeData);
    }
    if (!routeData) {
      routeData = this.manifestData.routes.find(
        (route) => route.component === "404.astro" || route.component === DEFAULT_404_COMPONENT
      );
    }
    if (!routeData) {
      this.logger.debug("router", "Astro hasn't found routes that match " + request.url);
      this.logger.debug("router", "Here's the available routes:\n", this.manifestData);
      return this.renderError(request, {
        ...resolvedRenderOptions,
        status: 404
      });
    }
    let pathname = this.getPathnameFromRequest(request);
    if (this.isDev() && !routeHasHtmlExtension(routeData)) {
      pathname = pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    }
    const defaultStatus = this.getDefaultStatusCode(routeData, pathname);
    let response;
    let session;
    let cache;
    try {
      const componentInstance = await this.pipeline.getComponentByRoute(routeData);
      const renderContext = await this.createRenderContext({
        pipeline: this.pipeline,
        locals,
        pathname,
        request,
        routeData,
        status: defaultStatus,
        clientAddress
      });
      session = renderContext.session;
      cache = renderContext.cache;
      if (this.pipeline.cacheProvider) {
        const cacheProvider = await this.pipeline.getCacheProvider();
        if (cacheProvider?.onRequest) {
          response = await cacheProvider.onRequest(
            {
              request,
              url: new URL(request.url)
            },
            async () => {
              const res = await renderContext.render(componentInstance);
              applyCacheHeaders(cache, res);
              return res;
            }
          );
          response.headers.delete("CDN-Cache-Control");
          response.headers.delete("Cache-Tag");
        } else {
          response = await renderContext.render(componentInstance);
          applyCacheHeaders(cache, response);
        }
      } else {
        response = await renderContext.render(componentInstance);
      }
      const isRewrite = response.headers.has(REWRITE_DIRECTIVE_HEADER_KEY);
      this.logThisRequest({
        pathname,
        method: request.method,
        statusCode: response.status,
        isRewrite,
        timeStart
      });
    } catch (err) {
      this.logger.error(null, err.stack || err.message || String(err));
      return this.renderError(request, {
        ...resolvedRenderOptions,
        status: 500,
        error: err
      });
    } finally {
      await session?.[PERSIST_SYMBOL]();
    }
    if (REROUTABLE_STATUS_CODES.includes(response.status) && // If the body isn't null, that means the user sets the 404 status
    // but uses the current route to handle the 404
    response.body === null && response.headers.get(REROUTE_DIRECTIVE_HEADER) !== "no") {
      return this.renderError(request, {
        ...resolvedRenderOptions,
        response,
        status: response.status,
        // We don't have an error to report here. Passing null means we pass nothing intentionally
        // while undefined means there's no error
        error: response.status === 500 ? null : void 0
      });
    }
    this.#prepareResponse(response, { addCookieHeader });
    return response;
  }
  #prepareResponse(response, { addCookieHeader }) {
    for (const headerName of [
      REROUTE_DIRECTIVE_HEADER,
      REWRITE_DIRECTIVE_HEADER_KEY,
      NOOP_MIDDLEWARE_HEADER,
      ROUTE_TYPE_HEADER
    ]) {
      if (response.headers.has(headerName)) {
        response.headers.delete(headerName);
      }
    }
    if (addCookieHeader) {
      for (const setCookieHeaderValue of getSetCookiesFromResponse(response)) {
        response.headers.append("set-cookie", setCookieHeaderValue);
      }
    }
    Reflect.set(response, responseSentSymbol$1, true);
  }
  setCookieHeaders(response) {
    return getSetCookiesFromResponse(response);
  }
  /**
   * Reads all the cookies written by `Astro.cookie.set()` onto the passed response.
   * For example,
   * ```ts
   * for (const cookie_ of App.getSetCookieFromResponse(response)) {
   *     const cookie: string = cookie_
   * }
   * ```
   * @param response The response to read cookies from.
   * @returns An iterator that yields key-value pairs as equal-sign-separated strings.
   */
  static getSetCookieFromResponse = getSetCookiesFromResponse;
  /**
   * If it is a known error code, try sending the according page (e.g. 404.astro / 500.astro).
   * This also handles pre-rendered /404 or /500 routes
   */
  async renderError(request, {
    status,
    response: originalResponse,
    skipMiddleware = false,
    error,
    ...resolvedRenderOptions
  }) {
    const errorRoutePath = `/${status}${this.manifest.trailingSlash === "always" ? "/" : ""}`;
    const errorRouteData = matchRoute(errorRoutePath, this.manifestData);
    const url = new URL(request.url);
    if (errorRouteData) {
      if (errorRouteData.prerender) {
        const maybeDotHtml = errorRouteData.route.endsWith(`/${status}`) ? ".html" : "";
        const statusURL = new URL(`${this.baseWithoutTrailingSlash}/${status}${maybeDotHtml}`, url);
        if (statusURL.toString() !== request.url && resolvedRenderOptions.prerenderedErrorPageFetch) {
          const response2 = await resolvedRenderOptions.prerenderedErrorPageFetch(
            statusURL.toString()
          );
          const override = { status, removeContentEncodingHeaders: true };
          const newResponse = this.mergeResponses(response2, originalResponse, override);
          this.#prepareResponse(newResponse, resolvedRenderOptions);
          return newResponse;
        }
      }
      const mod = await this.pipeline.getComponentByRoute(errorRouteData);
      let session;
      try {
        const renderContext = await this.createRenderContext({
          locals: resolvedRenderOptions.locals,
          pipeline: this.pipeline,
          skipMiddleware,
          pathname: this.getPathnameFromRequest(request),
          request,
          routeData: errorRouteData,
          status,
          props: { error },
          clientAddress: resolvedRenderOptions.clientAddress
        });
        session = renderContext.session;
        const response2 = await renderContext.render(mod);
        const newResponse = this.mergeResponses(response2, originalResponse);
        this.#prepareResponse(newResponse, resolvedRenderOptions);
        return newResponse;
      } catch {
        if (skipMiddleware === false) {
          return this.renderError(request, {
            ...resolvedRenderOptions,
            status,
            response: originalResponse,
            skipMiddleware: true
          });
        }
      } finally {
        await session?.[PERSIST_SYMBOL]();
      }
    }
    const response = this.mergeResponses(new Response(null, { status }), originalResponse);
    this.#prepareResponse(response, resolvedRenderOptions);
    return response;
  }
  mergeResponses(newResponse, originalResponse, override) {
    let newResponseHeaders = newResponse.headers;
    if (override?.removeContentEncodingHeaders) {
      newResponseHeaders = new Headers(newResponseHeaders);
      newResponseHeaders.delete("Content-Encoding");
      newResponseHeaders.delete("Content-Length");
    }
    if (!originalResponse) {
      if (override !== void 0) {
        return new Response(newResponse.body, {
          status: override.status,
          statusText: newResponse.statusText,
          headers: newResponseHeaders
        });
      }
      return newResponse;
    }
    const status = override?.status ? override.status : originalResponse.status === 200 ? newResponse.status : originalResponse.status;
    try {
      originalResponse.headers.delete("Content-type");
      originalResponse.headers.delete("Content-Length");
      originalResponse.headers.delete("Transfer-Encoding");
    } catch {
    }
    const newHeaders = new Headers();
    const seen = /* @__PURE__ */ new Set();
    for (const [name, value] of originalResponse.headers) {
      newHeaders.append(name, value);
      seen.add(name.toLowerCase());
    }
    for (const [name, value] of newResponseHeaders) {
      if (!seen.has(name.toLowerCase())) {
        newHeaders.append(name, value);
      }
    }
    const mergedResponse = new Response(newResponse.body, {
      status,
      statusText: status === 200 ? newResponse.statusText : originalResponse.statusText,
      // If you're looking at here for possible bugs, it means that it's not a bug.
      // With the middleware, users can meddle with headers, and we should pass to the 404/500.
      // If users see something weird, it's because they are setting some headers they should not.
      //
      // Although, we don't want it to replace the content-type, because the error page must return `text/html`
      headers: newHeaders
    });
    const originalCookies = getCookiesFromResponse(originalResponse);
    const newCookies = getCookiesFromResponse(newResponse);
    if (originalCookies) {
      if (newCookies) {
        for (const cookieValue of AstroCookies.consume(newCookies)) {
          originalResponse.headers.append("set-cookie", cookieValue);
        }
      }
      attachCookiesToResponse(mergedResponse, originalCookies);
    } else if (newCookies) {
      attachCookiesToResponse(mergedResponse, newCookies);
    }
    return mergedResponse;
  }
  getDefaultStatusCode(routeData, pathname) {
    if (!routeData.pattern.test(pathname)) {
      for (const fallbackRoute of routeData.fallbackRoutes) {
        if (fallbackRoute.pattern.test(pathname)) {
          return 302;
        }
      }
    }
    const route = removeTrailingForwardSlash(routeData.route);
    if (route.endsWith("/404")) return 404;
    if (route.endsWith("/500")) return 500;
    return 200;
  }
  getManifest() {
    return this.pipeline.manifest;
  }
  logThisRequest({
    pathname,
    method,
    statusCode,
    isRewrite,
    timeStart
  }) {
    const timeEnd = performance.now();
    this.logRequest({
      pathname,
      method,
      statusCode,
      isRewrite,
      reqTime: timeEnd - timeStart
    });
  }
}

function getAssetsPrefix(fileExtension, assetsPrefix) {
  let prefix = "";
  if (!assetsPrefix) {
    prefix = "";
  } else if (typeof assetsPrefix === "string") {
    prefix = assetsPrefix;
  } else {
    const dotLessFileExtension = fileExtension.slice(1);
    prefix = assetsPrefix[dotLessFileExtension] || assetsPrefix.fallback;
  }
  return prefix;
}

const URL_PARSE_BASE = "https://astro.build";
function splitAssetPath(path) {
  const parsed = new URL(path, URL_PARSE_BASE);
  const isAbsolute = URL.canParse(path);
  const pathname = !isAbsolute && !path.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
  return {
    pathname,
    suffix: `${parsed.search}${parsed.hash}`
  };
}
function createAssetLink(href, base, assetsPrefix, queryParams) {
  const { pathname, suffix } = splitAssetPath(href);
  let url = "";
  if (assetsPrefix) {
    const pf = getAssetsPrefix(fileExtension(pathname), assetsPrefix);
    url = joinPaths(pf, slash(pathname)) + suffix;
  } else if (base) {
    url = prependForwardSlash$1(joinPaths(base, slash(pathname))) + suffix;
  } else {
    url = href;
  }
  return url;
}
function createStylesheetElement(stylesheet, base, assetsPrefix, queryParams) {
  if (stylesheet.type === "inline") {
    return {
      props: {},
      children: stylesheet.content
    };
  } else {
    return {
      props: {
        rel: "stylesheet",
        href: createAssetLink(stylesheet.src, base, assetsPrefix)
      },
      children: ""
    };
  }
}
function createStylesheetElementSet(stylesheets, base, assetsPrefix, queryParams) {
  return new Set(
    stylesheets.map((s) => createStylesheetElement(s, base, assetsPrefix))
  );
}
function createModuleScriptElement(script, base, assetsPrefix, queryParams) {
  if (script.type === "external") {
    return createModuleScriptElementWithSrc(script.value, base, assetsPrefix);
  } else {
    return {
      props: {
        type: "module"
      },
      children: script.value
    };
  }
}
function createModuleScriptElementWithSrc(src, base, assetsPrefix, queryParams) {
  return {
    props: {
      type: "module",
      src: createAssetLink(src, base, assetsPrefix)
    },
    children: ""
  };
}

function createConsoleLogger(level) {
  return new Logger({
    dest: consoleLogDestination,
    level: level ?? "info"
  });
}

class AppPipeline extends Pipeline {
  getName() {
    return "AppPipeline";
  }
  static create({ manifest, streaming }) {
    const resolve = async function resolve2(specifier) {
      if (!(specifier in manifest.entryModules)) {
        throw new Error(`Unable to resolve [${specifier}]`);
      }
      const bundlePath = manifest.entryModules[specifier];
      if (bundlePath.startsWith("data:") || bundlePath.length === 0) {
        return bundlePath;
      } else {
        return createAssetLink(bundlePath, manifest.base, manifest.assetsPrefix);
      }
    };
    const logger = createConsoleLogger(manifest.logLevel);
    const pipeline = new AppPipeline(
      logger,
      manifest,
      "production",
      manifest.renderers,
      resolve,
      streaming,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0
    );
    return pipeline;
  }
  async headElements(routeData) {
    const { assetsPrefix, base } = this.manifest;
    const routeInfo = this.manifest.routes.find(
      (route) => route.routeData.route === routeData.route
    );
    const links = /* @__PURE__ */ new Set();
    const scripts = /* @__PURE__ */ new Set();
    const styles = createStylesheetElementSet(routeInfo?.styles ?? [], base, assetsPrefix);
    for (const script of routeInfo?.scripts ?? []) {
      if ("stage" in script) {
        if (script.stage === "head-inline") {
          scripts.add({
            props: {},
            children: script.children
          });
        }
      } else {
        scripts.add(createModuleScriptElement(script, base, assetsPrefix));
      }
    }
    return { links, styles, scripts };
  }
  componentMetadata() {
  }
  async getComponentByRoute(routeData) {
    const module = await this.getModuleForRoute(routeData);
    return module.page();
  }
  async getModuleForRoute(route) {
    for (const defaultRoute of this.defaultRoutes) {
      if (route.component === defaultRoute.component) {
        return {
          page: () => Promise.resolve(defaultRoute.instance)
        };
      }
    }
    let routeToProcess = route;
    if (routeIsRedirect(route)) {
      if (route.redirectRoute) {
        routeToProcess = route.redirectRoute;
      } else {
        return RedirectSinglePageBuiltModule;
      }
    } else if (routeIsFallback(route)) {
      routeToProcess = getFallbackRoute(route, this.manifest.routes);
    }
    if (this.manifest.pageMap) {
      const importComponentInstance = this.manifest.pageMap.get(routeToProcess.component);
      if (!importComponentInstance) {
        throw new Error(
          `Unexpectedly unable to find a component instance for route ${route.route}`
        );
      }
      return await importComponentInstance();
    } else if (this.manifest.pageModule) {
      return this.manifest.pageModule;
    }
    throw new Error(
      "Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error, please file an issue."
    );
  }
  async tryRewrite(payload, request) {
    const { newUrl, pathname, routeData } = findRouteToRewrite({
      payload,
      request,
      routes: this.manifest?.routes.map((r) => r.routeData),
      trailingSlash: this.manifest.trailingSlash,
      buildFormat: this.manifest.buildFormat,
      base: this.manifest.base,
      outDir: this.manifest?.serverLike ? this.manifest.buildClientDir : this.manifest.outDir
    });
    const componentInstance = await this.getComponentByRoute(routeData);
    return { newUrl, pathname, componentInstance, routeData };
  }
}

class App extends BaseApp {
  createPipeline(streaming) {
    return AppPipeline.create({
      manifest: this.manifest,
      streaming
    });
  }
  isDev() {
    return false;
  }
  // Should we log something for our users?
  logRequest(_options) {
  }
}

const renderers = [];

const serializedData = [{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","distURL":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/_image","component":"node_modules/astro/dist/assets/endpoint/node.js","params":[],"pathname":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"type":"endpoint","prerender":false,"fallbackRoutes":[],"distURL":[],"isIndex":false,"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/admin/gallery","isIndex":false,"type":"page","pattern":"^\\/admin\\/gallery\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gallery","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gallery.astro","pathname":"/admin/gallery","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/admin/gbp-callback","isIndex":false,"type":"page","pattern":"^\\/admin\\/gbp-callback\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gbp-callback","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gbp-callback.astro","pathname":"/admin/gbp-callback","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/admin/gbp-posts","isIndex":false,"type":"page","pattern":"^\\/admin\\/gbp-posts\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gbp-posts","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gbp-posts.astro","pathname":"/admin/gbp-posts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/admin/gbp-setup","isIndex":false,"type":"page","pattern":"^\\/admin\\/gbp-setup\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gbp-setup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gbp-setup.astro","pathname":"/admin/gbp-setup","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/admin/hero","isIndex":false,"type":"page","pattern":"^\\/admin\\/hero\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"hero","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/hero.astro","pathname":"/admin/hero","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/admin/gallery-upload","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/admin\\/gallery-upload\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gallery-upload","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/admin/gallery-upload.ts","pathname":"/api/admin/gallery-upload","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/admin/hero-upload","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/admin\\/hero-upload\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"admin","dynamic":false,"spread":false}],[{"content":"hero-upload","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/admin/hero-upload.ts","pathname":"/api/admin/hero-upload","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ask","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ask\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ask","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ask.ts","pathname":"/api/ask","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ask-test-mama","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ask-test-mama\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ask-test-mama","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ask-test-mama.ts","pathname":"/api/ask-test-mama","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/clicks","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/clicks\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"clicks","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/clicks.ts","pathname":"/api/clicks","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/gbp-auth","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/gbp-auth\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"gbp-auth","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/gbp-auth.ts","pathname":"/api/gbp-auth","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/gbp-post","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/gbp-post\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"gbp-post","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/gbp-post.ts","pathname":"/api/gbp-post","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/lead","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/lead\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"lead","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/lead.ts","pathname":"/api/lead","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/photo","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/photo\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"photo","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/photo.ts","pathname":"/api/photo","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/validate-test","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/validate-test\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"validate-test","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/validate-test.ts","pathname":"/api/validate-test","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}];
				serializedData.map(deserializeRouteInfo);

const _page0 = () => import('./node_BLpKs6ib.mjs').then(n => n.n);
const _page1 = () => import('./gallery_LCUh_jku.mjs');
const _page2 = () => import('./gbp-callback_DfRaPf33.mjs');
const _page3 = () => import('./gbp-posts_DlXhBBmt.mjs');
const _page4 = () => import('./gbp-setup_C7M9TPpz.mjs');
const _page5 = () => import('./hero_BiC4ZyX4.mjs');
const _page6 = () => import('./gallery-upload_bWTueLTY.mjs');
const _page7 = () => import('./hero-upload_B4ipWg0L.mjs');
const _page8 = () => import('./ask_BP0jMWjQ.mjs');
const _page9 = () => import('./ask-test-mama_BF0-mdMu.mjs');
const _page10 = () => import('./clicks_CXOCTel0.mjs');
const _page11 = () => import('./gbp-auth_BI0C9nnF.mjs');
const _page12 = () => import('./gbp-post_Cq21RXrx.mjs');
const _page13 = () => import('./lead_CWUPBWAs.mjs');
const _page14 = () => import('./photo_CNRgKsYP.mjs');
const _page15 = () => import('./validate-test_Chz-FJH6.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["src/pages/admin/gallery.astro", _page1],
    ["src/pages/admin/gbp-callback.astro", _page2],
    ["src/pages/admin/gbp-posts.astro", _page3],
    ["src/pages/admin/gbp-setup.astro", _page4],
    ["src/pages/admin/hero.astro", _page5],
    ["src/pages/api/admin/gallery-upload.ts", _page6],
    ["src/pages/api/admin/hero-upload.ts", _page7],
    ["src/pages/api/ask.ts", _page8],
    ["src/pages/api/ask-test-mama.ts", _page9],
    ["src/pages/api/clicks.ts", _page10],
    ["src/pages/api/gbp-auth.ts", _page11],
    ["src/pages/api/gbp-post.ts", _page12],
    ["src/pages/api/lead.ts", _page13],
    ["src/pages/api/photo.ts", _page14],
    ["src/pages/api/validate-test.ts", _page15]
]);

const _manifest = deserializeManifest(({"rootDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/","cacheDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/node_modules/.astro/","outDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/dist/","srcDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/src/","publicDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/public/","buildClientDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/dist/client/","buildServerDir":"file:///Users/vladimirafanasev/Aidacamp-cloude/dist/server/","adapterName":"@astrojs/node","assetsDir":"_astro","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","distURL":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/_image","component":"node_modules/astro/dist/assets/endpoint/node.js","params":[],"pathname":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"type":"endpoint","prerender":false,"fallbackRoutes":[],"distURL":[],"isIndex":false,"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/3d-modelirovanie-lager","isIndex":false,"type":"page","pattern":"^\\/3d-modelirovanie-lager\\/?$","segments":[[{"content":"3d-modelirovanie-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/3d-modelirovanie-lager.astro","pathname":"/3d-modelirovanie-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":"[data-astro-cid-n5ll6ix5]{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f5f5f5;color:#1e293b;padding:24px}h1[data-astro-cid-n5ll6ix5]{font-size:22px;font-weight:700;margin-bottom:6px}.subtitle[data-astro-cid-n5ll6ix5]{font-size:14px;color:#64748b;margin-bottom:24px}.subtitle[data-astro-cid-n5ll6ix5] span[data-astro-cid-n5ll6ix5]{font-weight:600}.grid[data-astro-cid-n5ll6ix5]{display:flex;flex-direction:column;gap:8px}.row[data-astro-cid-n5ll6ix5]{display:grid;grid-template-columns:96px 1fr 180px;gap:12px;align-items:center;background:#fff;border-radius:12px;padding:10px 14px;box-shadow:0 1px 3px #00000012}.thumb-wrap[data-astro-cid-n5ll6ix5]{width:96px;height:64px;border-radius:6px;overflow:hidden;background:#e2e8f0;flex-shrink:0}.thumb-wrap[data-astro-cid-n5ll6ix5] img[data-astro-cid-n5ll6ix5]{width:100%;height:100%;object-fit:cover;display:block}.info[data-astro-cid-n5ll6ix5]{min-width:0}.fname[data-astro-cid-n5ll6ix5]{font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.res[data-astro-cid-n5ll6ix5]{font-size:12px;color:#64748b;margin-top:2px}.badge[data-astro-cid-n5ll6ix5]{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;margin-top:4px}.badge-good[data-astro-cid-n5ll6ix5]{background:#dcfce7;color:#15803d}.badge-ok[data-astro-cid-n5ll6ix5]{background:#fef9c3;color:#92400e}.badge-bad[data-astro-cid-n5ll6ix5]{background:#fee2e2;color:#b91c1c}.dropzone[data-astro-cid-n5ll6ix5]{border:2px dashed #cbd5e1;border-radius:10px;padding:10px 12px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;position:relative;min-height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.dropzone[data-astro-cid-n5ll6ix5]:hover,.dropzone[data-astro-cid-n5ll6ix5].drag-over{border-color:#f97316;background:#fff7ed}.dropzone[data-astro-cid-n5ll6ix5].success{border-color:#22c55e;background:#f0fdf4}.dropzone[data-astro-cid-n5ll6ix5].error{border-color:#ef4444;background:#fef2f2}.dropzone[data-astro-cid-n5ll6ix5] input[data-astro-cid-n5ll6ix5][type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}.dz-icon[data-astro-cid-n5ll6ix5]{font-size:20px;line-height:1}.dz-text[data-astro-cid-n5ll6ix5]{font-size:11px;color:#64748b;line-height:1.3}.dz-status[data-astro-cid-n5ll6ix5]{font-size:12px;font-weight:600;display:none}.dropzone[data-astro-cid-n5ll6ix5].loading .dz-status[data-astro-cid-n5ll6ix5]{display:block;color:#f97316}.dropzone[data-astro-cid-n5ll6ix5].success .dz-status[data-astro-cid-n5ll6ix5]{display:block;color:#16a34a}.dropzone[data-astro-cid-n5ll6ix5].error .dz-status[data-astro-cid-n5ll6ix5]{display:block;color:#dc2626}.dropzone[data-astro-cid-n5ll6ix5].loading .dz-text[data-astro-cid-n5ll6ix5],.dropzone[data-astro-cid-n5ll6ix5].success .dz-text[data-astro-cid-n5ll6ix5],.dropzone[data-astro-cid-n5ll6ix5].error .dz-text[data-astro-cid-n5ll6ix5],.dropzone[data-astro-cid-n5ll6ix5].loading .dz-icon[data-astro-cid-n5ll6ix5],.dropzone[data-astro-cid-n5ll6ix5].success .dz-icon[data-astro-cid-n5ll6ix5],.dropzone[data-astro-cid-n5ll6ix5].error .dz-icon[data-astro-cid-n5ll6ix5]{display:none}progress[data-astro-cid-n5ll6ix5]{width:100%;height:4px;border-radius:2px;accent-color:#f97316;display:none}.dropzone[data-astro-cid-n5ll6ix5].loading progress[data-astro-cid-n5ll6ix5]{display:block}\n"}],"routeData":{"route":"/admin/gallery","isIndex":false,"type":"page","pattern":"^\\/admin\\/gallery\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gallery","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gallery.astro","pathname":"/admin/gallery","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":"body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.box[data-astro-cid-y7q6xun7]{background:#1e293b;border-radius:16px;padding:32px;max-width:420px;text-align:center}h1[data-astro-cid-y7q6xun7]{font-size:20px;margin-bottom:12px}p[data-astro-cid-y7q6xun7]{font-size:14px;color:#94a3b8;margin-bottom:20px;word-break:break-word}.ok[data-astro-cid-y7q6xun7]{color:#86efac}.err[data-astro-cid-y7q6xun7]{color:#fca5a5}a[data-astro-cid-y7q6xun7]{display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:600;font-size:14px}\n"}],"routeData":{"route":"/admin/gbp-callback","isIndex":false,"type":"page","pattern":"^\\/admin\\/gbp-callback\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gbp-callback","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gbp-callback.astro","pathname":"/admin/gbp-callback","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/gbp-posts@_@astro.D1JutIqG.css"}],"routeData":{"route":"/admin/gbp-posts","isIndex":false,"type":"page","pattern":"^\\/admin\\/gbp-posts\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gbp-posts","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gbp-posts.astro","pathname":"/admin/gbp-posts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/gbp-setup@_@astro.CZqguJrh.css"}],"routeData":{"route":"/admin/gbp-setup","isIndex":false,"type":"page","pattern":"^\\/admin\\/gbp-setup\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gbp-setup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/gbp-setup.astro","pathname":"/admin/gbp-setup","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":"[data-astro-cid-m3f2qoqu]{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f5f5f5;color:#1e293b;padding:24px}h1[data-astro-cid-m3f2qoqu]{font-size:22px;font-weight:700;margin-bottom:6px}.subtitle[data-astro-cid-m3f2qoqu]{font-size:14px;color:#64748b;margin-bottom:24px}.grid[data-astro-cid-m3f2qoqu]{display:flex;flex-direction:column;gap:8px}.row[data-astro-cid-m3f2qoqu]{display:grid;grid-template-columns:160px 1fr 200px;gap:14px;align-items:center;background:#fff;border-radius:12px;padding:12px 16px;box-shadow:0 1px 3px #00000012}.preview[data-astro-cid-m3f2qoqu]{width:160px;height:90px;border-radius:8px;overflow:hidden;background:#e2e8f0;position:relative;flex-shrink:0}.preview[data-astro-cid-m3f2qoqu] img[data-astro-cid-m3f2qoqu]{width:100%;height:100%;object-fit:cover;display:block}.preview[data-astro-cid-m3f2qoqu] .empty[data-astro-cid-m3f2qoqu]{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;color:#94a3b8}.info[data-astro-cid-m3f2qoqu]{min-width:0}.page-title[data-astro-cid-m3f2qoqu]{font-size:13px;font-weight:600;color:#0f172a;line-height:1.4;margin-bottom:4px}.page-url[data-astro-cid-m3f2qoqu]{font-size:11px;color:#64748b}.page-url[data-astro-cid-m3f2qoqu] a[data-astro-cid-m3f2qoqu]{color:#3b82f6;text-decoration:none}.page-url[data-astro-cid-m3f2qoqu] a[data-astro-cid-m3f2qoqu]:hover{text-decoration:underline}.badge[data-astro-cid-m3f2qoqu]{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;margin-top:6px}.badge-good[data-astro-cid-m3f2qoqu]{background:#dcfce7;color:#15803d}.badge-bad[data-astro-cid-m3f2qoqu]{background:#fee2e2;color:#b91c1c}.dropzone[data-astro-cid-m3f2qoqu]{border:2px dashed #cbd5e1;border-radius:10px;padding:10px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;position:relative;min-height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.dropzone[data-astro-cid-m3f2qoqu]:hover,.dropzone[data-astro-cid-m3f2qoqu].drag-over{border-color:#f97316;background:#fff7ed}.dropzone[data-astro-cid-m3f2qoqu].success{border-color:#22c55e;background:#f0fdf4}.dropzone[data-astro-cid-m3f2qoqu].error{border-color:#ef4444;background:#fef2f2}.dropzone[data-astro-cid-m3f2qoqu] input[data-astro-cid-m3f2qoqu][type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}.dz-icon[data-astro-cid-m3f2qoqu]{font-size:20px}.dz-text[data-astro-cid-m3f2qoqu]{font-size:11px;color:#64748b}.dz-status[data-astro-cid-m3f2qoqu]{font-size:12px;font-weight:600;display:none}.dropzone[data-astro-cid-m3f2qoqu].loading .dz-status[data-astro-cid-m3f2qoqu]{display:block;color:#f97316}.dropzone[data-astro-cid-m3f2qoqu].success .dz-status[data-astro-cid-m3f2qoqu]{display:block;color:#16a34a}.dropzone[data-astro-cid-m3f2qoqu].error .dz-status[data-astro-cid-m3f2qoqu]{display:block;color:#dc2626}.dropzone[data-astro-cid-m3f2qoqu].loading .dz-text[data-astro-cid-m3f2qoqu],.dropzone[data-astro-cid-m3f2qoqu].success .dz-text[data-astro-cid-m3f2qoqu],.dropzone[data-astro-cid-m3f2qoqu].error .dz-text[data-astro-cid-m3f2qoqu],.dropzone[data-astro-cid-m3f2qoqu].loading .dz-icon[data-astro-cid-m3f2qoqu],.dropzone[data-astro-cid-m3f2qoqu].success .dz-icon[data-astro-cid-m3f2qoqu],.dropzone[data-astro-cid-m3f2qoqu].error .dz-icon[data-astro-cid-m3f2qoqu]{display:none}progress[data-astro-cid-m3f2qoqu]{width:100%;height:4px;border-radius:2px;accent-color:#f97316;display:none}.dropzone[data-astro-cid-m3f2qoqu].loading progress[data-astro-cid-m3f2qoqu]{display:block}\n"}],"routeData":{"route":"/admin/hero","isIndex":false,"type":"page","pattern":"^\\/admin\\/hero\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}],[{"content":"hero","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin/hero.astro","pathname":"/admin/hero","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/ai-lager","isIndex":false,"type":"page","pattern":"^\\/ai-lager\\/?$","segments":[[{"content":"ai-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ai-lager.astro","pathname":"/ai-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/admin/gallery-upload","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/admin\\/gallery-upload\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"admin","dynamic":false,"spread":false}],[{"content":"gallery-upload","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/admin/gallery-upload.ts","pathname":"/api/admin/gallery-upload","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/admin/hero-upload","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/admin\\/hero-upload\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"admin","dynamic":false,"spread":false}],[{"content":"hero-upload","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/admin/hero-upload.ts","pathname":"/api/admin/hero-upload","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ask","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ask\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ask","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ask.ts","pathname":"/api/ask","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ask-test-mama","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ask-test-mama\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ask-test-mama","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ask-test-mama.ts","pathname":"/api/ask-test-mama","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/clicks","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/clicks\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"clicks","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/clicks.ts","pathname":"/api/clicks","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/gbp-auth","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/gbp-auth\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"gbp-auth","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/gbp-auth.ts","pathname":"/api/gbp-auth","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/gbp-post","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/gbp-post\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"gbp-post","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/gbp-post.ts","pathname":"/api/gbp-post","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/lead","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/lead\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"lead","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/lead.ts","pathname":"/api/lead","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/photo","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/photo\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"photo","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/photo.ts","pathname":"/api/photo","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/validate-test","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/validate-test\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"validate-test","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/validate-test.ts","pathname":"/api/validate-test","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/ask@_@astro.Cm9V7Z_x.css"}],"routeData":{"route":"/ask","isIndex":false,"type":"page","pattern":"^\\/ask\\/?$","segments":[[{"content":"ask","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ask.astro","pathname":"/ask","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/ask-test@_@astro.Br4YKuLl.css"}],"routeData":{"route":"/ask-test","isIndex":false,"type":"page","pattern":"^\\/ask-test\\/?$","segments":[[{"content":"ask-test","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ask-test.astro","pathname":"/ask-test","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/ceny","isIndex":false,"type":"page","pattern":"^\\/ceny\\/?$","segments":[[{"content":"ceny","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ceny.astro","pathname":"/ceny","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/detskiy-lager","isIndex":false,"type":"page","pattern":"^\\/detskiy-lager\\/?$","segments":[[{"content":"detskiy-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/detskiy-lager.astro","pathname":"/detskiy-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/detskiy-lager-podmoskove","isIndex":false,"type":"page","pattern":"^\\/detskiy-lager-podmoskove\\/?$","segments":[[{"content":"detskiy-lager-podmoskove","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/detskiy-lager-podmoskove.astro","pathname":"/detskiy-lager-podmoskove","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/dlya-kompaniy","isIndex":false,"type":"page","pattern":"^\\/dlya-kompaniy\\/?$","segments":[[{"content":"dlya-kompaniy","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/dlya-kompaniy.astro","pathname":"/dlya-kompaniy","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/it-camp","isIndex":false,"type":"page","pattern":"^\\/it-camp\\/?$","segments":[[{"content":"it-camp","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/it-camp.astro","pathname":"/it-camp","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/kompyuternyy-lager","isIndex":false,"type":"page","pattern":"^\\/kompyuternyy-lager\\/?$","segments":[[{"content":"kompyuternyy-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/kompyuternyy-lager.astro","pathname":"/kompyuternyy-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/kupit-putevku-v-lager","isIndex":false,"type":"page","pattern":"^\\/kupit-putevku-v-lager\\/?$","segments":[[{"content":"kupit-putevku-v-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/kupit-putevku-v-lager.astro","pathname":"/kupit-putevku-v-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-bez-telefonov","isIndex":false,"type":"page","pattern":"^\\/lager-bez-telefonov\\/?$","segments":[[{"content":"lager-bez-telefonov","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-bez-telefonov.astro","pathname":"/lager-bez-telefonov","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-dlya-podrostkov","isIndex":false,"type":"page","pattern":"^\\/lager-dlya-podrostkov\\/?$","segments":[[{"content":"lager-dlya-podrostkov","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-dlya-podrostkov.astro","pathname":"/lager-dlya-podrostkov","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-dlya-shkolnikov","isIndex":false,"type":"page","pattern":"^\\/lager-dlya-shkolnikov\\/?$","segments":[[{"content":"lager-dlya-shkolnikov","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-dlya-shkolnikov.astro","pathname":"/lager-dlya-shkolnikov","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-na-avgust-podmoskove","isIndex":false,"type":"page","pattern":"^\\/lager-na-avgust-podmoskove\\/?$","segments":[[{"content":"lager-na-avgust-podmoskove","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-na-avgust-podmoskove.astro","pathname":"/lager-na-avgust-podmoskove","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-na-iyul","isIndex":false,"type":"page","pattern":"^\\/lager-na-iyul\\/?$","segments":[[{"content":"lager-na-iyul","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-na-iyul.astro","pathname":"/lager-na-iyul","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-na-iyun","isIndex":false,"type":"page","pattern":"^\\/lager-na-iyun\\/?$","segments":[[{"content":"lager-na-iyun","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-na-iyun.astro","pathname":"/lager-na-iyun","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-na-leto-2026","isIndex":false,"type":"page","pattern":"^\\/lager-na-leto-2026\\/?$","segments":[[{"content":"lager-na-leto-2026","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-na-leto-2026.astro","pathname":"/lager-na-leto-2026","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-na-more","isIndex":false,"type":"page","pattern":"^\\/lager-na-more\\/?$","segments":[[{"content":"lager-na-more","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-na-more.astro","pathname":"/lager-na-more","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-nedorogo","isIndex":false,"type":"page","pattern":"^\\/lager-nedorogo\\/?$","segments":[[{"content":"lager-nedorogo","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-nedorogo.astro","pathname":"/lager-nedorogo","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-programmirovaniya","isIndex":false,"type":"page","pattern":"^\\/lager-programmirovaniya\\/?$","segments":[[{"content":"lager-programmirovaniya","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-programmirovaniya.astro","pathname":"/lager-programmirovaniya","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-s-basseynom","isIndex":false,"type":"page","pattern":"^\\/lager-s-basseynom\\/?$","segments":[[{"content":"lager-s-basseynom","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-s-basseynom.astro","pathname":"/lager-s-basseynom","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-v-moskve","isIndex":false,"type":"page","pattern":"^\\/lager-v-moskve\\/?$","segments":[[{"content":"lager-v-moskve","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-v-moskve.astro","pathname":"/lager-v-moskve","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/lager-v-podmoskove","isIndex":false,"type":"page","pattern":"^\\/lager-v-podmoskove\\/?$","segments":[[{"content":"lager-v-podmoskove","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/lager-v-podmoskove.astro","pathname":"/lager-v-podmoskove","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/legal","isIndex":false,"type":"page","pattern":"^\\/legal\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal.astro","pathname":"/legal","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/letnyaya-it-shkola","isIndex":false,"type":"page","pattern":"^\\/letnyaya-it-shkola\\/?$","segments":[[{"content":"letnyaya-it-shkola","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/letnyaya-it-shkola.astro","pathname":"/letnyaya-it-shkola","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/minecraft-lager","isIndex":false,"type":"page","pattern":"^\\/minecraft-lager\\/?$","segments":[[{"content":"minecraft-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/minecraft-lager.astro","pathname":"/minecraft-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/nalogovyj-vychet","isIndex":false,"type":"page","pattern":"^\\/nalogovyj-vychet\\/?$","segments":[[{"content":"nalogovyj-vychet","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/nalogovyj-vychet.astro","pathname":"/nalogovyj-vychet","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/o-lagere","isIndex":false,"type":"page","pattern":"^\\/o-lagere\\/?$","segments":[[{"content":"o-lagere","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/o-lagere.astro","pathname":"/o-lagere","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/obrazovatelnyy-lager","isIndex":false,"type":"page","pattern":"^\\/obrazovatelnyy-lager\\/?$","segments":[[{"content":"obrazovatelnyy-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/obrazovatelnyy-lager.astro","pathname":"/obrazovatelnyy-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/ostavit-otzyv","isIndex":false,"type":"page","pattern":"^\\/ostavit-otzyv\\/?$","segments":[[{"content":"ostavit-otzyv","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/ostavit-otzyv.astro","pathname":"/ostavit-otzyv","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/otzyvy","isIndex":false,"type":"page","pattern":"^\\/otzyvy\\/?$","segments":[[{"content":"otzyvy","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/otzyvy.astro","pathname":"/otzyvy","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/politika-vozvrata","isIndex":false,"type":"page","pattern":"^\\/politika-vozvrata\\/?$","segments":[[{"content":"politika-vozvrata","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/politika-vozvrata.astro","pathname":"/politika-vozvrata","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/privacy-policy","isIndex":false,"type":"page","pattern":"^\\/privacy-policy\\/?$","segments":[[{"content":"privacy-policy","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/privacy-policy.astro","pathname":"/privacy-policy","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/python-lager","isIndex":false,"type":"page","pattern":"^\\/python-lager\\/?$","segments":[[{"content":"python-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/python-lager.astro","pathname":"/python-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/roblox-lager","isIndex":false,"type":"page","pattern":"^\\/roblox-lager\\/?$","segments":[[{"content":"roblox-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/roblox-lager.astro","pathname":"/roblox-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/scratch-lager","isIndex":false,"type":"page","pattern":"^\\/scratch-lager\\/?$","segments":[[{"content":"scratch-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/scratch-lager.astro","pathname":"/scratch-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/chto-vzyat-v-lager","isIndex":false,"type":"page","pattern":"^\\/stati\\/chto-vzyat-v-lager\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"chto-vzyat-v-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/chto-vzyat-v-lager.astro","pathname":"/stati/chto-vzyat-v-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/detskiy-lager-bez-telefonov","isIndex":false,"type":"page","pattern":"^\\/stati\\/detskiy-lager-bez-telefonov\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"detskiy-lager-bez-telefonov","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/detskiy-lager-bez-telefonov.astro","pathname":"/stati/detskiy-lager-bez-telefonov","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/dokumenty-licenziya-strahovka","isIndex":false,"type":"page","pattern":"^\\/stati\\/dokumenty-licenziya-strahovka\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"dokumenty-licenziya-strahovka","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/dokumenty-licenziya-strahovka.astro","pathname":"/stati/dokumenty-licenziya-strahovka","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/hakaton-v-detskom-lagere","isIndex":false,"type":"page","pattern":"^\\/stati\\/hakaton-v-detskom-lagere\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"hakaton-v-detskom-lagere","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/hakaton-v-detskom-lagere.astro","pathname":"/stati/hakaton-v-detskom-lagere","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/igromaniya-u-detej","isIndex":false,"type":"page","pattern":"^\\/stati\\/igromaniya-u-detej\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"igromaniya-u-detej","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/igromaniya-u-detej.astro","pathname":"/stati/igromaniya-u-detej","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/ii-zamenit-programmista","isIndex":false,"type":"page","pattern":"^\\/stati\\/ii-zamenit-programmista\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"ii-zamenit-programmista","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/ii-zamenit-programmista.astro","pathname":"/stati/ii-zamenit-programmista","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/kak-izbavitsya-ot-zavisimosti-ot-igr","isIndex":false,"type":"page","pattern":"^\\/stati\\/kak-izbavitsya-ot-zavisimosti-ot-igr\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"kak-izbavitsya-ot-zavisimosti-ot-igr","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/kak-izbavitsya-ot-zavisimosti-ot-igr.astro","pathname":"/stati/kak-izbavitsya-ot-zavisimosti-ot-igr","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet","isIndex":false,"type":"page","pattern":"^\\/stati\\/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"kak-pomoch-podrostku-kotoryj-nichego-ne-hochet","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet.astro","pathname":"/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/kak-vybrat-lager","isIndex":false,"type":"page","pattern":"^\\/stati\\/kak-vybrat-lager\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"kak-vybrat-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/kak-vybrat-lager.astro","pathname":"/stati/kak-vybrat-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/kuda-det-rebenka-letom","isIndex":false,"type":"page","pattern":"^\\/stati\\/kuda-det-rebenka-letom\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"kuda-det-rebenka-letom","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/kuda-det-rebenka-letom.astro","pathname":"/stati/kuda-det-rebenka-letom","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/lechenie-kompyuternoj-zavisimosti","isIndex":false,"type":"page","pattern":"^\\/stati\\/lechenie-kompyuternoj-zavisimosti\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"lechenie-kompyuternoj-zavisimosti","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/lechenie-kompyuternoj-zavisimosti.astro","pathname":"/stati/lechenie-kompyuternoj-zavisimosti","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/nizkaya-samootsenka-u-rebenka","isIndex":false,"type":"page","pattern":"^\\/stati\\/nizkaya-samootsenka-u-rebenka\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"nizkaya-samootsenka-u-rebenka","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/nizkaya-samootsenka-u-rebenka.astro","pathname":"/stati/nizkaya-samootsenka-u-rebenka","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/pervyj-raz-v-lagere","isIndex":false,"type":"page","pattern":"^\\/stati\\/pervyj-raz-v-lagere\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"pervyj-raz-v-lagere","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/pervyj-raz-v-lagere.astro","pathname":"/stati/pervyj-raz-v-lagere","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/podrostok-ne-hochet-uchitsya","isIndex":false,"type":"page","pattern":"^\\/stati\\/podrostok-ne-hochet-uchitsya\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"podrostok-ne-hochet-uchitsya","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/podrostok-ne-hochet-uchitsya.astro","pathname":"/stati/podrostok-ne-hochet-uchitsya","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/priznaki-kompyuternoj-zavisimosti","isIndex":false,"type":"page","pattern":"^\\/stati\\/priznaki-kompyuternoj-zavisimosti\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"priznaki-kompyuternoj-zavisimosti","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/priznaki-kompyuternoj-zavisimosti.astro","pathname":"/stati/priznaki-kompyuternoj-zavisimosti","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/problemy-v-obschenii-podrostkov","isIndex":false,"type":"page","pattern":"^\\/stati\\/problemy-v-obschenii-podrostkov\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"problemy-v-obschenii-podrostkov","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/problemy-v-obschenii-podrostkov.astro","pathname":"/stati/problemy-v-obschenii-podrostkov","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/profilaktika-kompyuternoj-zavisimosti","isIndex":false,"type":"page","pattern":"^\\/stati\\/profilaktika-kompyuternoj-zavisimosti\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"profilaktika-kompyuternoj-zavisimosti","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/profilaktika-kompyuternoj-zavisimosti.astro","pathname":"/stati/profilaktika-kompyuternoj-zavisimosti","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/vnutrennyaya-ekonomika-v-lagere","isIndex":false,"type":"page","pattern":"^\\/stati\\/vnutrennyaya-ekonomika-v-lagere\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"vnutrennyaya-ekonomika-v-lagere","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/vnutrennyaya-ekonomika-v-lagere.astro","pathname":"/stati/vnutrennyaya-ekonomika-v-lagere","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/zavisimost-ot-kompyuternyh-igr","isIndex":false,"type":"page","pattern":"^\\/stati\\/zavisimost-ot-kompyuternyh-igr\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"zavisimost-ot-kompyuternyh-igr","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/zavisimost-ot-kompyuternyh-igr.astro","pathname":"/stati/zavisimost-ot-kompyuternyh-igr","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati/zavisimost-ot-telefona-u-podrostkov","isIndex":false,"type":"page","pattern":"^\\/stati\\/zavisimost-ot-telefona-u-podrostkov\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}],[{"content":"zavisimost-ot-telefona-u-podrostkov","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/zavisimost-ot-telefona-u-podrostkov.astro","pathname":"/stati/zavisimost-ot-telefona-u-podrostkov","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/stati","isIndex":true,"type":"page","pattern":"^\\/stati\\/?$","segments":[[{"content":"stati","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/stati/index.astro","pathname":"/stati","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/tematicheskiy-lager","isIndex":false,"type":"page","pattern":"^\\/tematicheskiy-lager\\/?$","segments":[[{"content":"tematicheskiy-lager","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/tematicheskiy-lager.astro","pathname":"/tematicheskiy-lager","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/попробовать","isIndex":false,"type":"page","pattern":"^\\/попробовать\\/?$","segments":[[{"content":"попробовать","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/попробовать.astro","pathname":"/попробовать","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/global.UMh5plyO.css"},{"type":"inline","content":"@media(max-width:768px){html,body{font-size:16px;line-height:1.65}p,li,dd,blockquote{font-size:max(15px,1em);line-height:1.6}.text-slate-400,.text-slate-500,.text-gray-400,.text-gray-500,.text-white\\/60,.text-white\\/70{color:#4b5563!important}[class*=bg-dark]:not(dialog) .text-slate-400,[class*=bg-dark]:not(dialog) .text-slate-500,[class*=bg-black]:not(dialog) .text-slate-400,[class*=bg-black]:not(dialog) .text-slate-500,.bg-dark-navy .text-slate-400,.bg-dark-navy .text-slate-500,[class*=from-black] .text-white\\/60,[class*=from-black] .text-white\\/70{color:#ffffffd9!important}dialog .text-slate-400,dialog .text-slate-500,.bg-white .text-slate-400,.bg-white .text-slate-500{color:#64748b!important}.bg-primary,.bg-\\[\\#ff8a00\\],.bg-\\[\\#ff7700\\],.bg-orange-500,.bg-orange-600,button.bg-primary,a.bg-primary{background-color:#c45f00!important}.text-primary,.text-\\[\\#ff8a00\\],.text-orange-500,.text-orange-600{color:#c45f00!important}.border-primary,.border-\\[\\#ff8a00\\]{border-color:#c45f00!important}a.bg-primary,button.bg-primary,a[class*=bg-orange],button[class*=bg-orange]{min-height:48px;padding-top:12px;padding-bottom:12px;font-size:16px}form a.bg-primary,form button.bg-primary,form button[type=submit],[class*=booking] a.bg-primary,[class*=booking] button.bg-primary,[class*=cta-block] a.bg-primary,[class*=cta-block] button.bg-primary{width:100%!important;justify-content:center}section{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:16px}section[class*=hero],section[id=hero],section[class*=min-h-screen],[class*=hero] section{padding-top:unset;padding-bottom:unset}h1,h2,h3{line-height:1.2}h1{font-size:clamp(24px,6vw,32px)}h2{font-size:clamp(20px,5vw,26px)}a[role=button],button:not([class*=w-8]):not([class*=w-10]):not([class*=h-8]):not([class*=h-9]):not([class*=h-10]){min-height:44px}}@keyframes age-btn-pulse{0%,70%,to{box-shadow:0 0 #ec7c0000}85%{box-shadow:0 0 0 4px #ec7c0026}}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]{animation:age-btn-pulse 2.2s ease-in-out infinite}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(2){animation-delay:.15s}#age-bar[data-astro-cid-s5dfcfzj].age-bar-awaken .age-btn[data-astro-cid-s5dfcfzj]:nth-child(3){animation-delay:.3s}\n"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"serverLike":true,"middlewareMode":"classic","site":"https://aidacamp.ru","base":"/","trailingSlash":"ignore","compressHTML":true,"experimentalQueuedRendering":{"enabled":false,"poolSize":0,"contentCache":false},"componentMetadata":[["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ask.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ask-test.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/3d-modelirovanie-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ai-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ceny.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/detskiy-lager-podmoskove.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/detskiy-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/dlya-kompaniy.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/it-camp.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/kompyuternyy-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/kupit-putevku-v-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-bez-telefonov.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-dlya-podrostkov.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-dlya-shkolnikov.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-na-avgust-podmoskove.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-na-iyul.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-na-iyun.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-na-leto-2026.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-na-more.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-nedorogo.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-programmirovaniya.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-s-basseynom.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-v-moskve.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/lager-v-podmoskove.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/letnyaya-it-shkola.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/minecraft-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/nalogovyj-vychet.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/o-lagere.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/obrazovatelnyy-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/python-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/roblox-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/scratch-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/tematicheskiy-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/попробовать.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/404.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/legal.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ostavit-otzyv.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/otzyvy.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/politika-vozvrata.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/privacy-policy.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/chto-vzyat-v-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/detskiy-lager-bez-telefonov.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/dokumenty-licenziya-strahovka.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/hakaton-v-detskom-lagere.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/igromaniya-u-detej.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/ii-zamenit-programmista.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/index.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/kak-izbavitsya-ot-zavisimosti-ot-igr.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/kak-vybrat-lager.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/kuda-det-rebenka-letom.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/lechenie-kompyuternoj-zavisimosti.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/nizkaya-samootsenka-u-rebenka.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/pervyj-raz-v-lagere.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/podrostok-ne-hochet-uchitsya.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/priznaki-kompyuternoj-zavisimosti.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/problemy-v-obschenii-podrostkov.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/profilaktika-kompyuternoj-zavisimosti.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/vnutrennyaya-ekonomika-v-lagere.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/zavisimost-ot-kompyuternyh-igr.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/stati/zavisimost-ot-telefona-u-podrostkov.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gallery.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-callback.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-posts.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-setup.astro",{"propagation":"none","containsHead":true}],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/hero.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000virtual:astro:actions/noop-entrypoint":"chunks/noop-entrypoint_BOlrdqWF.mjs","\u0000virtual:astro:middleware":"virtual_astro_middleware.mjs","\u0000virtual:astro:session-driver":"chunks/_virtual_astro_session-driver_Bk3Q189E.mjs","\u0000virtual:astro:server-island-manifest":"chunks/_virtual_astro_server-island-manifest_CQQ1F5PF.mjs","\u0000virtual:astro:page:src/pages/3d-modelirovanie-lager@_@astro":"chunks/3d-modelirovanie-lager_w6IasGkz.mjs","\u0000virtual:astro:page:src/pages/404@_@astro":"chunks/404_C2SC2-dB.mjs","\u0000virtual:astro:page:src/pages/ai-lager@_@astro":"chunks/ai-lager_C6cY3qA7.mjs","\u0000virtual:astro:page:src/pages/ask@_@astro":"chunks/ask_WZoEFUpO.mjs","\u0000virtual:astro:page:src/pages/ask-test@_@astro":"chunks/ask-test_BUV8Jzxf.mjs","\u0000virtual:astro:page:src/pages/ceny@_@astro":"chunks/ceny_DOSqJZJN.mjs","\u0000virtual:astro:page:src/pages/detskiy-lager@_@astro":"chunks/detskiy-lager_DdO_cV0O.mjs","\u0000virtual:astro:page:src/pages/detskiy-lager-podmoskove@_@astro":"chunks/detskiy-lager-podmoskove_C-HSEttR.mjs","\u0000virtual:astro:page:src/pages/dlya-kompaniy@_@astro":"chunks/dlya-kompaniy_BedHYWBG.mjs","\u0000virtual:astro:page:src/pages/it-camp@_@astro":"chunks/it-camp_D9cxOdtO.mjs","\u0000virtual:astro:page:src/pages/kompyuternyy-lager@_@astro":"chunks/kompyuternyy-lager_BlRoh98W.mjs","\u0000virtual:astro:page:src/pages/kupit-putevku-v-lager@_@astro":"chunks/kupit-putevku-v-lager_DNTuXRL9.mjs","\u0000virtual:astro:page:src/pages/lager-bez-telefonov@_@astro":"chunks/lager-bez-telefonov_HsyN3CgK.mjs","\u0000virtual:astro:page:src/pages/lager-dlya-podrostkov@_@astro":"chunks/lager-dlya-podrostkov_CpGvbigm.mjs","\u0000virtual:astro:page:src/pages/lager-dlya-shkolnikov@_@astro":"chunks/lager-dlya-shkolnikov_WkjPCm-H.mjs","\u0000virtual:astro:page:src/pages/lager-na-avgust-podmoskove@_@astro":"chunks/lager-na-avgust-podmoskove_BZguA0E3.mjs","\u0000virtual:astro:page:src/pages/lager-na-iyul@_@astro":"chunks/lager-na-iyul_6M-fX2t6.mjs","\u0000virtual:astro:page:src/pages/lager-na-iyun@_@astro":"chunks/lager-na-iyun_DegnAs2U.mjs","\u0000virtual:astro:page:src/pages/lager-na-leto-2026@_@astro":"chunks/lager-na-leto-2026_CmfQULw1.mjs","\u0000virtual:astro:page:src/pages/lager-na-more@_@astro":"chunks/lager-na-more_Dc26QTvz.mjs","\u0000virtual:astro:page:src/pages/lager-nedorogo@_@astro":"chunks/lager-nedorogo_BsSjHKdj.mjs","\u0000virtual:astro:page:src/pages/lager-programmirovaniya@_@astro":"chunks/lager-programmirovaniya_omGumVyL.mjs","\u0000virtual:astro:page:src/pages/lager-s-basseynom@_@astro":"chunks/lager-s-basseynom_Bhh7t4L3.mjs","\u0000virtual:astro:page:src/pages/lager-v-moskve@_@astro":"chunks/lager-v-moskve_p14wFEzH.mjs","\u0000virtual:astro:page:src/pages/lager-v-podmoskove@_@astro":"chunks/lager-v-podmoskove_BtbjPn2p.mjs","\u0000virtual:astro:page:src/pages/legal@_@astro":"chunks/legal_Bmj0jd6z.mjs","\u0000virtual:astro:page:src/pages/letnyaya-it-shkola@_@astro":"chunks/letnyaya-it-shkola_CEZy-G_f.mjs","\u0000virtual:astro:page:src/pages/minecraft-lager@_@astro":"chunks/minecraft-lager_6Vws6Xvl.mjs","\u0000virtual:astro:page:src/pages/nalogovyj-vychet@_@astro":"chunks/nalogovyj-vychet_BpNUf50P.mjs","\u0000virtual:astro:page:src/pages/o-lagere@_@astro":"chunks/o-lagere_C6A4dt3R.mjs","\u0000virtual:astro:page:src/pages/obrazovatelnyy-lager@_@astro":"chunks/obrazovatelnyy-lager_D-0bwqBc.mjs","\u0000virtual:astro:page:src/pages/ostavit-otzyv@_@astro":"chunks/ostavit-otzyv_6NuJ3Se_.mjs","\u0000virtual:astro:page:src/pages/otzyvy@_@astro":"chunks/otzyvy__T9GljVK.mjs","\u0000virtual:astro:page:src/pages/politika-vozvrata@_@astro":"chunks/politika-vozvrata_DvXDU8c_.mjs","\u0000virtual:astro:page:src/pages/privacy-policy@_@astro":"chunks/privacy-policy_alT-_YiB.mjs","\u0000virtual:astro:page:src/pages/python-lager@_@astro":"chunks/python-lager_DZTd3QMC.mjs","\u0000virtual:astro:page:src/pages/roblox-lager@_@astro":"chunks/roblox-lager_Cl6rUTC0.mjs","\u0000virtual:astro:page:src/pages/scratch-lager@_@astro":"chunks/scratch-lager_-XuttMBy.mjs","\u0000virtual:astro:page:src/pages/stati/chto-vzyat-v-lager@_@astro":"chunks/chto-vzyat-v-lager_2K1yvCCU.mjs","\u0000virtual:astro:page:src/pages/stati/detskiy-lager-bez-telefonov@_@astro":"chunks/detskiy-lager-bez-telefonov_BnRBu-sS.mjs","\u0000virtual:astro:page:src/pages/stati/dokumenty-licenziya-strahovka@_@astro":"chunks/dokumenty-licenziya-strahovka_CZaL9tqM.mjs","\u0000virtual:astro:page:src/pages/stati/hakaton-v-detskom-lagere@_@astro":"chunks/hakaton-v-detskom-lagere_DO28XTYX.mjs","\u0000virtual:astro:page:src/pages/stati/igromaniya-u-detej@_@astro":"chunks/igromaniya-u-detej_BYe8L68E.mjs","\u0000virtual:astro:page:src/pages/stati/ii-zamenit-programmista@_@astro":"chunks/ii-zamenit-programmista_xvGEUJgl.mjs","\u0000virtual:astro:page:src/pages/stati/kak-izbavitsya-ot-zavisimosti-ot-igr@_@astro":"chunks/kak-izbavitsya-ot-zavisimosti-ot-igr_nRQ1Xe_E.mjs","\u0000virtual:astro:page:src/pages/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet@_@astro":"chunks/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet_s3ilQqIA.mjs","\u0000virtual:astro:page:src/pages/stati/kak-vybrat-lager@_@astro":"chunks/kak-vybrat-lager_CPQEYKPa.mjs","\u0000virtual:astro:page:src/pages/stati/kuda-det-rebenka-letom@_@astro":"chunks/kuda-det-rebenka-letom_BAzeu_eL.mjs","\u0000virtual:astro:page:src/pages/stati/lechenie-kompyuternoj-zavisimosti@_@astro":"chunks/lechenie-kompyuternoj-zavisimosti_BIRXN3fX.mjs","\u0000virtual:astro:page:src/pages/stati/nizkaya-samootsenka-u-rebenka@_@astro":"chunks/nizkaya-samootsenka-u-rebenka_DjlVr4J3.mjs","\u0000virtual:astro:page:src/pages/stati/pervyj-raz-v-lagere@_@astro":"chunks/pervyj-raz-v-lagere_H3oFn7M0.mjs","\u0000virtual:astro:page:src/pages/stati/podrostok-ne-hochet-uchitsya@_@astro":"chunks/podrostok-ne-hochet-uchitsya_BzBvPtj9.mjs","\u0000virtual:astro:page:src/pages/stati/priznaki-kompyuternoj-zavisimosti@_@astro":"chunks/priznaki-kompyuternoj-zavisimosti_CjwsMZuR.mjs","\u0000virtual:astro:page:src/pages/stati/problemy-v-obschenii-podrostkov@_@astro":"chunks/problemy-v-obschenii-podrostkov_CrQeUf1v.mjs","\u0000virtual:astro:page:src/pages/stati/profilaktika-kompyuternoj-zavisimosti@_@astro":"chunks/profilaktika-kompyuternoj-zavisimosti_CGCNKnUN.mjs","\u0000virtual:astro:page:src/pages/stati/vnutrennyaya-ekonomika-v-lagere@_@astro":"chunks/vnutrennyaya-ekonomika-v-lagere_B4nnVD4P.mjs","\u0000virtual:astro:page:src/pages/stati/zavisimost-ot-kompyuternyh-igr@_@astro":"chunks/zavisimost-ot-kompyuternyh-igr_BlLTWj9N.mjs","\u0000virtual:astro:page:src/pages/stati/zavisimost-ot-telefona-u-podrostkov@_@astro":"chunks/zavisimost-ot-telefona-u-podrostkov_D43V319z.mjs","\u0000virtual:astro:page:src/pages/stati/index@_@astro":"chunks/index_D8XDr5df.mjs","\u0000virtual:astro:page:src/pages/tematicheskiy-lager@_@astro":"chunks/tematicheskiy-lager_DCHNdrFu.mjs","\u0000virtual:astro:page:src/pages/попробовать@_@astro":"chunks/попробовать_CV_bGB-F.mjs","\u0000virtual:astro:page:src/pages/index@_@astro":"chunks/index_DDhreU6K.mjs","astro/entrypoints/prerender":"prerender-entry.BEbrheOl.mjs","@astrojs/node/server.js":"entry.mjs","\u0000virtual:astro:page:src/pages/admin/gallery@_@astro":"chunks/gallery_LCUh_jku.mjs","\u0000virtual:astro:page:src/pages/admin/gbp-callback@_@astro":"chunks/gbp-callback_DfRaPf33.mjs","\u0000virtual:astro:page:src/pages/admin/gbp-posts@_@astro":"chunks/gbp-posts_DlXhBBmt.mjs","\u0000virtual:astro:page:src/pages/admin/gbp-setup@_@astro":"chunks/gbp-setup_C7M9TPpz.mjs","\u0000virtual:astro:page:src/pages/admin/hero@_@astro":"chunks/hero_BiC4ZyX4.mjs","\u0000virtual:astro:page:src/pages/api/admin/gallery-upload@_@ts":"chunks/gallery-upload_bWTueLTY.mjs","\u0000virtual:astro:page:src/pages/api/admin/hero-upload@_@ts":"chunks/hero-upload_B4ipWg0L.mjs","\u0000virtual:astro:page:src/pages/api/ask@_@ts":"chunks/ask_BP0jMWjQ.mjs","\u0000virtual:astro:page:src/pages/api/ask-test-mama@_@ts":"chunks/ask-test-mama_BF0-mdMu.mjs","\u0000virtual:astro:page:src/pages/api/clicks@_@ts":"chunks/clicks_CXOCTel0.mjs","\u0000virtual:astro:page:src/pages/api/gbp-auth@_@ts":"chunks/gbp-auth_BI0C9nnF.mjs","\u0000virtual:astro:page:src/pages/api/gbp-post@_@ts":"chunks/gbp-post_Cq21RXrx.mjs","\u0000virtual:astro:page:src/pages/api/lead@_@ts":"chunks/lead_CWUPBWAs.mjs","\u0000virtual:astro:page:src/pages/api/photo@_@ts":"chunks/photo_CNRgKsYP.mjs","\u0000virtual:astro:page:src/pages/api/validate-test@_@ts":"chunks/validate-test_Chz-FJH6.mjs","/Users/vladimirafanasev/Aidacamp-cloude/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_COVVNjOD.mjs","/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ceny.astro?astro&type=script&index=0&lang.ts":"_astro/ceny.astro_astro_type_script_index_0_lang.CBq6J9jL.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/LandingHero.astro?astro&type=script&index=0&lang.ts":"_astro/LandingHero.astro_astro_type_script_index_0_lang.BXWJEa64.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Shifts.astro?astro&type=script&index=0&lang.ts":"_astro/Shifts.astro_astro_type_script_index_0_lang.JpJ39W0X.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/FAQ.astro?astro&type=script&index=0&lang.ts":"_astro/FAQ.astro_astro_type_script_index_0_lang.BzY0_Z6S.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Gallery.astro?astro&type=script&index=0&lang.ts":"_astro/Gallery.astro_astro_type_script_index_0_lang.DtEIBmST.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/LeadForm.astro?astro&type=script&index=0&lang.ts":"_astro/LeadForm.astro_astro_type_script_index_0_lang.DyJz2ajc.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Header.astro?astro&type=script&index=0&lang.ts":"_astro/Header.astro_astro_type_script_index_0_lang.D1nd3qBc.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/About.astro?astro&type=script&index=0&lang.ts":"_astro/About.astro_astro_type_script_index_0_lang.DV_jXHaw.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Reviews.astro?astro&type=script&index=0&lang.ts":"_astro/Reviews.astro_astro_type_script_index_0_lang.BVduyncn.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Team.astro?astro&type=script&index=0&lang.ts":"_astro/Team.astro_astro_type_script_index_0_lang.CUQ8TMbQ.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Stay.astro?astro&type=script&index=0&lang.ts":"_astro/Stay.astro_astro_type_script_index_0_lang.B3o3s__L.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Journey.astro?astro&type=script&index=0&lang.ts":"_astro/Journey.astro_astro_type_script_index_0_lang.BEfCBQ_B.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Journey.astro?astro&type=script&index=1&lang.ts":"_astro/Journey.astro_astro_type_script_index_1_lang.D8lTGwJ9.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/Hackathon.astro?astro&type=script&index=0&lang.ts":"_astro/Hackathon.astro_astro_type_script_index_0_lang.C5lK8LnB.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/BookingBar.astro?astro&type=script&index=0&lang.ts":"_astro/BookingBar.astro_astro_type_script_index_0_lang.BkQJuU88.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/StickyCta.astro?astro&type=script&index=0&lang.ts":"_astro/StickyCta.astro_astro_type_script_index_0_lang.BuLvTw7Y.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/ShiftOccupancy.astro?astro&type=script&index=0&lang.ts":"_astro/ShiftOccupancy.astro_astro_type_script_index_0_lang.DPeAqTNQ.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/ShiftModal.astro?astro&type=script&index=0&lang.ts":"_astro/ShiftModal.astro_astro_type_script_index_0_lang.B2W0P05n.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/GlobalShiftLinkHandler.astro?astro&type=script&index=0&lang.ts":"_astro/GlobalShiftLinkHandler.astro_astro_type_script_index_0_lang.CjTYaZAu.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/shifts/ShiftCard.astro?astro&type=script&index=0&lang.ts":"_astro/ShiftCard.astro_astro_type_script_index_0_lang.Bg9e33ES.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/MobileMenu.astro?astro&type=script&index=0&lang.ts":"_astro/MobileMenu.astro_astro_type_script_index_0_lang.BkqTKsMl.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/HeroModals.astro?astro&type=script&index=0&lang.ts":"_astro/HeroModals.astro_astro_type_script_index_0_lang.CcCd0Q56.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/VideoModal.astro?astro&type=script&index=0&lang.ts":"_astro/VideoModal.astro_astro_type_script_index_0_lang.CbHIn1Mq.js","/Users/vladimirafanasev/Aidacamp-cloude/src/components/BookingInfoModal.astro?astro&type=script&index=0&lang.ts":"_astro/BookingInfoModal.astro_astro_type_script_index_0_lang.B2ZRLdOg.js","/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gallery.astro?astro&type=script&index=0&lang.ts":"_astro/gallery.astro_astro_type_script_index_0_lang.lQJfbc1d.js","/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/hero.astro?astro&type=script&index=0&lang.ts":"_astro/hero.astro_astro_type_script_index_0_lang.BfWWylqu.js","/Users/vladimirafanasev/Aidacamp-cloude/src/scripts/form-submit.ts":"_astro/form-submit.Dy9dZnP0.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/ceny.astro?astro&type=script&index=0&lang.ts","(function(){let n=!1;const t=setTimeout(function(){if(n)return;const e=document.getElementById(\"nudge-toast\"),c=document.getElementById(\"nudge-text\"),i=document.getElementById(\"nudge-sub\");!e||!c||(c.textContent=\"Смена 2 (10–23 июня) — последние места\",i&&(i.textContent=\"Нажмите, чтобы зафиксировать место\"),e.style.cursor=\"pointer\",e.addEventListener(\"click\",function(s){s.target.closest(\"#nudge-close\")||(document.dispatchEvent(new CustomEvent(\"shift-modal-open\",{detail:{shiftId:\"smena2\",tab:\"description\"}})),window.trackGoal?.(\"ceny_nudge_click\"))}),e.classList.remove(\"translate-y-full\",\"opacity-0\",\"pointer-events-none\"),e.classList.add(\"translate-y-0\",\"opacity-100\"),document.getElementById(\"nudge-close\")?.addEventListener(\"click\",function(){e.classList.add(\"translate-y-full\",\"opacity-0\")}),n=!0,window.trackGoal?.(\"ceny_nudge_show\"))},45e3);document.addEventListener(\"shift-modal-open\",function(){clearTimeout(t),n=!0},{once:!0})})();function d(){document.querySelectorAll(\".price-row\").forEach(n=>{const o=()=>{const t=n.getAttribute(\"data-price-shift\");if(!t)return;const e=new CustomEvent(\"shift-modal-open\",{detail:{shiftId:t,tab:\"description\"}});document.dispatchEvent(e),window.acTrack?.(\"ceny_row_click\",{shiftId:t})};n.addEventListener(\"click\",o),n.addEventListener(\"keydown\",t=>{(t.key===\"Enter\"||t.key===\" \")&&(t.preventDefault(),o())})})}document.addEventListener(\"astro:page-load\",d);d();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/LandingHero.astro?astro&type=script&index=0&lang.ts","function t(){const e=document.getElementById(\"equipmentModalLanding\");if(!e)return;const n=()=>e.showModal();document.getElementById(\"equipment-stamp-landing\")?.addEventListener(\"click\",n),document.getElementById(\"equipment-stamp-landing-mobile\")?.addEventListener(\"click\",n),e.querySelector(\"[data-equip-landing-close]\")?.addEventListener(\"click\",()=>e.close()),e.addEventListener(\"click\",d=>{d.target===e&&e.close()})}document.addEventListener(\"astro:page-load\",t);t();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/FAQ.astro?astro&type=script&index=0&lang.ts","function s(){const a=document.querySelectorAll(\"[data-faq-filter-btn]\"),r=document.querySelectorAll(\"[data-faq-group-panel]\");a.forEach(t=>{t.addEventListener(\"click\",()=>{a.forEach(e=>{e.classList.remove(\"border-[#ff8b1f]\",\"bg-[#fff2e3]\",\"text-[#9c3d00]\"),e.classList.add(\"border-slate-200\",\"bg-white\",\"text-slate-600\")}),t.classList.remove(\"border-slate-200\",\"bg-white\",\"text-slate-600\"),t.classList.add(\"border-[#ff8b1f]\",\"bg-[#fff2e3]\",\"text-[#9c3d00]\");const o=t.dataset.faqGroup;r.forEach(e=>e.classList.toggle(\"hidden\",e.dataset.faqGroupPanel!==o))})})}document.addEventListener(\"astro:page-load\",s);s();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Gallery.astro?astro&type=script&index=0&lang.ts","function u(){const n=document.querySelector(\"[data-gallery-root]\");if(!n)return;const d=n.querySelectorAll(\"[data-gallery-filter]\"),f=n.querySelectorAll(\"[data-gallery-category]\");d.forEach(e=>{e.addEventListener(\"click\",()=>{d.forEach(o=>{o.classList.remove(\"bg-[#fff2e3]\",\"text-[#9c3d00]\"),o.classList.add(\"bg-slate-100\",\"text-slate-700\")}),e.classList.remove(\"bg-slate-100\",\"text-slate-700\"),e.classList.add(\"bg-[#fff2e3]\",\"text-[#9c3d00]\");const c=e.dataset.galleryFilter;f.forEach(o=>{o.classList.toggle(\"hidden\",o.dataset.galleryCategory!==c)})})});const a=Array.from(document.querySelectorAll(\"[data-gallery-open]\")).map(e=>({src:e.dataset.gallerySrc||\"\",alt:e.dataset.galleryAlt||\"\"})),t=document.getElementById(\"galleryLightbox\"),s=t?.querySelector(\"[data-gallery-lightbox-img]\"),i=t?.querySelector(\"[data-gallery-counter]\");if(!t||!s)return;let l=0;function r(e){l=(e%a.length+a.length)%a.length,s.src=a[l].src,s.alt=a[l].alt,i&&(i.textContent=`${l+1} / ${a.length}`)}document.querySelectorAll(\"[data-gallery-open]\").forEach((e,c)=>{e.addEventListener(\"click\",()=>{r(c),t.showModal()})});function g(){s.src=\"\",t.close()}t.querySelector(\"[data-gallery-lightbox-close]\")?.addEventListener(\"click\",g),t.addEventListener(\"click\",e=>{e.target===t&&g()}),t.querySelector(\"[data-gallery-prev]\")?.addEventListener(\"click\",()=>r(l-1)),t.querySelector(\"[data-gallery-next]\")?.addEventListener(\"click\",()=>r(l+1)),t.addEventListener(\"keydown\",e=>{e.key===\"ArrowLeft\"&&r(l-1),e.key===\"ArrowRight\"&&r(l+1)});let y=0;t.addEventListener(\"touchstart\",e=>{y=e.touches[0].clientX},{passive:!0}),t.addEventListener(\"touchend\",e=>{const c=y-e.changedTouches[0].clientX;Math.abs(c)>50&&r(c>0?l+1:l-1)})}document.addEventListener(\"astro:page-load\",u);u();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Header.astro?astro&type=script&index=0&lang.ts","document.addEventListener(\"click\",t=>{document.querySelectorAll(\"header details[open]\").forEach(e=>{e.contains(t.target)||e.removeAttribute(\"open\")})});document.querySelectorAll('header a[href^=\"#\"]').forEach(t=>{const e=t.getAttribute(\"href\")?.slice(1);e&&e!==\"hero\"&&!document.getElementById(e)&&t.setAttribute(\"href\",\"/\"+t.getAttribute(\"href\"))});"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/About.astro?astro&type=script&index=0&lang.ts","function d(){const i=document.querySelector(\"[data-about-carousel]\"),g=document.querySelectorAll(\"[data-about-dot]\");if(i&&g.length){const t=Array.from(i.children);new IntersectionObserver(a=>{a.forEach(e=>{if(e.isIntersecting){const n=t.indexOf(e.target);g.forEach((s,c)=>{const r=c===n;s.classList.toggle(\"bg-[#c45f00]\",r),s.classList.toggle(\"w-6\",r),s.classList.toggle(\"bg-slate-300\",!r),s.classList.toggle(\"w-2\",!r),s.setAttribute(\"aria-current\",r?\"true\":\"false\")})}})},{root:i,threshold:.6}).observe!==void 0&&t.forEach(a=>{new IntersectionObserver(e=>{e.forEach(n=>{if(n.isIntersecting){const s=t.indexOf(n.target);g.forEach((c,r)=>{const l=r===s;c.classList.toggle(\"bg-[#c45f00]\",l),c.classList.toggle(\"w-6\",l),c.classList.toggle(\"bg-slate-300\",!l),c.classList.toggle(\"w-2\",!l),c.setAttribute(\"aria-current\",l?\"true\":\"false\")})}})},{root:i,threshold:.6}).observe(a)})}const o=document.getElementById(\"aboutModal\");o&&(document.querySelector(\"[data-about-modal-open]\")?.addEventListener(\"click\",()=>{o.showModal()}),o.querySelectorAll(\"[data-about-modal-close]\").forEach(t=>{t.addEventListener(\"click\",()=>o.close())}),o.addEventListener(\"click\",t=>{t.target===o&&o.close()}),document.querySelectorAll(\"[data-about-photo]\").forEach(t=>{t.addEventListener(\"click\",()=>{const a=document.getElementById(\"galleryLightbox\"),e=a?.querySelector(\"[data-gallery-lightbox-img]\");a&&e&&(e.src=t.dataset.aboutPhoto||\"\",e.alt=t.querySelector(\"img\")?.alt||\"\",a.showModal())})}))}document.addEventListener(\"astro:page-load\",d);d();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Reviews.astro?astro&type=script&index=0&lang.ts","function y(){const c=document.querySelector(\"[data-reviews-carousel]\"),i=document.querySelectorAll(\"[data-reviews-dot]\");if(c&&i.length){const e=Array.from(c.children),t=new IntersectionObserver(d=>{d.forEach(v=>{if(v.isIntersecting){const L=e.indexOf(v.target);i.forEach((n,b)=>{const a=b===L;n.classList.toggle(\"bg-[#c45f00]\",a),n.classList.toggle(\"w-6\",a),n.classList.toggle(\"bg-slate-300\",!a),n.classList.toggle(\"w-2\",!a),n.setAttribute(\"aria-current\",a?\"true\":\"false\")})}})},{root:c,threshold:.6});e.forEach(d=>t.observe(d))}const g=JSON.parse(document.getElementById(\"reviews-json\")?.textContent||\"[]\"),o=document.getElementById(\"review-modal\"),l=document.getElementById(\"review-modal-backdrop\"),s=document.getElementById(\"review-modal-panel\"),f=document.getElementById(\"review-modal-close\"),m=document.getElementById(\"review-modal-photo\"),p=document.getElementById(\"review-modal-name\"),w=document.getElementById(\"review-modal-date\"),h=document.getElementById(\"review-modal-text\");function E(e){const t=g[e];t&&(m.src=t.photo,m.alt=t.name,p.textContent=t.name,w.textContent=t.date,h.textContent=t.fullText||t.text,o.classList.remove(\"hidden\"),o.classList.add(\"flex\"),o.removeAttribute(\"inert\"),document.body.style.overflow=\"hidden\",requestAnimationFrame(()=>{l.style.opacity=\"1\",s.classList.remove(\"translate-y-full\",\"md:translate-y-4\",\"opacity-0\"),s.classList.add(\"translate-y-0\",\"opacity-100\")}))}function r(){l.style.opacity=\"0\",s.classList.add(\"translate-y-full\",\"md:translate-y-4\",\"opacity-0\"),s.classList.remove(\"translate-y-0\",\"opacity-100\"),document.body.style.overflow=\"\",setTimeout(()=>{o.classList.add(\"hidden\"),o.classList.remove(\"flex\"),o.setAttribute(\"inert\",\"\")},300)}document.querySelectorAll(\"[data-review-open]\").forEach(e=>{e.addEventListener(\"click\",()=>{E(Number(e.dataset.reviewOpen))})}),f.addEventListener(\"click\",r),l.addEventListener(\"click\",r);let u=0;s.addEventListener(\"touchstart\",e=>{u=e.touches[0].clientY},{passive:!0}),s.addEventListener(\"touchend\",e=>{e.changedTouches[0].clientY-u>60&&r()},{passive:!0})}document.addEventListener(\"astro:page-load\",y);y();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Team.astro?astro&type=script&index=0&lang.ts","function u(){const l=document.querySelector(\"[data-team-mobile-track]\"),d=document.querySelectorAll(\"[data-team-dot]\");if(l&&d.length){const t=Array.from(l.children),e=new IntersectionObserver(o=>{o.forEach(g=>{if(g.isIntersecting){const h=t.indexOf(g.target);d.forEach((s,p)=>{const c=p===h;s.classList.toggle(\"bg-[#c45f00]\",c),s.classList.toggle(\"w-6\",c),s.classList.toggle(\"bg-slate-300\",!c),s.classList.toggle(\"w-2\",!c),s.setAttribute(\"aria-current\",c?\"true\":\"false\")})}})},{root:l,threshold:.6});t.forEach(o=>e.observe(o))}const a=document.getElementById(\"teamBookModal\");document.querySelector(\"[data-book-open]\")?.addEventListener(\"click\",()=>a?.showModal()),a?.querySelector(\"[data-book-close]\")?.addEventListener(\"click\",()=>a.close()),a?.addEventListener(\"click\",t=>{t.target===a&&a.close()});const i=document.querySelector(\"[data-team-bottom-row]\");if(!i)return;const n=JSON.parse(document.getElementById(\"team-json\")?.textContent||\"[]\").slice(2);let r=0;function m(){i.innerHTML=\"\";for(let t=0;t<2;t++){const e=n[(r+t)%n.length],o=document.createElement(\"article\");o.className=\"flex flex-col items-center rounded-[22px] bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)] cursor-pointer transition hover:shadow-[0_4px_20px_rgba(15,23,42,0.1)]\",o.innerHTML=`\n          <img src=\"${e.photo.replace(\"/images/team/\",\"/images/team/sm/\")}\" srcset=\"${e.photo.replace(\"/images/team/\",\"/images/team/sm/\")} 1x, ${e.photo} 2x\" alt=\"${e.alt||e.name}\" class=\"mx-auto h-16 w-16 rounded-full object-cover object-top ring-2 ring-white\" width=\"64\" height=\"64\" loading=\"lazy\" />\n          <h3 class=\"mt-3 text-center text-[16px] font-semibold text-slate-900\">${e.name}</h3>\n          <p class=\"mt-1 text-center text-[14px] font-medium text-slate-500\">${e.role}</p>\n          <p class=\"mt-2 text-center text-[16px] leading-[1.55] text-slate-500\">${e.bio}</p>\n        `,i.appendChild(o)}}m(),document.querySelector(\"[data-team-prev]\")?.addEventListener(\"click\",()=>{r=(r-1+n.length)%n.length,m()}),document.querySelector(\"[data-team-next]\")?.addEventListener(\"click\",()=>{r=(r+1)%n.length,m()})}document.addEventListener(\"astro:page-load\",u);u();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Stay.astro?astro&type=script&index=0&lang.ts","function L(){const l=document.querySelector(\"[data-stay-carousel]\"),g=document.querySelectorAll(\"[data-stay-dot]\");if(l&&g.length){const t=Array.from(l.children),n=new IntersectionObserver(d=>{d.forEach(m=>{if(m.isIntersecting){const v=t.indexOf(m.target);g.forEach((c,E)=>{const r=E===v;c.classList.toggle(\"bg-[#c45f00]\",r),c.classList.toggle(\"w-6\",r),c.classList.toggle(\"bg-slate-300\",!r),c.classList.toggle(\"w-2\",!r),c.setAttribute(\"aria-current\",r?\"true\":\"false\")})}})},{root:l,threshold:.6});t.forEach(d=>n.observe(d))}const e=document.getElementById(\"stayLightbox\"),i=document.getElementById(\"stayLightboxImg\"),y=document.getElementById(\"stayLightboxCaption\"),u=document.getElementById(\"stayLightboxCounter\");if(!e||!i)return;const a=[{src:\"/images/stay/stay-room-01.avif\",alt:\"Комнаты размещения\"},{src:\"/images/stay/stay-bathroom-01.avif\",alt:\"Санузлы и бытовые зоны\"},{src:\"/images/stay/stay-lounge-01.avif\",alt:\"Общие пространства\"}];let s=0;function o(t){s=(t%a.length+a.length)%a.length,i.src=a[s].src,i.alt=a[s].alt,y&&(y.textContent=a[s].alt),u&&(u.textContent=`${s+1} / ${a.length}`)}document.querySelectorAll(\"[data-stay-open]\").forEach(t=>{t.addEventListener(\"click\",()=>{const n=Number(t.dataset.stayIndex);o(n),e.showModal()})});function h(){i.src=\"\",e.close()}e.querySelector(\"[data-stay-close]\")?.addEventListener(\"click\",h),e.addEventListener(\"click\",t=>{t.target===e&&h()}),e.querySelector(\"[data-stay-prev]\")?.addEventListener(\"click\",()=>o(s-1)),e.querySelector(\"[data-stay-next]\")?.addEventListener(\"click\",()=>o(s+1)),e.addEventListener(\"keydown\",t=>{t.key===\"ArrowLeft\"&&o(s-1),t.key===\"ArrowRight\"&&o(s+1)});let f=0;e.addEventListener(\"touchstart\",t=>{f=t.touches[0].clientX},{passive:!0}),e.addEventListener(\"touchend\",t=>{const n=f-t.changedTouches[0].clientX;Math.abs(n)>50&&o(n>0?s+1:s-1)})}document.addEventListener(\"astro:page-load\",L);L();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Journey.astro?astro&type=script&index=0&lang.ts","document.querySelectorAll(\"[data-journey-shift-info]\").forEach(t=>{t.addEventListener(\"click\",()=>{const e=t.dataset.journeyShiftInfo;document.dispatchEvent(new CustomEvent(\"shift-modal-open\",{detail:{shiftId:e,tab:\"info\"}}))})});"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Journey.astro?astro&type=script&index=1&lang.ts","function c(){const a=document.querySelectorAll(\"[data-journey-tab]\"),o=document.querySelectorAll(\"[data-journey-panel]\");a.forEach(e=>{e.addEventListener(\"click\",()=>{const t=e.dataset.journeyTab;a.forEach(s=>{const n=s.dataset.journeyTab===t;s.classList.toggle(\"bg-[#fff2e3]\",n),s.classList.toggle(\"text-[#9c3d00]\",n),s.classList.toggle(\"bg-slate-100\",!n),s.classList.toggle(\"text-slate-600\",!n)}),o.forEach(s=>{s.classList.toggle(\"hidden\",s.dataset.journeyPanel!==t)})})})}document.addEventListener(\"astro:page-load\",c);c();function l(a){const o=window.innerWidth<768;document.querySelectorAll(\"[data-age-card]\").forEach(e=>{const t=(e.dataset.ageCard||\"\").startsWith(a);o?e.classList.toggle(\"hidden\",!t):(e.classList.toggle(\"opacity-30\",!t),e.classList.toggle(\"border-[#ec7c00]\",t),e.classList.toggle(\"bg-[#fff8f2]\",t))}),document.querySelectorAll(\"[data-age-item]\").forEach(e=>{const t=e.dataset.ageItem===a;e.classList.toggle(\"hidden\",!t)})}function i(){const a=localStorage.getItem(\"user_age_group\");a&&l(a),document.addEventListener(\"age-personalize\",o=>{const{age:e}=o.detail;l(e)})}document.addEventListener(\"astro:page-load\",i);i();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/Hackathon.astro?astro&type=script&index=0&lang.ts","const r=[{name:\"Разработчик\",desc:\"Пишет код и собирает прототип. Отвечает за техническую часть — без него нечего показывать инвесторам.\"},{name:\"Дизайнер\",desc:\"Делает интерфейс и логотип с помощью AI. Отвечает за то, как продукт выглядит.\"},{name:\"Маркетолог\",desc:\"Придумывает название, слоган, готовит питч. Знает кому и зачем это нужно.\"},{name:\"Финансовый директор\",desc:\"Управляет бюджетом команды — покупает ресурсы, следит чтобы деньги не кончились раньше защиты.\"},{name:\"Стратег\",desc:\"Определяет что делаем, для кого и чем отличаемся от других команд.\"},{name:\"Тестировщик\",desc:\"Ищет баги и слабые места до питча. Задаёт неудобные вопросы своей же команде.\"}],n=document.getElementById(\"role-popup\"),d=document.getElementById(\"role-popup-name\"),s=document.getElementById(\"role-popup-desc\");let t=null;document.querySelectorAll(\".role-badge\").forEach(e=>{e.addEventListener(\"click\",()=>{const o=Number(e.dataset.roleIdx);if(t===o){t=null,n.classList.add(\"hidden\"),e.classList.remove(\"border-orange-400\",\"bg-orange-50\",\"text-orange-700\");return}document.querySelectorAll(\".role-badge\").forEach(a=>a.classList.remove(\"!border-orange-400\",\"!bg-orange-50\",\"!text-orange-700\")),t=o,d.textContent=r[o].name,s.textContent=r[o].desc,n.classList.remove(\"hidden\"),e.classList.add(\"!border-orange-400\",\"!bg-orange-50\",\"!text-orange-700\")})});document.addEventListener(\"click\",e=>{!e.target.closest(\"#hackathon-roles\")&&t!==null&&(t=null,n.classList.add(\"hidden\"),document.querySelectorAll(\".role-badge\").forEach(o=>o.classList.remove(\"!border-orange-400\",\"!bg-orange-50\",\"!text-orange-700\")))});"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/StickyCta.astro?astro&type=script&index=0&lang.ts","let m=!1;function y(){if(m)return;m=!0;const o=document.getElementById(\"hero\"),e=document.getElementById(\"sticky-bar\");document.getElementById(\"sticky-bubble\");const i=document.getElementById(\"desktop-sticky\"),r=document.getElementById(\"desktop-bubble-toggle\"),t=document.getElementById(\"desktop-bubble-panel\");if(e&&e.hasAttribute(\"data-sticky-bar-v2\")&&window.matchMedia(\"(max-width: 767px)\").matches){let a=function(){d=!1,sessionStorage.setItem(n,\"1\"),e.classList.add(\"translate-y-full\",\"opacity-0\",\"pointer-events-none\"),e.setAttribute(\"inert\",\"\")},c=function(){if(d||sessionStorage.getItem(n)===\"1\")return;d=!0;const s=document.getElementById(\"age-bar\");s&&s.classList.add(\"translate-y-full\",\"opacity-0\",\"pointer-events-none\"),e.removeAttribute(\"inert\"),e.classList.remove(\"translate-y-full\",\"opacity-0\",\"pointer-events-none\");const l=e.querySelector(\"[data-sticky-close]\");l?.addEventListener(\"click\",a,{once:!0}),l?.addEventListener(\"touchend\",u=>{u.preventDefault(),a()},{once:!0,passive:!1})};const n=\"ac_sticky_v2_dismissed\";let d=!1;if(sessionStorage.getItem(n)!==\"1\")if(o){const s=new IntersectionObserver(([l])=>{l.isIntersecting||(c(),s.disconnect())},{threshold:0});s.observe(o)}else{const s=()=>{window.scrollY>480&&(c(),window.removeEventListener(\"scroll\",s))};window.addEventListener(\"scroll\",s,{passive:!0}),s()}e.querySelector(\"[data-sticky-call]\")?.addEventListener(\"click\",()=>{try{window.trackGoal?.(\"sticky_call_mobile\")}catch{}}),e.querySelector(\"[data-sticky-wa]\")?.addEventListener(\"click\",()=>{try{window.trackGoal?.(\"sticky_wa_mobile\")}catch{}}),e.querySelector(\"[data-sticky-tg]\")?.addEventListener(\"click\",()=>{try{window.trackGoal?.(\"sticky_tg_mobile\")}catch{}})}if(!window.matchMedia(\"(max-width: 1023px)\").matches&&i&&r&&t){let a=!1;o?new IntersectionObserver(([n])=>{n.isIntersecting?(i.classList.add(\"hidden\"),i.classList.remove(\"lg:flex\")):(i.classList.remove(\"hidden\"),i.classList.add(\"lg:flex\"))},{threshold:.1}).observe(o):(i.classList.remove(\"hidden\"),i.classList.add(\"lg:flex\")),r.addEventListener(\"click\",()=>{a=!a,a?(t.classList.remove(\"hidden\"),requestAnimationFrame(()=>{t.classList.remove(\"scale-95\",\"opacity-0\"),t.classList.add(\"scale-100\",\"opacity-100\")})):(t.classList.add(\"scale-95\",\"opacity-0\"),t.classList.remove(\"scale-100\",\"opacity-100\"),setTimeout(()=>t.classList.add(\"hidden\"),200))}),document.addEventListener(\"click\",c=>{a&&!i.contains(c.target)&&(a=!1,t.classList.add(\"scale-95\",\"opacity-0\"),t.classList.remove(\"scale-100\",\"opacity-100\"),setTimeout(()=>t.classList.add(\"hidden\"),200))})}}document.addEventListener(\"astro:page-load\",y);y();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/ShiftOccupancy.astro?astro&type=script&index=0&lang.ts","function s(){const a=document.querySelector(\"[data-shift-occupancy]\");if(!a)return;const d={idle:a.querySelector('[data-state=\"idle\"]'),loading:a.querySelector('[data-state=\"loading\"]'),loaded:a.querySelector('[data-state=\"loaded\"]')};function o(t){Object.entries(d).forEach(([i,e])=>{e&&(i===t?(e.classList.remove(\"hidden\"),t===\"loading\"&&e.classList.add(\"flex\")):(e.classList.add(\"hidden\"),e.classList.remove(\"flex\")))})}function n(){a.querySelectorAll(\".occupancy-row\").forEach((t,i)=>{setTimeout(()=>{t.style.opacity=\"1\",t.style.transition=\"opacity 0.4s ease\";const e=t.querySelector(\".shift-bar\");e&&(e.style.transition=\"width 0.9s cubic-bezier(0.4,0,0.2,1)\",e.style.width=e.dataset.width||\"0%\"),setTimeout(()=>{const c=t.querySelector(\".shift-label\");c&&(c.style.transition=\"opacity 0.3s ease\",c.style.opacity=\"1\")},700)},i*150)})}a.querySelector(\"[data-check-occupancy]\")?.addEventListener(\"click\",()=>{typeof window.ym<\"u\"&&window.ym(96499295,\"reachGoal\",\"check_places\"),window._tmr=window._tmr||[],window._tmr.push({type:\"reachGoal\",id:3755202,value:100,goal:\"check_places\"}),o(\"loading\"),setTimeout(()=>{o(\"loaded\"),n()},900)})}document.addEventListener(\"astro:page-load\",s);s();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/GlobalShiftLinkHandler.astro?astro&type=script&index=0&lang.ts","function e(){window.__aidacampShiftLinkHandlerBound||(window.__aidacampShiftLinkHandlerBound=!0,document.addEventListener(\"click\",n=>{const i=n.target?.closest(\"[data-shift-link]\");if(!i)return;const t=i.getAttribute(\"data-shift-id\")||\"\";t&&(n.preventDefault(),document.dispatchEvent(new CustomEvent(\"shift-modal-open\",{detail:{shiftId:t,tab:\"description\"}})),window.acTrack?.(\"shift_link_click\",{shiftId:t}))}))}document.addEventListener(\"astro:page-load\",e);e();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/shifts/ShiftCard.astro?astro&type=script&index=0&lang.ts","document.querySelectorAll(\"article[data-shift-card]\").forEach(e=>{let n=0,a=0;e.addEventListener(\"pointerdown\",t=>{n=t.clientX,a=t.clientY}),e.addEventListener(\"click\",t=>{if(t.target.closest(\"button, a\"))return;const c=Math.abs(t.clientX-n),r=Math.abs(t.clientY-a);c>8||r>8||e.querySelector(\"[data-shift-book]\")?.click()})});"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/MobileMenu.astro?astro&type=script&index=0&lang.ts","function o(){const s=document.getElementById(\"mobile-menu-btn\"),c=document.getElementById(\"mobile-menu-close\"),e=document.getElementById(\"mobile-menu\"),t=document.getElementById(\"burger-icon\"),n=document.getElementById(\"close-icon\");function l(){e?.classList.remove(\"hidden\"),e?.classList.add(\"flex\"),t?.classList.add(\"hidden\"),n?.classList.remove(\"hidden\"),n&&(n.style.display=\"\"),document.body.style.overflow=\"hidden\"}function d(){e?.classList.add(\"hidden\"),e?.classList.remove(\"flex\"),t?.classList.remove(\"hidden\"),n?.classList.add(\"hidden\"),document.body.style.overflow=\"\"}s?.addEventListener(\"click\",l),c?.addEventListener(\"click\",d),e?.querySelectorAll(\".mobile-nav-link\").forEach(i=>{i.addEventListener(\"click\",d)})}document.addEventListener(\"astro:page-load\",o);o();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/HeroModals.astro?astro&type=script&index=0&lang.ts","function c(){const o=document.getElementById(\"bookingReminderModal\");o?.querySelector(\"[data-booking-reminder-close]\")?.addEventListener(\"click\",()=>o.close()),o?.addEventListener(\"click\",n=>{n.target===o&&o.close()});const e=document.getElementById(\"equipmentModal\"),i=()=>e?.showModal();document.getElementById(\"equipment-stamp\")?.addEventListener(\"click\",i),document.getElementById(\"equipment-stamp-mobile\")?.addEventListener(\"click\",i),e?.querySelector(\"[data-equip-close]\")?.addEventListener(\"click\",()=>e.close()),e?.addEventListener(\"click\",n=>{n.target===e&&e.close()});const t=document.getElementById(\"hero-booking-block\");let d=!1;function l(){d||!t||(d=!0,t.style.maxHeight=\"700px\",t.style.paddingTop=\"1rem\",t.style.paddingBottom=\"1.5rem\",t.style.opacity=\"1\",t.style.pointerEvents=\"auto\")}setTimeout(()=>{const n=document.getElementById(\"hero\");if(!n)return;const r=n.getBoundingClientRect();window.innerWidth<1024&&r.bottom>0&&l()},3e4)}document.addEventListener(\"astro:page-load\",c);c();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/components/VideoModal.astro?astro&type=script&index=0&lang.ts","function o(){const e=document.getElementById(\"videoFrame\"),t=document.getElementById(\"videoModal\");e&&(e.src=\"\"),t?.close()}function d(){const e=document.getElementById(\"videoModal\"),t=document.getElementById(\"videoModalClose\");e&&(t?.addEventListener(\"click\",o),e.addEventListener(\"click\",n=>{n.target===e&&o()}))}document.addEventListener(\"astro:page-load\",d);d();"],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gallery.astro?astro&type=script&index=0&lang.ts","document.querySelectorAll(\".dropzone\").forEach(e=>{const n=e.querySelector(\"input[type=file]\"),d=e.querySelector(\"[data-status]\"),l=e.querySelector(\"progress\"),c=e.dataset.name;function i(t){s(\"loading\",\"⏳ Загрузка...\"),l.value=0;const r=new FormData;r.append(\"file\",t),r.append(\"name\",c);const a=new XMLHttpRequest;a.open(\"POST\",\"/api/admin/gallery-upload\"),a.upload.onprogress=o=>{o.lengthComputable&&(l.value=o.loaded/o.total*100)},a.onload=()=>{try{const o=JSON.parse(a.responseText);if(o.ok){s(\"success\",\"✓ Готово!\");const u=e.closest(\".row\")?.querySelector(\"img\");u&&(u.src=`/images/gallery/thumbs/${c}.avif?t=${Date.now()}`)}else s(\"error\",\"✗ \"+(o.error??\"Ошибка\"))}catch{s(\"error\",\"✗ Ошибка сервера\")}},a.onerror=()=>s(\"error\",\"✗ Нет связи\"),a.send(r)}function s(t,r){e.classList.remove(\"loading\",\"success\",\"error\"),t&&e.classList.add(t),d.textContent=r}e.addEventListener(\"dragover\",t=>{t.preventDefault(),e.classList.add(\"drag-over\")}),e.addEventListener(\"dragleave\",()=>e.classList.remove(\"drag-over\")),e.addEventListener(\"drop\",t=>{t.preventDefault(),e.classList.remove(\"drag-over\");const r=t.dataTransfer?.files[0];r&&i(r)}),n.addEventListener(\"change\",()=>{const t=n.files?.[0];t&&(i(t),n.value=\"\")})});"],["/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/hero.astro?astro&type=script&index=0&lang.ts","document.querySelectorAll(\".dropzone\").forEach(e=>{const l=e.querySelector(\"input[type=file]\"),u=e.querySelector(\".dz-status\"),p=e.querySelector(\"progress\"),n=e.dataset.slug;function i(t){a(\"loading\",\"⏳ Загрузка...\");const r=new FormData;r.append(\"file\",t),r.append(\"slug\",n);const o=new XMLHttpRequest;o.open(\"POST\",\"/api/admin/hero-upload\"),o.upload.onprogress=s=>{s.lengthComputable&&(p.value=s.loaded/s.total*100)},o.onload=()=>{try{const s=JSON.parse(o.responseText);if(s.ok){a(\"success\",\"✓ Загружено!\");const d=document.querySelector(`#row-${n} .preview`);d&&(d.innerHTML=`<img src=\"/images/hero/thumbs/${n}.avif?t=${Date.now()}\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover\">`);const c=document.getElementById(`badge-${n}`);c&&(c.textContent=\"✓ есть\",c.className=\"badge badge-good\")}else a(\"error\",\"✗ \"+(s.error??\"Ошибка\"))}catch{a(\"error\",\"✗ Ошибка сервера\")}},o.onerror=()=>a(\"error\",\"✗ Нет связи\"),o.send(r)}function a(t,r){e.classList.remove(\"loading\",\"success\",\"error\"),t&&e.classList.add(t),u.textContent=r}e.addEventListener(\"dragover\",t=>{t.preventDefault(),e.classList.add(\"drag-over\")}),e.addEventListener(\"dragleave\",()=>e.classList.remove(\"drag-over\")),e.addEventListener(\"drop\",t=>{t.preventDefault(),e.classList.remove(\"drag-over\");const r=t.dataTransfer?.files[0];r&&i(r)}),l.addEventListener(\"change\",()=>{const t=l.files?.[0];t&&(i(t),l.value=\"\")})});"]],"assets":["/f5bd0a7e08fa4610830ab6ea73abd373.txt","/favicon.ico","/favicon.svg","/robots.txt","/sitemap.xml","/_astro/BookingBar.astro_astro_type_script_index_0_lang.BkQJuU88.js","/_astro/BookingInfoModal.astro_astro_type_script_index_0_lang.B2ZRLdOg.js","/_astro/LeadForm.astro_astro_type_script_index_0_lang.DyJz2ajc.js","/_astro/ShiftModal.astro_astro_type_script_index_0_lang.B2W0P05n.js","/_astro/Shifts.astro_astro_type_script_index_0_lang.JpJ39W0X.js","/_astro/form-submit.Dy9dZnP0.js","/fonts/comfortaa-cyrillic.woff2","/fonts/comfortaa-latin.woff2","/fonts/inter-cyrillic.woff2","/fonts/inter-latin.woff2","/images/hero-custom-2026-04-07-1100.avif","/images/hero-custom-2026-04-07-600.avif","/images/hero-custom-2026-04-07-900.avif","/images/hero-custom-2026-04-07-950.avif","/images/hero-custom-2026-04-07.avif","/images/merch-hoodie.avif","/images/schedule-day.avif","/images/даша+саша.avif","/images/даша+саша.png","/assets/icons/aida-logo-original.svg","/images/gallery/IMG_7209.avif","/images/gallery/IMG_7212.avif","/images/gallery/IMG_7219.avif","/images/gallery/camp-group-beanbags.avif","/images/gallery/camp-smile.avif","/images/gallery/camp-two-beanbags.avif","/images/gallery/food-buffet.avif","/images/gallery/food-kids-peace.avif","/images/gallery/food-tray.avif","/images/gallery/gallery-01.avif","/images/gallery/gallery-03.avif","/images/gallery/gallery-04-400.avif","/images/gallery/gallery-04.avif","/images/gallery/gallery-05-400.avif","/images/gallery/gallery-05.avif","/images/gallery/gallery-06.avif","/images/gallery/gallery-08.avif","/images/gallery/gallery-10.avif","/images/gallery/gallery-11.avif","/images/gallery/gallery-12.avif","/images/gallery/hackathon-present-400.avif","/images/gallery/hackathon-present.avif","/images/gallery/hackathon-present.jpg","/images/gallery/pool-interior.avif","/images/gallery/pool-kids-edge.avif","/images/gallery/pool-noodles.avif","/images/gallery/sport-ball.avif","/images/gallery/sport-field.avif","/images/gallery/sport-football.avif","/images/gallery/sport-goal.avif","/images/gallery/sport-volleyball.avif","/images/gallery/study-coding.avif","/images/gallery/study-dome-group.avif","/images/gallery/study-dome-row.avif","/images/gallery/study-pitch.avif","/images/gallery/study-stage-girl.avif","/images/gallery/territory-admin.avif","/images/gallery/territory-alley.avif","/images/gallery/territory-korpus.avif","/images/articles/apatiya-1200.avif","/images/articles/apatiya-1200.jpg","/images/articles/apatiya-1600.avif","/images/articles/apatiya-1600.jpg","/images/articles/apatiya-800.avif","/images/articles/apatiya-800.jpg","/images/articles/bez-telefonov-1200.avif","/images/articles/bez-telefonov-1200.jpg","/images/articles/bez-telefonov-1600.avif","/images/articles/bez-telefonov-1600.jpg","/images/articles/bez-telefonov-800.avif","/images/articles/bez-telefonov-800.jpg","/images/articles/ekonomika-lagerya-1200.avif","/images/articles/ekonomika-lagerya-1200.jpg","/images/articles/ekonomika-lagerya-1600.avif","/images/articles/ekonomika-lagerya-1600.jpg","/images/articles/ekonomika-lagerya-800.avif","/images/articles/ekonomika-lagerya-800.jpg","/images/articles/hakaton-1200.avif","/images/articles/hakaton-1200.jpg","/images/articles/hakaton-1600.avif","/images/articles/hakaton-1600.jpg","/images/articles/hakaton-800.avif","/images/articles/hakaton-800.jpg","/images/articles/igromaniya-1200.avif","/images/articles/igromaniya-1200.jpg","/images/articles/igromaniya-1600.avif","/images/articles/igromaniya-1600.jpg","/images/articles/igromaniya-800.avif","/images/articles/igromaniya-800.jpg","/images/articles/ii-programmista-1200.avif","/images/articles/ii-programmista-1200.jpg","/images/articles/ii-programmista-1600.avif","/images/articles/ii-programmista-1600.jpg","/images/articles/ii-programmista-800.avif","/images/articles/ii-programmista-800.jpg","/images/articles/kuda-letom-1200.avif","/images/articles/kuda-letom-1200.jpg","/images/articles/kuda-letom-1600.avif","/images/articles/kuda-letom-1600.jpg","/images/articles/kuda-letom-800.avif","/images/articles/kuda-letom-800.jpg","/images/articles/ne-hochet-uchitsya-1200.avif","/images/articles/ne-hochet-uchitsya-1200.jpg","/images/articles/ne-hochet-uchitsya-1600.avif","/images/articles/ne-hochet-uchitsya-1600.jpg","/images/articles/ne-hochet-uchitsya-800.avif","/images/articles/ne-hochet-uchitsya-800.jpg","/images/articles/priznaki-zavisimosti-1200.avif","/images/articles/priznaki-zavisimosti-1200.jpg","/images/articles/priznaki-zavisimosti-1600.avif","/images/articles/priznaki-zavisimosti-1600.jpg","/images/articles/priznaki-zavisimosti-800.avif","/images/articles/priznaki-zavisimosti-800.jpg","/images/articles/problemy-obshcheniya-1200.avif","/images/articles/problemy-obshcheniya-1200.jpg","/images/articles/problemy-obshcheniya-1600.avif","/images/articles/problemy-obshcheniya-1600.jpg","/images/articles/problemy-obshcheniya-800.avif","/images/articles/problemy-obshcheniya-800.jpg","/images/articles/profilaktika-zavisimosti-1200.avif","/images/articles/profilaktika-zavisimosti-1200.jpg","/images/articles/profilaktika-zavisimosti-1600.avif","/images/articles/profilaktika-zavisimosti-1600.jpg","/images/articles/profilaktika-zavisimosti-800.avif","/images/articles/profilaktika-zavisimosti-800.jpg","/images/articles/samootsenka-1200.avif","/images/articles/samootsenka-1200.jpg","/images/articles/samootsenka-1600.avif","/images/articles/samootsenka-1600.jpg","/images/articles/samootsenka-800.avif","/images/articles/samootsenka-800.jpg","/images/articles/zavisimost-hub-1200.avif","/images/articles/zavisimost-hub-1200.jpg","/images/articles/zavisimost-hub-1600.avif","/images/articles/zavisimost-hub-1600.jpg","/images/articles/zavisimost-hub-800.avif","/images/articles/zavisimost-hub-800.jpg","/images/articles/zavisimost-izbavitsya-1200.avif","/images/articles/zavisimost-izbavitsya-1200.jpg","/images/articles/zavisimost-izbavitsya-1600.avif","/images/articles/zavisimost-izbavitsya-1600.jpg","/images/articles/zavisimost-izbavitsya-800.avif","/images/articles/zavisimost-izbavitsya-800.jpg","/images/articles/zavisimost-lechenie-1200.avif","/images/articles/zavisimost-lechenie-1200.jpg","/images/articles/zavisimost-lechenie-1600.avif","/images/articles/zavisimost-lechenie-1600.jpg","/images/articles/zavisimost-lechenie-800.avif","/images/articles/zavisimost-lechenie-800.jpg","/images/articles/zavisimost-telefona-1200.avif","/images/articles/zavisimost-telefona-1200.jpg","/images/articles/zavisimost-telefona-1600.avif","/images/articles/zavisimost-telefona-1600.jpg","/images/articles/zavisimost-telefona-800.avif","/images/articles/zavisimost-telefona-800.jpg","/images/stay/stay-bathroom-01.avif","/images/stay/stay-lounge-01.avif","/images/stay/stay-room-01.avif","/images/team/team-alex-main-01.avif","/images/team/team-book-main-01.avif","/images/team/team-book-main-01.webp","/images/team/team-daria-main-01.avif","/images/team/team-daria-vorontsova-main-01.avif","/images/team/team-nikita-main-01.avif","/images/team/team-omar-main-01.avif","/images/videos/project-drones.avif","/images/videos/project-explorer.avif","/images/videos/project-farm.avif","/images/videos/project-luigi.avif","/images/videos/project-unity.avif","/images/videos/video-01.avif","/images/videos/video-02.avif","/images/videos/video-03.avif","/images/videos/video-04.avif","/images/videos/video-05.avif","/images/reviews/review-01.jpg","/images/reviews/review-02.jpg","/images/reviews/review-03.jpg","/images/reviews/review-04.jpg","/images/reviews/review-05.jpg","/images/reviews/review-06.jpg","/images/hero/3d-modelirovanie-lager.avif","/images/hero/detskiy-lager-podmoskove.avif","/images/hero/detskiy-lager.avif","/images/hero/dlya-kompaniy.avif","/images/hero/kompyuternyy-lager.avif","/images/hero/kupit-putevku-v-lager.avif","/images/hero/lager-bez-telefonov.avif","/images/hero/lager-dlya-podrostkov.avif","/images/hero/lager-dlya-shkolnikov.avif","/images/hero/lager-na-avgust-podmoskove.avif","/images/hero/lager-na-leto-2026.avif","/images/hero/lager-nedorogo.avif","/images/hero/lager-programmirovaniya.avif","/images/hero/lager-v-moskve.avif","/images/hero/lager-v-podmoskove.avif","/images/hero/letnyaya-it-shkola.avif","/images/hero/minecraft-lager.avif","/images/hero/o-lagere.avif","/images/hero/obrazovatelnyy-lager.avif","/images/hero/otzyvy.avif","/images/hero/python-lager.avif","/images/hero/roblox-lager.avif","/images/hero/scratch-lager.avif","/images/hero/tematicheskiy-lager.avif","/images/gallery/thumbs/IMG_7209.avif","/images/gallery/thumbs/IMG_7212.avif","/images/gallery/thumbs/IMG_7219.avif","/images/gallery/thumbs/camp-group-beanbags.avif","/images/gallery/thumbs/camp-smile.avif","/images/gallery/thumbs/camp-two-beanbags.avif","/images/gallery/thumbs/food-buffet.avif","/images/gallery/thumbs/food-kids-peace.avif","/images/gallery/thumbs/food-tray.avif","/images/gallery/thumbs/gallery-01.avif","/images/gallery/thumbs/gallery-03.avif","/images/gallery/thumbs/gallery-04.avif","/images/gallery/thumbs/gallery-05.avif","/images/gallery/thumbs/gallery-06.avif","/images/gallery/thumbs/gallery-08.avif","/images/gallery/thumbs/gallery-10.avif","/images/gallery/thumbs/gallery-11.avif","/images/gallery/thumbs/gallery-12.avif","/images/gallery/thumbs/hackathon-present.avif","/images/gallery/thumbs/pool-interior.avif","/images/gallery/thumbs/pool-kids-edge.avif","/images/gallery/thumbs/pool-noodles.avif","/images/gallery/thumbs/sport-ball.avif","/images/gallery/thumbs/sport-field.avif","/images/gallery/thumbs/sport-football.avif","/images/gallery/thumbs/sport-goal.avif","/images/gallery/thumbs/sport-volleyball.avif","/images/gallery/thumbs/study-coding.avif","/images/gallery/thumbs/study-dome-group.avif","/images/gallery/thumbs/study-dome-row.avif","/images/gallery/thumbs/study-pitch.avif","/images/gallery/thumbs/study-stage-girl.avif","/images/gallery/thumbs/territory-admin.avif","/images/gallery/thumbs/territory-alley.avif","/images/gallery/thumbs/territory-korpus.avif","/images/team/sm/team-alex-main-01.avif","/images/team/sm/team-book-main-01.avif","/images/team/sm/team-daria-main-01.avif","/images/team/sm/team-daria-vorontsova-main-01.avif","/images/team/sm/team-nikita-main-01.avif","/images/team/sm/team-omar-main-01.avif","/images/hero/jpg/3d-modelirovanie-lager.jpg","/images/hero/jpg/detskiy-lager-podmoskove.jpg","/images/hero/jpg/detskiy-lager.jpg","/images/hero/jpg/dlya-kompaniy.jpg","/images/hero/jpg/kompyuternyy-lager.jpg","/images/hero/jpg/kupit-putevku-v-lager.jpg","/images/hero/jpg/lager-bez-telefonov.jpg","/images/hero/jpg/lager-dlya-podrostkov.jpg","/images/hero/jpg/lager-dlya-shkolnikov.jpg","/images/hero/jpg/lager-na-avgust-podmoskove.jpg","/images/hero/jpg/lager-na-leto-2026.jpg","/images/hero/jpg/lager-nedorogo.jpg","/images/hero/jpg/lager-programmirovaniya.jpg","/images/hero/jpg/lager-v-moskve.jpg","/images/hero/jpg/lager-v-podmoskove.jpg","/images/hero/jpg/letnyaya-it-shkola.jpg","/images/hero/jpg/minecraft-lager.jpg","/images/hero/jpg/obrazovatelnyy-lager.jpg","/images/hero/jpg/python-lager.jpg","/images/hero/jpg/roblox-lager.jpg","/images/hero/jpg/scratch-lager.jpg","/images/hero/jpg/tematicheskiy-lager.jpg","/images/hero/originals/detskiy-lager-podmoskove.JPG","/images/hero/originals/detskiy-lager.jpg","/images/hero/originals/dlya-kompaniy.jpeg","/images/hero/originals/lager-bez-telefonov.JPG","/images/hero/originals/lager-na-leto-2026.webp","/images/hero/originals/lager-nedorogo.webp","/images/hero/originals/lager-programmirovaniya.JPG","/images/hero/originals/letnyaya-it-shkola.JPG","/images/hero/originals/obrazovatelnyy-lager.jpg","/images/hero/thumbs/3d-modelirovanie-lager.avif","/images/hero/thumbs/detskiy-lager-podmoskove.avif","/images/hero/thumbs/detskiy-lager.avif","/images/hero/thumbs/dlya-kompaniy.avif","/images/hero/thumbs/kompyuternyy-lager.avif","/images/hero/thumbs/kupit-putevku-v-lager.avif","/images/hero/thumbs/lager-bez-telefonov.avif","/images/hero/thumbs/lager-dlya-podrostkov.avif","/images/hero/thumbs/lager-dlya-shkolnikov.avif","/images/hero/thumbs/lager-na-avgust-podmoskove.avif","/images/hero/thumbs/lager-na-leto-2026.avif","/images/hero/thumbs/lager-nedorogo.avif","/images/hero/thumbs/lager-programmirovaniya.avif","/images/hero/thumbs/lager-v-moskve.avif","/images/hero/thumbs/lager-v-podmoskove.avif","/images/hero/thumbs/letnyaya-it-shkola.avif","/images/hero/thumbs/minecraft-lager.avif","/images/hero/thumbs/obrazovatelnyy-lager.avif","/images/hero/thumbs/python-lager.avif","/images/hero/thumbs/roblox-lager.avif","/images/hero/thumbs/scratch-lager.avif","/images/hero/thumbs/tematicheskiy-lager.avif","/_astro/global.UMh5plyO.css","/_astro/ask-test@_@astro.Br4YKuLl.css","/_astro/ask@_@astro.Cm9V7Z_x.css","/_astro/gbp-posts@_@astro.D1JutIqG.css","/_astro/gbp-setup@_@astro.CZqguJrh.css","/3d-modelirovanie-lager/index.html","/404.html","/ai-lager/index.html","/ask/index.html","/ask-test/index.html","/ceny/index.html","/detskiy-lager/index.html","/detskiy-lager-podmoskove/index.html","/dlya-kompaniy/index.html","/it-camp/index.html","/kompyuternyy-lager/index.html","/kupit-putevku-v-lager/index.html","/lager-bez-telefonov/index.html","/lager-dlya-podrostkov/index.html","/lager-dlya-shkolnikov/index.html","/lager-na-avgust-podmoskove/index.html","/lager-na-iyul/index.html","/lager-na-iyun/index.html","/lager-na-leto-2026/index.html","/lager-na-more/index.html","/lager-nedorogo/index.html","/lager-programmirovaniya/index.html","/lager-s-basseynom/index.html","/lager-v-moskve/index.html","/lager-v-podmoskove/index.html","/legal/index.html","/letnyaya-it-shkola/index.html","/minecraft-lager/index.html","/nalogovyj-vychet/index.html","/o-lagere/index.html","/obrazovatelnyy-lager/index.html","/ostavit-otzyv/index.html","/otzyvy/index.html","/politika-vozvrata/index.html","/privacy-policy/index.html","/python-lager/index.html","/roblox-lager/index.html","/scratch-lager/index.html","/stati/chto-vzyat-v-lager/index.html","/stati/detskiy-lager-bez-telefonov/index.html","/stati/dokumenty-licenziya-strahovka/index.html","/stati/hakaton-v-detskom-lagere/index.html","/stati/igromaniya-u-detej/index.html","/stati/ii-zamenit-programmista/index.html","/stati/kak-izbavitsya-ot-zavisimosti-ot-igr/index.html","/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/index.html","/stati/kak-vybrat-lager/index.html","/stati/kuda-det-rebenka-letom/index.html","/stati/lechenie-kompyuternoj-zavisimosti/index.html","/stati/nizkaya-samootsenka-u-rebenka/index.html","/stati/pervyj-raz-v-lagere/index.html","/stati/podrostok-ne-hochet-uchitsya/index.html","/stati/priznaki-kompyuternoj-zavisimosti/index.html","/stati/problemy-v-obschenii-podrostkov/index.html","/stati/profilaktika-kompyuternoj-zavisimosti/index.html","/stati/vnutrennyaya-ekonomika-v-lagere/index.html","/stati/zavisimost-ot-kompyuternyh-igr/index.html","/stati/zavisimost-ot-telefona-u-podrostkov/index.html","/stati/index.html","/tematicheskiy-lager/index.html","/%D0%BF%D0%BE%D0%BF%D1%80%D0%BE%D0%B1%D0%BE%D0%B2%D0%B0%D1%82%D1%8C/index.html","/index.html"],"buildFormat":"directory","checkOrigin":false,"actionBodySizeLimit":1048576,"serverIslandBodySizeLimit":1048576,"allowedDomains":[],"key":"CRRzoT8bj5K47iV1QsCqmiqQWp5IzAx3y9jA0Gqk7Bc=","sessionConfig":{"driver":"unstorage/drivers/fs-lite","options":{"base":"/Users/vladimirafanasev/Aidacamp-cloude/node_modules/.astro/sessions"}},"image":{},"devToolbar":{"enabled":false,"debugInfoOutput":""},"logLevel":"info","shouldInjectCspMetaTags":false}));
					const manifestRoutes = _manifest.routes;
					
					const manifest = Object.assign(_manifest, {
					  renderers,
					  actions: () => import('./noop-entrypoint_BOlrdqWF.mjs'),
					  middleware: () => import('../virtual_astro_middleware.mjs'),
					  sessionDriver: () => import('./_virtual_astro_session-driver_Bk3Q189E.mjs'),
					  
					  serverIslandMappings: () => import('./_virtual_astro_server-island-manifest_CQQ1F5PF.mjs'),
					  routes: manifestRoutes,
					  pageMap,
					});

const createApp$1 = ({ streaming } = {}) => {
  return new App(manifest, streaming);
};

const createApp = createApp$1;

const mode = "standalone";
const client = "file:///Users/vladimirafanasev/Aidacamp-cloude/dist/client/";
const server = "file:///Users/vladimirafanasev/Aidacamp-cloude/dist/server/";
const host = false;
const port = 4321;
const staticHeaders = false;
const bodySizeLimit = 1073741824;
const experimentalDisableStreaming = false;

const options = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  bodySizeLimit,
  client,
  experimentalDisableStreaming,
  host,
  mode,
  port,
  server,
  staticHeaders
}, Symbol.toStringTag, { value: 'Module' }));

const createOutgoingHttpHeaders = (headers) => {
  if (!headers) {
    return void 0;
  }
  const nodeHeaders = Object.fromEntries(headers.entries());
  if (Object.keys(nodeHeaders).length === 0) {
    return void 0;
  }
  if (headers.has("set-cookie")) {
    const cookieHeaders = headers.getSetCookie();
    if (cookieHeaders.length > 1) {
      nodeHeaders["set-cookie"] = cookieHeaders;
    }
  }
  return nodeHeaders;
};

function getFirstForwardedValue(multiValueHeader) {
  return multiValueHeader?.toString().split(",").map((e) => e.trim())[0];
}
function sanitizeHost(hostname) {
  if (!hostname) return void 0;
  if (/[/\\]/.test(hostname)) return void 0;
  return hostname;
}
function parseHost(host) {
  const parts = host.split(":");
  return {
    hostname: parts[0],
    port: parts[1]
  };
}
function matchesAllowedDomains(hostname, protocol, port, allowedDomains) {
  const hostWithPort = port ? `${hostname}:${port}` : hostname;
  const urlString = `${protocol}://${hostWithPort}`;
  if (!URL.canParse(urlString)) {
    return false;
  }
  const testUrl = new URL(urlString);
  return allowedDomains.some((pattern) => matchPattern(testUrl, pattern));
}
function validateHost(host, protocol, allowedDomains) {
  if (!host || host.length === 0) return void 0;
  if (!allowedDomains || allowedDomains.length === 0) return void 0;
  const sanitized = sanitizeHost(host);
  if (!sanitized) return void 0;
  const { hostname, port } = parseHost(sanitized);
  if (matchesAllowedDomains(hostname, protocol, port, allowedDomains)) {
    return sanitized;
  }
  return void 0;
}
function validateForwardedHeaders(forwardedProtocol, forwardedHost, forwardedPort, allowedDomains) {
  const result = {};
  if (forwardedProtocol) {
    if (allowedDomains && allowedDomains.length > 0) {
      const hasProtocolPatterns = allowedDomains.some((pattern) => pattern.protocol !== void 0);
      if (hasProtocolPatterns) {
        try {
          const testUrl = new URL(`${forwardedProtocol}://example.com`);
          const isAllowed = allowedDomains.some(
            (pattern) => matchPattern(testUrl, { protocol: pattern.protocol })
          );
          if (isAllowed) {
            result.protocol = forwardedProtocol;
          }
        } catch {
        }
      } else if (/^https?$/.test(forwardedProtocol)) {
        result.protocol = forwardedProtocol;
      }
    }
  }
  if (forwardedPort && allowedDomains && allowedDomains.length > 0) {
    const hasPortPatterns = allowedDomains.some((pattern) => pattern.port !== void 0);
    if (hasPortPatterns) {
      const isAllowed = allowedDomains.some((pattern) => pattern.port === forwardedPort);
      if (isAllowed) {
        result.port = forwardedPort;
      }
    }
  }
  if (forwardedHost && forwardedHost.length > 0 && allowedDomains && allowedDomains.length > 0) {
    const protoForValidation = result.protocol || "https";
    const sanitized = sanitizeHost(forwardedHost);
    if (sanitized) {
      const { hostname, port: portFromHost } = parseHost(sanitized);
      const portForValidation = result.port || portFromHost;
      if (matchesAllowedDomains(hostname, protoForValidation, portForValidation, allowedDomains)) {
        result.host = sanitized;
      }
    }
  }
  return result;
}

function createRequest(req, {
  skipBody = false,
  allowedDomains = [],
  bodySizeLimit,
  port: serverPort
} = {}) {
  const controller = new AbortController();
  const isEncrypted = "encrypted" in req.socket && req.socket.encrypted;
  const providedProtocol = isEncrypted ? "https" : "http";
  const untrustedHostname = req.headers.host ?? req.headers[":authority"];
  const validated = validateForwardedHeaders(
    getFirstForwardedValue(req.headers["x-forwarded-proto"]),
    getFirstForwardedValue(req.headers["x-forwarded-host"]),
    getFirstForwardedValue(req.headers["x-forwarded-port"]),
    allowedDomains
  );
  const protocol = validated.protocol ?? providedProtocol;
  const validatedHostname = validateHost(
    typeof untrustedHostname === "string" ? untrustedHostname : void 0,
    protocol,
    allowedDomains
  );
  const hostname = validated.host ?? validatedHostname ?? "localhost";
  const port = validated.port ?? (!validated.host && !validatedHostname && serverPort ? String(serverPort) : void 0);
  let url;
  try {
    const hostnamePort = getHostnamePort(hostname, port);
    url = new URL(`${protocol}://${hostnamePort}${req.url}`);
  } catch {
    const hostnamePort = getHostnamePort(hostname, port);
    url = new URL(`${protocol}://${hostnamePort}`);
  }
  const options = {
    method: req.method || "GET",
    headers: makeRequestHeaders(req),
    signal: controller.signal
  };
  const bodyAllowed = options.method !== "HEAD" && options.method !== "GET" && skipBody === false;
  if (bodyAllowed) {
    Object.assign(options, makeRequestBody(req, bodySizeLimit));
  }
  const request = new Request(url, options);
  const socket = getRequestSocket(req);
  if (socket && typeof socket.on === "function") {
    const existingCleanup = getAbortControllerCleanup(req);
    if (existingCleanup) {
      existingCleanup();
    }
    let cleanedUp = false;
    const removeSocketListener = () => {
      if (typeof socket.off === "function") {
        socket.off("close", onSocketClose);
      } else if (typeof socket.removeListener === "function") {
        socket.removeListener("close", onSocketClose);
      }
    };
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      removeSocketListener();
      controller.signal.removeEventListener("abort", cleanup);
      Reflect.deleteProperty(req, nodeRequestAbortControllerCleanupSymbol);
    };
    const onSocketClose = () => {
      cleanup();
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
    socket.on("close", onSocketClose);
    controller.signal.addEventListener("abort", cleanup, { once: true });
    Reflect.set(req, nodeRequestAbortControllerCleanupSymbol, cleanup);
    if (socket.destroyed) {
      onSocketClose();
    }
  }
  const hostValidated = validated.host !== void 0 || validatedHostname !== void 0;
  const forwardedClientIp = hostValidated ? getFirstForwardedValue(req.headers["x-forwarded-for"]) : void 0;
  const clientIp = forwardedClientIp || req.socket?.remoteAddress;
  if (clientIp) {
    Reflect.set(request, clientAddressSymbol, clientIp);
  }
  return request;
}
async function writeResponse(source, destination) {
  const { status, headers, body, statusText } = source;
  if (!(destination instanceof Http2ServerResponse)) {
    destination.statusMessage = statusText;
  }
  destination.writeHead(status, createOutgoingHttpHeaders(headers));
  const cleanupAbortFromDestination = getAbortControllerCleanup(
    destination.req ?? void 0
  );
  if (cleanupAbortFromDestination) {
    const runCleanup = () => {
      cleanupAbortFromDestination();
      if (typeof destination.off === "function") {
        destination.off("finish", runCleanup);
        destination.off("close", runCleanup);
      } else {
        destination.removeListener?.("finish", runCleanup);
        destination.removeListener?.("close", runCleanup);
      }
    };
    destination.on("finish", runCleanup);
    destination.on("close", runCleanup);
  }
  if (!body) return destination.end();
  try {
    const reader = body.getReader();
    destination.on("close", () => {
      reader.cancel().catch((err) => {
        console.error(
          `There was an uncaught error in the middle of the stream while rendering ${destination.req.url}.`,
          err
        );
      });
    });
    let result = await reader.read();
    while (!result.done) {
      destination.write(result.value);
      result = await reader.read();
    }
    destination.end();
  } catch (err) {
    destination.write("Internal server error", () => {
      err instanceof Error ? destination.destroy(err) : destination.destroy();
    });
  }
}
function getHostnamePort(hostname, port) {
  const portInHostname = typeof hostname === "string" && /:\d+$/.test(hostname);
  const hostnamePort = portInHostname ? hostname : `${hostname}${port ? `:${port}` : ""}`;
  return hostnamePort;
}
function makeRequestHeaders(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === void 0) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else {
      headers.append(name, value);
    }
  }
  return headers;
}
function makeRequestBody(req, bodySizeLimit) {
  if (req.body !== void 0) {
    if (typeof req.body === "string" && req.body.length > 0) {
      return { body: Buffer.from(req.body) };
    }
    if (typeof req.body === "object" && req.body !== null && Object.keys(req.body).length > 0) {
      return { body: Buffer.from(JSON.stringify(req.body)) };
    }
    if (typeof req.body === "object" && req.body !== null && typeof req.body[Symbol.asyncIterator] !== "undefined") {
      return asyncIterableToBodyProps(req.body, bodySizeLimit);
    }
  }
  return asyncIterableToBodyProps(req, bodySizeLimit);
}
function asyncIterableToBodyProps(iterable, bodySizeLimit) {
  const source = bodySizeLimit != null ? limitAsyncIterable(iterable, bodySizeLimit) : iterable;
  return {
    // Node uses undici for the Request implementation. Undici accepts
    // a non-standard async iterable for the body.
    // @ts-expect-error
    body: source,
    // The duplex property is required when using a ReadableStream or async
    // iterable for the body. The type definitions do not include the duplex
    // property because they are not up-to-date.
    duplex: "half"
  };
}
async function* limitAsyncIterable(iterable, limit) {
  let received = 0;
  for await (const chunk of iterable) {
    const byteLength = chunk instanceof Uint8Array ? chunk.byteLength : typeof chunk === "string" ? Buffer.byteLength(chunk) : 0;
    received += byteLength;
    if (received > limit) {
      throw new Error(`Body size limit exceeded: received more than ${limit} bytes`);
    }
    yield chunk;
  }
}
function getAbortControllerCleanup(req) {
  if (!req) return void 0;
  const cleanup = Reflect.get(req, nodeRequestAbortControllerCleanupSymbol);
  return typeof cleanup === "function" ? cleanup : void 0;
}
function getRequestSocket(req) {
  if (req.socket && typeof req.socket.on === "function") {
    return req.socket;
  }
  const http2Socket = req.stream?.session?.socket;
  if (http2Socket && typeof http2Socket.on === "function") {
    return http2Socket;
  }
  return void 0;
}

function resolveClientDir(options) {
  const clientURLRaw = new URL(options.client);
  const serverURLRaw = new URL(options.server);
  const rel = path.relative(url.fileURLToPath(serverURLRaw), url.fileURLToPath(clientURLRaw));
  const serverFolder = path.basename(options.server);
  let serverEntryFolderURL = path.dirname(import.meta.url);
  let previous = "";
  while (!serverEntryFolderURL.endsWith(serverFolder)) {
    if (serverEntryFolderURL === previous) {
      throw new Error(
        `[@astrojs/node] Could not find the server directory "${serverFolder}" by walking up from "${import.meta.url}". This can happen when the server entry point is bundled into a single file (e.g. with esbuild) so that import.meta.url no longer contains the original "${serverFolder}" path segment. When bundling the server entry, make sure the output path contains a "${serverFolder}" directory segment, or avoid bundling the server entry entirely.`
      );
    }
    previous = serverEntryFolderURL;
    serverEntryFolderURL = path.dirname(serverEntryFolderURL);
  }
  const serverEntryURL = serverEntryFolderURL + "/entry.mjs";
  const clientURL = new URL(appendForwardSlash(rel), serverEntryURL);
  return url.fileURLToPath(clientURL);
}

async function readErrorPageFromDisk(client, status) {
  const filePaths = [`${status}.html`, `${status}/index.html`];
  for (const filePath of filePaths) {
    const fullPath = path.join(client, filePath);
    let stream;
    try {
      stream = createReadStream(fullPath);
      await new Promise((resolve, reject) => {
        stream.once("open", () => resolve());
        stream.once("error", reject);
      });
      const webStream = Readable.toWeb(stream);
      return new Response(webStream, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch {
      stream?.destroy();
    }
  }
  return void 0;
}
function createAppHandler(app, options) {
  const als = new AsyncLocalStorage();
  const logger = app.getAdapterLogger();
  process.on("unhandledRejection", (reason) => {
    const requestUrl = als.getStore();
    logger.error(`Unhandled rejection while rendering ${requestUrl}`);
    console.error(reason);
  });
  const client = resolveClientDir(options);
  const prerenderedErrorPageFetch = async (url) => {
    const { pathname } = new URL(url);
    if (pathname.endsWith("/404.html") || pathname.endsWith("/404/index.html")) {
      const response = await readErrorPageFromDisk(client, 404);
      if (response) return response;
    }
    if (pathname.endsWith("/500.html") || pathname.endsWith("/500/index.html")) {
      const response = await readErrorPageFromDisk(client, 500);
      if (response) return response;
    }
    return new Response(null, { status: 404 });
  };
  const effectiveBodySizeLimit = options.bodySizeLimit === 0 || options.bodySizeLimit === Number.POSITIVE_INFINITY ? void 0 : options.bodySizeLimit;
  return async (req, res, next, locals) => {
    let request;
    try {
      request = createRequest(req, {
        allowedDomains: app.getAllowedDomains?.() ?? [],
        bodySizeLimit: effectiveBodySizeLimit,
        port: options.port
      });
    } catch (err) {
      logger.error(`Could not render ${req.url}`);
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
      return;
    }
    const routeData = app.match(request, true);
    if (routeData && !(routeData.type === "page" && routeData.prerender)) {
      const response = await als.run(
        request.url,
        () => app.render(request, {
          addCookieHeader: true,
          locals,
          routeData,
          prerenderedErrorPageFetch
        })
      );
      await writeResponse(response, res);
    } else if (next) {
      const cleanup = getAbortControllerCleanup(req);
      if (cleanup) cleanup();
      return next();
    } else {
      const response = await app.render(request, {
        addCookieHeader: true,
        prerenderedErrorPageFetch
      });
      await writeResponse(response, res);
    }
  };
}

const wildcardHosts = /* @__PURE__ */ new Set(["0.0.0.0", "::", "0000:0000:0000:0000:0000:0000:0000:0000"]);
async function logListeningOn(logger, server, configuredHost) {
  await new Promise((resolve) => server.once("listening", resolve));
  const protocol = server instanceof https.Server ? "https" : "http";
  const host = getResolvedHostForHttpServer(configuredHost);
  const { port } = server.address();
  const address = getNetworkAddress(protocol, host, port);
  if (host === void 0 || wildcardHosts.has(host)) {
    logger.info(
      `Server listening on 
  local: ${address.local[0]} 	
  network: ${address.network[0]}
`
    );
  } else {
    logger.info(`Server listening on ${address.local[0]}`);
  }
}
function getResolvedHostForHttpServer(host) {
  if (host === false) {
    return "localhost";
  } else if (host === true) {
    return void 0;
  } else {
    return host;
  }
}
function getNetworkAddress(protocol = "http", hostname, port, base) {
  const NetworkAddress = {
    local: [],
    network: []
  };
  Object.values(os.networkInterfaces()).flatMap((nInterface) => nInterface ?? []).filter((detail) => detail && detail.address && detail.family === "IPv4").forEach((detail) => {
    let host = detail.address.replace(
      "127.0.0.1",
      hostname === void 0 || wildcardHosts.has(hostname) ? "localhost" : hostname
    );
    if (host.includes(":")) {
      host = `[${host}]`;
    }
    const url = `${protocol}://${host}:${port}${""}`;
    if (detail.address.includes("127.0.0.1")) {
      NetworkAddress.local.push(url);
    } else {
      NetworkAddress.network.push(url);
    }
  });
  return NetworkAddress;
}

function resolveStaticPath(client, urlPath) {
  const filePath = path.join(client, urlPath);
  const resolved = path.resolve(filePath);
  const resolvedClient = path.resolve(client);
  if (resolved !== resolvedClient && !resolved.startsWith(resolvedClient + path.sep)) {
    return { filePath: resolved, isDirectory: false };
  }
  let isDirectory = false;
  try {
    isDirectory = fs.lstatSync(filePath).isDirectory();
  } catch {
  }
  return { filePath: resolved, isDirectory };
}
function createStaticHandler(app, options, headersMap) {
  const client = resolveClientDir(options);
  return (req, res, ssr) => {
    if (req.url) {
      let fullUrl = req.url;
      if (req.url.includes("#")) {
        fullUrl = fullUrl.slice(0, req.url.indexOf("#"));
      }
      const [urlPath, urlQuery] = fullUrl.split("?");
      const { isDirectory } = resolveStaticPath(client, app.removeBase(urlPath));
      const hasSlash = urlPath.endsWith("/");
      let pathname = urlPath;
      switch (app.manifest.trailingSlash) {
        case "never": {
          if (isDirectory && urlPath !== "/" && hasSlash) {
            pathname = urlPath.slice(0, -1) + (urlQuery ? "?" + urlQuery : "");
            res.statusCode = 301;
            res.setHeader("Location", pathname);
            return res.end();
          }
          if (isDirectory && !hasSlash) {
            pathname = `${urlPath}/index.html`;
          }
          break;
        }
        case "ignore": {
          if (isDirectory && !hasSlash) {
            pathname = `${urlPath}/index.html`;
          }
          break;
        }
        case "always": {
          if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath)) {
            pathname = urlPath + "/" + (urlQuery ? "?" + urlQuery : "");
            res.statusCode = 301;
            res.setHeader("Location", pathname);
            return res.end();
          }
          break;
        }
      }
      pathname = prependForwardSlash(app.removeBase(pathname));
      const normalizedPathname = path.posix.normalize(pathname);
      const stream = send(req, normalizedPathname, {
        root: client,
        dotfiles: normalizedPathname.startsWith("/.well-known/") ? "allow" : "deny"
      });
      let forwardError = false;
      stream.on("error", (err) => {
        if (forwardError) {
          console.error(err.toString());
          res.writeHead(500);
          res.end("Internal server error");
          return;
        }
        ssr();
      });
      stream.on("headers", (_res) => {
        if (normalizedPathname.startsWith(`/${app.manifest.assetsDir}/`)) {
          _res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      });
      stream.on("file", () => {
        forwardError = true;
      });
      stream.pipe(res);
    } else {
      ssr();
    }
  };
}
function prependForwardSlash(pth) {
  return pth.startsWith("/") ? pth : "/" + pth;
}

const hostOptions = (host) => {
  if (typeof host === "boolean") {
    return host ? "0.0.0.0" : "localhost";
  }
  return host;
};
function standalone(app, options, headersMap) {
  const port = process.env.PORT ? Number(process.env.PORT) : options.port ?? 8080;
  const host = process.env.HOST ?? hostOptions(options.host);
  const resolvedOptions = { ...options, port };
  const handler = createStandaloneHandler(app, resolvedOptions);
  const server = createServer(handler, host, port);
  server.server.listen(port, host);
  if (process.env.ASTRO_NODE_LOGGING !== "disabled") {
    logListeningOn(app.getAdapterLogger(), server.server, host);
  }
  return {
    server,
    done: server.closed()
  };
}
function createStandaloneHandler(app, options, headersMap) {
  const appHandler = createAppHandler(app, options);
  const staticHandler = createStaticHandler(app, options);
  return (req, res) => {
    try {
      decodeURI(req.url);
    } catch {
      res.writeHead(400);
      res.end("Bad request.");
      return;
    }
    staticHandler(req, res, () => appHandler(req, res));
  };
}
function createServer(listener, host, port) {
  let httpServer;
  if (process.env.SERVER_CERT_PATH && process.env.SERVER_KEY_PATH) {
    httpServer = https.createServer(
      {
        key: fs.readFileSync(process.env.SERVER_KEY_PATH),
        cert: fs.readFileSync(process.env.SERVER_CERT_PATH)
      },
      listener
    );
  } else {
    httpServer = http.createServer(listener);
  }
  enableDestroy(httpServer);
  const closed = new Promise((resolve, reject) => {
    httpServer.addListener("close", resolve);
    httpServer.addListener("error", reject);
  });
  const previewable = {
    host,
    port,
    closed() {
      return closed;
    },
    async stop() {
      await new Promise((resolve, reject) => {
        httpServer.destroy((err) => err ? reject(err) : resolve(void 0));
      });
    }
  };
  return {
    server: httpServer,
    ...previewable
  };
}

const app = createApp({ streaming: true });
const handler = createStandaloneHandler(app, options);
const startServer = () => standalone(app, options);
if (process.env.ASTRO_NODE_AUTOSTART !== "disabled") {
  startServer();
}

export { startServer as a, handler as h, options as o, renderComponent as r, spreadAttributes as s };
