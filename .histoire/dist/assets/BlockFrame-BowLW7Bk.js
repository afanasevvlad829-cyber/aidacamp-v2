import { ax as resolveComponent, au as openBlock, av as createBlock, ay as withCtx, az as createVNode, aA as createBaseVNode, aB as normalizeStyle, aw as defineComponent } from "./vendor-C3NrspRX.js";
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BlockFrame",
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    height: { type: Number, required: false }
  },
  setup(__props, { expose: __expose }) {
    __expose();
    const __returned__ = {};
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
const _hoisted_1 = { style: { "padding": "16px", "background": "#eef2f6", "min-height": "100vh" } };
const _hoisted_2 = ["src"];
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_Variant = resolveComponent("Variant");
  const _component_Story = resolveComponent("Story");
  return openBlock(), createBlock(_component_Story, { title: $props.title }, {
    default: withCtx(() => [
      createVNode(_component_Variant, { title: "Default" }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("iframe", {
              src: `http://159.194.210.65:9292/iframe.html?id=${$props.id}`,
              style: normalizeStyle({ width: "100%", height: `${$props.height || 900}px`, border: "1px solid #d8e1eb", borderRadius: "16px", background: "#fff" })
            }, null, 12, _hoisted_2)
          ])
        ]),
        _: 1
        /* STABLE */
      })
    ]),
    _: 1
    /* STABLE */
  }, 8, ["title"]);
}
_sfc_main.__file = "src/histoire/BlockFrame.vue";
const BlockFrame = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "/root/aidaplus-dev-serverwork/src/histoire/BlockFrame.vue"]]);
export {
  BlockFrame as B,
  _export_sfc as _
};
