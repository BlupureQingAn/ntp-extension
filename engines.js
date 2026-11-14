/*
 * 搜索引擎图标生成（独立文件，便于单独调试/校验）
 *
 * 两个必须注意的点：
 * 1) SVG 只写 viewBox 不写 width/height 时，浏览器按替换元素默认值 300×150 渲染，
 *    会把按钮和菜单项全部撑爆——所以每个 SVG 都带显式尺寸，CSS 里也再约束一层。
 * 2) 字形用 <text> 画时，dominant-baseline 对中文和拉丁字母的居中基准并不一致，
 *    纯靠 CSS 调不准。这里改为：先量出字形真实墨迹框，再烘焙成 translate+scale 变换，
 *    保证圆片内字形在任意字体环境下都精确居中。
 */

const FONT_STACK = "'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', Arial, sans-serif";

const GOOGLE_G_PATHS = '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>'
  + '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>'
  + '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>'
  + '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4.05 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>';

/*
 * 必应官方图标：青绿色圆 + 白色 "b" 箭头。
 * 由用户提供的 500×500 位图矢量描摹而来（cv2 轮廓追踪 + Kåsa 圆拟合，
 * eps=1.5 简化成 13 个顶点，与原图 IoU=0.969），路径坐标已直接映射到 24×24 画布，
 * 圆心 (12,12)、半径 11.6，与其它引擎圆片一致，因此不需要再做居中变换。
 */
const BING_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
  + '<circle cx="12" cy="12" r="11.6" fill="#0E8387"/>'
  + '<path fill="#fff" d="M6.81 5.65 L6.91 5.56 L9.84 6.49 L9.88 13.70 L7.28 16.07 L13.84 12.63 '
  + 'L11.93 11.75 L10.63 8.95 L10.68 8.86 L17.09 10.81 L17.14 14.02 L9.84 18.44 L6.86 16.40 Z"/>'
  + '</svg>';

const ENGINE_DEFS = [
  { name: "Google", url: "https://www.google.com/search?q=", kind: "google", target: 18 },
  { name: "Bing", url: "https://cn.bing.com/search?q=", kind: "custom", svg: BING_SVG },
  { name: "百度", url: "https://www.baidu.com/s?wd=", kind: "chip", color: "#2932E1", glyph: "百", size: 13, target: 11.5, nudge: [-0.41, -0.55] },
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", kind: "chip", color: "#DE5833", glyph: "D", size: 16, target: 12, nudge: [-0.28, -0.19] },
  { name: "搜狗", url: "https://www.sogou.com/web?query=", kind: "chip", color: "#FB7024", glyph: "搜", size: 13, target: 11.5, nudge: [-0.31, -0.44] },
  { name: "360搜索", url: "https://www.so.com/s?q=", kind: "chip", color: "#12B34A", glyph: "360", size: 10, target: 15, nudge: [0.13, -0.43] },
  { name: "Yandex", url: "https://yandex.com/search/?text=", kind: "chip", color: "#FC3F1D", glyph: "Я", size: 16, target: 12, nudge: [-0.24, 0.06] }
];

function buildRawSvg(def) {
  if (def.kind === "custom") {
    // 已经是最终坐标的成品 SVG（如必应官方图标），直接用，不再做居中变换
    return def.svg;
  }
  if (def.kind === "google") {
    // 白底圆片 + 2px 深灰描边（描边正好压到 viewBox 边缘，圆片看起来是满的）
    return '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
      + '<circle cx="12" cy="12" r="11" fill="#fff" stroke="#bfc5cf" stroke-width="2"/>'
      + '<g data-fit="1">' + GOOGLE_G_PATHS + '</g></svg>';
  }
  return '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<circle cx="12" cy="12" r="11.6" fill="' + def.color + '"/>'
    + '<g data-fit="1"><text x="0" y="0" text-anchor="middle"'
    + ' font-family="' + FONT_STACK + '" font-size="' + def.size + '" font-weight="700"'
    + ' fill="#fff">' + def.glyph + '</text></g></svg>';
}

