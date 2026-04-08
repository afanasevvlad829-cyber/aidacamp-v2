const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/About.story-CZ1bNN3W.js","assets/vendor-C3NrspRX.js","assets/BlockFrame-BowLW7Bk.js","assets/Booking.story-wQxa98mw.js","assets/FAQ.story-CEtjN4ef.js","assets/Gallery.story-B1B6GPVD.js","assets/Hero.story-Baaxcyr8.js","assets/Nav.story-D73iEIOo.js","assets/Reviews.story-CFKvBgEn.js","assets/Shifts.story-CmM88bp9.js","assets/HomeView.vue-Cp54wwKC.js","assets/story-D1gG_SBU.js","assets/StoryView.vue-BSdVIPpZ.js","assets/responsive-BTTME3U9.js","assets/BaseEmpty.vue-C9zxhKLO.js","assets/state-p4lLwhf3.js"])))=>i.map(i=>d[i]);
import { O as Comp8, P as defineAsyncComponent, Q as useDark, R as useToggle, k as watch, S as createRouter, U as createWebHistory, V as createWebHashHistory, d as defineComponent, n as ref, W as watchEffect, X as markRaw, y as createBlock, Y as mergeProps, Z as resolveDynamicComponent, g as createCommentVNode, o as openBlock, A as reactive } from "./vendor-C3NrspRX.js";
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const Comp0 = defineAsyncComponent(() => __vitePreload(() => import("./About.story-CZ1bNN3W.js"), true ? __vite__mapDeps([0,1,2]) : void 0));
const Comp1 = defineAsyncComponent(() => __vitePreload(() => import("./Booking.story-wQxa98mw.js"), true ? __vite__mapDeps([3,1,2]) : void 0));
const Comp2 = defineAsyncComponent(() => __vitePreload(() => import("./FAQ.story-CEtjN4ef.js"), true ? __vite__mapDeps([4,1,2]) : void 0));
const Comp3 = defineAsyncComponent(() => __vitePreload(() => import("./Gallery.story-B1B6GPVD.js"), true ? __vite__mapDeps([5,1,2]) : void 0));
const Comp4 = defineAsyncComponent(() => __vitePreload(() => import("./Hero.story-Baaxcyr8.js"), true ? __vite__mapDeps([6,1,2]) : void 0));
const Comp5 = defineAsyncComponent(() => __vitePreload(() => import("./Nav.story-D73iEIOo.js"), true ? __vite__mapDeps([7,1,2]) : void 0));
const Comp6 = defineAsyncComponent(() => __vitePreload(() => import("./Reviews.story-CFKvBgEn.js"), true ? __vite__mapDeps([8,1,2]) : void 0));
const Comp7 = defineAsyncComponent(() => __vitePreload(() => import("./Shifts.story-CmM88bp9.js"), true ? __vite__mapDeps([9,1,2]) : void 0));
let files = [
  { "id": "src-histoire-about-story-vue", "path": ["Blocks ", " About"], "filePath": "src/histoire/About.story.vue", "story": { "id": "src-histoire-about-story-vue", "title": " About", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-about-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 0, component: Comp0, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-about-story-vue-Cbfa7eux.js"), true ? [] : void 0) },
  { "id": "src-histoire-booking-story-vue", "path": ["Blocks ", " Booking"], "filePath": "src/histoire/Booking.story.vue", "story": { "id": "src-histoire-booking-story-vue", "title": " Booking", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-booking-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 1, component: Comp1, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-booking-story-vue-D1tflcZl.js"), true ? [] : void 0) },
  { "id": "src-histoire-faq-story-vue", "path": ["Blocks ", " FAQ"], "filePath": "src/histoire/FAQ.story.vue", "story": { "id": "src-histoire-faq-story-vue", "title": " FAQ", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-faq-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 2, component: Comp2, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-faq-story-vue-CmGKGcmA.js"), true ? [] : void 0) },
  { "id": "src-histoire-gallery-story-vue", "path": ["Blocks ", " Gallery"], "filePath": "src/histoire/Gallery.story.vue", "story": { "id": "src-histoire-gallery-story-vue", "title": " Gallery", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-gallery-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 3, component: Comp3, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-gallery-story-vue-CPbHzpCt.js"), true ? [] : void 0) },
  { "id": "src-histoire-hero-story-vue", "path": ["Blocks ", " Hero"], "filePath": "src/histoire/Hero.story.vue", "story": { "id": "src-histoire-hero-story-vue", "title": " Hero", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-hero-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 4, component: Comp4, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-hero-story-vue-BlYJAvuk.js"), true ? [] : void 0) },
  { "id": "src-histoire-nav-story-vue", "path": ["Blocks ", " Nav"], "filePath": "src/histoire/Nav.story.vue", "story": { "id": "src-histoire-nav-story-vue", "title": " Nav", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-nav-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 5, component: Comp5, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-nav-story-vue-hl8ilCXc.js"), true ? [] : void 0) },
  { "id": "src-histoire-reviews-story-vue", "path": ["Blocks ", " Reviews"], "filePath": "src/histoire/Reviews.story.vue", "story": { "id": "src-histoire-reviews-story-vue", "title": " Reviews", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-reviews-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 6, component: Comp6, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-reviews-story-vue-DX7Jkb4X.js"), true ? [] : void 0) },
  { "id": "src-histoire-shifts-story-vue", "path": ["Blocks ", " Shifts"], "filePath": "src/histoire/Shifts.story.vue", "story": { "id": "src-histoire-shifts-story-vue", "title": " Shifts", "layout": { "type": "single", "iframe": true }, "docsOnly": false, "variants": [{ "id": "src-histoire-shifts-story-vue-0", "title": "Default" }] }, "supportPluginId": "vue3", "index": 7, component: Comp7, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_src-histoire-shifts-story-vue-aRuir8nT.js"), true ? [] : void 0) },
  { "id": "tailwind", "path": ["Tailwind"], "filePath": "/root/aidaplus-dev-serverwork/node_modules/.histoire/plugins/builtin_tailwind-tokens/Tailwind.story.js", "story": { "id": "tailwind", "title": "Tailwind", "group": "design-system", "layout": { "type": "single", "iframe": false }, "icon": "mdi:tailwind", "docsOnly": false, "variants": [{ "id": "background-color", "title": "Background Color", "icon": "carbon:color-palette" }, { "id": "text-color", "title": "Text Color", "icon": "carbon:text-color" }, { "id": "border-color", "title": "Border Color", "icon": "carbon:color-palette" }, { "id": "padding", "title": "Padding", "icon": "carbon:area" }, { "id": "margin", "title": "Margin", "icon": "carbon:area" }, { "id": "font-size", "title": "Font Size", "icon": "carbon:text-font" }, { "id": "font-weight", "title": "Font Weight", "icon": "carbon:text-font" }, { "id": "font-family", "title": "Font Family", "icon": "carbon:text-font" }, { "id": "letter-spacing", "title": "Letter Spacing", "icon": "carbon:text-font" }, { "id": "line-height", "title": "Line Height", "icon": "carbon:text-font" }, { "id": "drop-shadow", "title": "Drop Shadow", "icon": "carbon:shape-except" }, { "id": "border-radius", "title": "Border Radius", "icon": "carbon:condition-wait-point" }, { "id": "border-width", "title": "Border Width", "icon": "carbon:checkbox" }, { "id": "width", "title": "Width", "icon": "carbon:pan-horizontal" }, { "id": "height", "title": "Height", "icon": "carbon:pan-vertical" }, { "id": "full-config", "title": "Full Config", "icon": "carbon:code" }] }, "supportPluginId": "vanilla", "index": 8, component: Comp8, source: () => __vitePreload(() => import("./__resolved__virtual_story-source_tailwind-JAs9LV6S.js"), true ? [] : void 0) }
];
let tree = [{ "group": true, "id": "design-system", "title": "Design System", "children": [{ "title": "Tailwind", "index": 8 }] }, { "title": "Blocks ", "children": [{ "title": " About", "index": 0 }, { "title": " Booking", "index": 1 }, { "title": " FAQ", "index": 2 }, { "title": " Gallery", "index": 3 }, { "title": " Hero", "index": 4 }, { "title": " Nav", "index": 5 }, { "title": " Reviews", "index": 6 }, { "title": " Shifts", "index": 7 }] }];
const config = { "plugins": [{ "name": "builtin:tailwind-tokens" }, { "name": "builtin:vanilla-support", "supportPlugin": { "id": "vanilla", "moduleName": "/root/aidaplus-dev-serverwork/node_modules/histoire/dist/node/builtin-plugins/vanilla-support", "setupFn": "setupVanilla" } }, { "name": "@histoire/plugin-vue", "supportPlugin": { "id": "vue3", "moduleName": "@histoire/plugin-vue", "setupFn": "setupVue3", "importStoriesPrepend": "import { defineAsyncComponent as defineAsyncComponentVue3 } from 'vue'" }, "commands": [{ "id": "histoire:plugin-vue:generate-story", "label": "Generate Vue 3 story from component", "icon": "https://vuejs.org/logo.svg", "searchText": "generate create", "clientSetupFile": "@histoire/plugin-vue/dist/commands/generate-story.client.js" }] }], "outDir": "/root/aidaplus-dev-serverwork/.histoire/dist", "storyMatch": ["src/histoire/**/*.story.vue"], "storyIgnored": ["**/node_modules/**", "**/dist/**"], "supportMatch": [{ "id": "vanilla", "patterns": ["**/*.js"], "pluginIds": ["vanilla"] }, { "id": "vue", "patterns": ["**/*.vue"], "pluginIds": ["vue3"] }], "tree": { "file": "title", "order": "asc", "title": "AidaCamp Viewer Layer", "groups": [{ "id": "design-system", "title": "Design System" }] }, "theme": { "title": "Histoire", "colors": { "primary": { "50": "#ecfdf5", "100": "#d1fae5", "200": "#a7f3d0", "300": "#6ee7b7", "400": "#34d399", "500": "#10b981", "600": "#059669", "700": "#047857", "800": "#065f46", "900": "#064e3b" }, "gray": { "50": "#fafafa", "100": "#f4f4f5", "200": "#e4e4e7", "300": "#d4d4d8", "400": "#a1a1aa", "500": "#71717a", "600": "#52525b", "700": "#3f3f46", "750": "#323238", "800": "#27272a", "850": "#1f1f21", "900": "#18181b", "950": "#101012" } }, "defaultColorScheme": "auto", "storeColorScheme": true, "darkClass": "dark" }, "responsivePresets": [{ "label": "Mobile (Small)", "width": 320, "height": 560 }, { "label": "Mobile (Medium)", "width": 360, "height": 640 }, { "label": "Mobile (Large)", "width": 414, "height": 896 }, { "label": "Tablet", "width": 768, "height": 1024 }, { "label": "Laptop (Small)", "width": 1024, "height": null }, { "label": "Laptop (Large)", "width": 1366, "height": null }, { "label": "Desktop", "width": 1920, "height": null }, { "label": "4K", "width": 3840, "height": null }], "backgroundPresets": [{ "label": "Transparent", "color": "transparent", "contrastColor": "#333" }, { "label": "White", "color": "#fff", "contrastColor": "#333" }, { "label": "Light gray", "color": "#aaa", "contrastColor": "#000" }, { "label": "Dark gray", "color": "#333", "contrastColor": "#fff" }, { "label": "Black", "color": "#000", "contrastColor": "#eee" }], "sandboxDarkClass": "dark", "routerMode": "history", "build": { "excludeFromVendorsChunk": [] }, "viteIgnorePlugins": [] };
const logos = {};
const histoireConfig = config;
const customLogos = logos;
const isDark = useDark({
  valueDark: "htw-dark",
  initialValue: histoireConfig.theme.defaultColorScheme,
  storageKey: "histoire-color-scheme",
  storage: histoireConfig.theme.storeColorScheme ? localStorage : sessionStorage
});
const toggleDark = useToggle(isDark);
function applyDarkToControls() {
  window.__hst_controls_dark?.forEach((ref2) => {
    ref2.value = isDark.value;
  });
}
watch(isDark, () => {
  applyDarkToControls();
}, {
  immediate: true
});
window.__hst_controls_dark_ready = () => {
  applyDarkToControls();
};
const base = "/";
function createRouterHistory() {
  switch (histoireConfig.routerMode) {
    case "hash":
      return createWebHashHistory(base);
    case "history":
    default:
      return createWebHistory(base);
  }
}
const router = createRouter({
  history: createRouterHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => __vitePreload(() => import("./HomeView.vue-Cp54wwKC.js"), true ? __vite__mapDeps([10,11,1]) : void 0)
    },
    {
      path: "/story/:storyId",
      name: "story",
      component: () => __vitePreload(() => import("./StoryView.vue-BSdVIPpZ.js"), true ? __vite__mapDeps([12,1,11,13,14,15]) : void 0)
    }
  ]
});
const clientSupportPlugins = {
  "vanilla": () => __vitePreload(() => import("./vendor-C3NrspRX.js").then((n) => n.aF), true ? [] : void 0),
  "vue3": () => __vitePreload(() => import("./vendor-C3NrspRX.js").then((n) => n.aG), true ? [] : void 0)
};
const __default__ = {
  inheritAttrs: false
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __name: "GenericMountStory",
  props: {
    story: {}
  },
  setup(__props) {
    const props = __props;
    const mountComponent = ref(null);
    watchEffect(async () => {
      const clientPlugin = clientSupportPlugins[props.story.file?.supportPluginId];
      if (clientPlugin) {
        const pluginModule = await clientPlugin();
        mountComponent.value = markRaw(pluginModule.MountStory);
      }
    });
    return (_ctx, _cache) => {
      return mountComponent.value ? (openBlock(), createBlock(resolveDynamicComponent(mountComponent.value), mergeProps({
        key: 0,
        class: "histoire-generic-mount-story",
        story: __props.story
      }, _ctx.$attrs), null, 16, ["story"])) : createCommentVNode("", true);
    };
  }
});
function mapFile(file, existingFile) {
  let result;
  {
    result = {
      ...file,
      component: markRaw(file.component),
      story: {
        ...file.story,
        title: file.story.title,
        file: markRaw(file),
        variants: file.story.variants.map((v) => mapVariant(v)),
        slots: () => ({})
      }
    };
  }
  return result;
}
function mapVariant(variant, existingVariant) {
  let result;
  {
    result = {
      ...variant,
      state: reactive({
        _hPropState: {},
        _hPropDefs: {}
      }),
      setupApp: null,
      slots: () => ({}),
      previewReady: false
    };
  }
  return result;
}
export {
  __vitePreload as _,
  _sfc_main as a,
  tree as b,
  customLogos as c,
  clientSupportPlugins as d,
  base as e,
  files as f,
  histoireConfig as h,
  isDark as i,
  mapFile as m,
  router as r,
  toggleDark as t
};
