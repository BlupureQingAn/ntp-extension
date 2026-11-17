/*
 * 存储适配层：一份代码，两种运行环境
 *
 * ── 扩展环境（chrome://newtab， Manifest V3）─────────────────────
 *   用 chrome.storage.local：
 *     · 由浏览器进程管理，写入事务化，重启电脑不会丢
 *     · 默认 10MB，配 unlimitedStorage 权限后不受限（壁纸 base64 随便放）
 *     · 不受「清除浏览数据 / Cookie 和网站数据」影响
 *   这是修复「重启后壁纸消失」的核心。
 *
 * ── 网站环境（GitHub Pages 等普通 https 页面）─────────────────────
 *   没有 chrome API，回退到 localStorage（行为与旧版一致）。
 *
 * 对外全部是 Promise 接口，调用方不用关心底层是哪种。
 */
(function (global) {
  'use strict';

  var HAS_EXT = !!(typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);

  var api = {
    isExtension: HAS_EXT,

    // keys: 字符串或字符串数组；返回 Promise<对象>
    get: function (keys) {
      if (HAS_EXT) {
        return new Promise(function (resolve) {
          chrome.storage.local.get(keys, function (data) { resolve(data || {}); });
        });
      }
      var list = Array.isArray(keys) ? keys : [keys];
      var out = {};
      list.forEach(function (k) {
        try { out[k] = localStorage.getItem(k) == null ? undefined : localStorage.getItem(k); }
        catch (e) { out[k] = undefined; }
      });
      return Promise.resolve(out);
    },

    // obj: { key: value }；返回 Promise
    set: function (obj) {
      if (HAS_EXT) {
        return new Promise(function (resolve, reject) {
          chrome.storage.local.set(obj, function () {
            var err = (typeof chrome.runtime !== 'undefined') && chrome.runtime.lastError;
            if (err) reject(new Error(err.message)); else resolve();
          });
        });
      }
      try {
        Object.keys(obj).forEach(function (k) { localStorage.setItem(k, obj[k]); });
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    },

    // keys: 字符串或字符串数组；返回 Promise
    remove: function (keys) {
      if (HAS_EXT) {
        return new Promise(function (resolve) {
          chrome.storage.local.remove(keys, function () { resolve(); });
        });
      }
      var list = Array.isArray(keys) ? keys : [keys];
      list.forEach(function (k) {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      return Promise.resolve();
    }
  };

  global.Store = api;
})(window);