/**
 * 用 canvas 量文字的真实「墨迹框」（actualBoundingBox* 是字形实际着墨范围，不含上下空白）。
 * SVG 的 getBBox() 对 <text> 返回的是字体度量盒，会把 ascent/descent 空白算进去，
 * 居中后拉丁字母会明显偏上——所以文字一律用 canvas 量，图形才用 getBBox（路径 bbox 本身是紧的）。
 *
 * 另外返回「墨迹重心」：把字形画到 canvas 上按 alpha 加权算重心。
 * 外框居中 ≠ 看起来居中——D 的竖干在左、Я 的竖干在右、搜的偏旁在下，
 * 外框完全居中时视觉上依然是歪的。所以文字按重心居中（光学居中），
 * 图形（官方 logo）则保留原始设计位置不动。
 */
function measureTextMetrics(glyph, size) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = "700 " + size + "px " + FONT_STACK;
  const m = ctx.measureText(glyph);
  const left = m.actualBoundingBoxLeft || 0;
  const right = m.actualBoundingBoxRight || 0;
  const asc = m.actualBoundingBoxAscent || 0;
  const desc = m.actualBoundingBoxDescent || 0;
  const w = left + right;
  const h = asc + desc;
  if (!w || !h) return null;

  // 关键：canvas measureText 的对齐点是「文字起点」，而 SVG 里用的是
  // text-anchor="middle"（对齐点是字宽中点），两者差了半个字宽，必须减掉 m.width/2，
  // 否则所有字形会整体偏左约半个字宽。
  const half = (m.width || 0) / 2;
  const bboxCx = (right - left) / 2 - half;
  const bboxCy = (desc - asc) / 2;

  const mass = measureTextMass(glyph, size);
  const massCx = mass ? mass.mx - half : bboxCx;
  const massCy = mass ? mass.my : bboxCy;

  return { w: w, h: h, bboxCx: bboxCx, bboxCy: bboxCy, massCx: massCx, massCy: massCy };
}

/** 字形墨迹的 alpha 加权重心，相对文字起点(左对齐)与基线 */
function measureTextMass(glyph, size) {
  const W = 320, H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.font = "700 " + size + "px " + FONT_STACK;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  const originX = 80, baselineY = 200;
  ctx.fillText(glyph, originX, baselineY);
  const data = ctx.getImageData(0, 0, W, H).data;
  let sum = 0, sx = 0, sy = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3] / 255;
      if (a > 0) {
        sum += a;
        sx += a * x;
        sy += a * y;
      }
    }
  }
  if (!sum) return null;
  return { mx: sx / sum - originX, my: sy / sum - baselineY };
}

/**
 * 离屏量出每个图标里字形/图形的真实墨迹框，按 target 缩放后精确居中到圆片中心 (12,12)。
 * 量测容器用 visibility:hidden 而不是 display:none —— display:none 下 getBBox() 拿不到尺寸。
 */
function bakeIcons(defs) {
  const holder = document.createElement("div");
  holder.setAttribute("style",
    "position:fixed;left:-99999px;top:0;width:200px;height:200px;visibility:hidden;pointer-events:none;");
  document.body.appendChild(holder);

  const result = defs.map(function (def) {
    if (def.kind === "custom") {
      return { name: def.name, url: def.url, svg: def.svg };
    }
    holder.innerHTML = buildRawSvg(def);
    const svg = holder.querySelector("svg");
    const g = svg.querySelector("g[data-fit]");

    let box = null;
    if (def.kind === "google") {
      const bb = g.getBBox();
      if (bb && bb.width > 0 && bb.height > 0) {
        box = { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, w: bb.width, h: bb.height };
      }
    } else {
      const m = measureTextMetrics(def.glyph, def.size);
      if (m) {
        // 文字按墨迹重心居中（光学居中），保证视觉上不偏
        box = { cx: m.massCx, cy: m.massCy, w: m.w, h: m.h };
      }
    }

    if (box) {
      const scale = def.target / Math.max(box.w, box.h);
      // nudge 是按实际显示尺寸(40px)实测出来的残差补偿，单位为 24 单位画布坐标
      const nx = def.nudge ? def.nudge[0] : 0;
      const ny = def.nudge ? def.nudge[1] : 0;
      g.setAttribute("transform",
        "translate(" + (12 + nx).toFixed(3) + " " + (12 + ny).toFixed(3) + ") scale("
        + scale.toFixed(4) + ") translate(" + (-box.cx).toFixed(3) + " " + (-box.cy).toFixed(3) + ")");
    }
    return { name: def.name, url: def.url, svg: svg.outerHTML };
  });

  document.body.removeChild(holder);
  return result;
}

const engines = bakeIcons(ENGINE_DEFS);
