import { au as openBlock, av as createBlock, aw as defineComponent } from "./vendor-C3NrspRX.js";
import { _ as _export_sfc, B as BlockFrame } from "./BlockFrame-BowLW7Bk.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Hero.story",
  setup(__props, { expose: __expose }) {
    __expose();
    const __returned__ = { BlockFrame };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createBlock($setup["BlockFrame"], {
    id: "blocks-hero--default",
    title: "Blocks / Hero",
    height: 760
  });
}
_sfc_main.__file = "src/histoire/Hero.story.vue";
const Hero_story = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/root/aidaplus-dev-serverwork/src/histoire/Hero.story.vue"]]);
export {
  Hero_story as default
};
