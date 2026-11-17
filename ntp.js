/* 搜索引擎图标由 engines.js 提供（engines 数组） */
/* 存储由 storage.js 提供（Store 适配器：扩展用 chrome.storage，网站用 localStorage） */

const bgLayer = document.getElementById('bgLayer');
const settingsBtn = document.getElementById('settingsBtn');
const panel = document.getElementById('panel');
const closePanel = document.getElementById('closePanel');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const resetBg = document.getElementById('resetBg');
const logoUploadBtn = document.getElementById('logoUploadBtn');
const logoFileInput = document.getElementById('logoFileInput');
const resetLogo = document.getElementById('resetLogo');

const logoText = document.getElementById('logoText');
const logoImage = document.getElementById('logoImage');

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const engineBtn = document.getElementById('engineBtn');
const engineIconWrap = document.getElementById('engineIconWrap');
const engineMenu = document.getElementById('engineMenu');

// 运行时状态
let currentEngineIdx = 0;

// ===== 渲染搜索引擎下拉菜单 =====
function renderEngineMenu(){
  engineMenu.innerHTML = '';
  engines.forEach((item, idx)=>{
    const div = document.createElement('button');
    div.className = 'engine-item' + (idx === currentEngineIdx ? ' active' : '');
    div.innerHTML = `${item.svg}<span>${item.name}</span>${idx===currentEngineIdx?'<span class="check">✓</span>':''}`;
    div.onclick = ()=>{
      currentEngineIdx = idx;
      Store.set({ engineIdx: idx }).catch(()=>{});
      renderEngineIcon();
      renderEngineMenu();
      engineMenu.hidden = true;
    };
    engineMenu.appendChild(div);
  });
}

// ===== 渲染当前引擎图标 =====
function renderEngineIcon(){
  engineIconWrap.innerHTML = engines[currentEngineIdx].svg;
}

// ===== 初始化：异步读取存储，再恢复界面 =====
// 关键：必须等 Store.get 完成后再渲染，否则 currentEngineIdx 还是默认值 0，
// 会把用户上次选的引擎、壁纸、Logo 全部覆盖成初始状态。
(async function init(){
  let data = {};
  try { data = await Store.get(['engineIdx', 'wallpaper', 'customLogo']); }
  catch(e) { /* 读取失败就用默认值，不让整页挂掉 */ }

  // 一次性迁移：扩展首次启用新版时，若 chrome.storage 为空但旧 localStorage 里有数据，
  // 搬过去。这样"重启前设过、升级后还没重设"的壁纸也不会丢。
  if (Store.isExtension) {
    const migrate = {};
    ['engineIdx', 'wallpaper', 'customLogo'].forEach(k=>{
      if ((data[k] === undefined || data[k] === null)) {
        let legacy = null;
        try { legacy = localStorage.getItem(k); } catch(e) {}
        if (legacy !== null) migrate[k] = legacy;
      }
    });
    if (Object.keys(migrate).length) {
      data = Object.assign({}, data, migrate);
      try { await Store.set(migrate); } catch(e) {}
    }
  }

  // 引擎索引必须做范围校验，否则越界值会让 engines[idx] 为 undefined，
  // renderEngineIcon 抛错，图标和菜单一起挂掉。
  let idx = Number(data.engineIdx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= engines.length) idx = 0;
  currentEngineIdx = idx;

  // 恢复壁纸
  if (data.wallpaper) {
    bgLayer.style.backgroundImage = `url(${data.wallpaper})`;
    bgLayer.classList.add('has-img');
  }
  // 恢复自定义 Logo
  if (data.customLogo) {
    logoImage.src = data.customLogo;
    logoImage.hidden = false;
    logoText.hidden = true;
  }

  renderEngineIcon();
  renderEngineMenu();
})();

// ===== 切换引擎菜单显示隐藏 =====
engineBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  engineMenu.hidden = !engineMenu.hidden;
});
document.addEventListener('click', ()=>{
  engineMenu.hidden = true;
});

// ===== 搜索提交逻辑 =====
searchForm.addEventListener('submit', function(e){
  e.preventDefault();
  const text = searchInput.value.trim();
  if(!text) return;

  const isUrl = /^(https?:\/\/|www\.)/.test(text);
  let targetUrl;
  if(isUrl){
    targetUrl = text.startsWith('http') ? text : `https://${text}`;
  }else{
    targetUrl = engines[currentEngineIdx].url + encodeURIComponent(text);
  }
  location.href = targetUrl;
});

// ===== 设置面板开关 =====
settingsBtn.onclick = ()=> panel.hidden = false;
closePanel.onclick = ()=> panel.hidden = true;

// ===== 上传壁纸 =====
uploadBtn.onclick = ()=> fileInput.click();
fileInput.onchange = function(){
  const file = this.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    const img = new Image();
    img.src = ev.target.result;
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxW = 2560;
      let w = img.width, h = img.height;
      if(w>maxW){
        h = h * maxW / w;
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img,0,0,w,h);
      const dataUrl = canvas.toDataURL('image/jpeg',0.85);

      Store.set({ wallpaper: dataUrl }).then(()=>{
        bgLayer.style.backgroundImage = `url(${dataUrl})`;
        bgLayer.classList.add('has-img');
      }).catch(err=>{
        alert('壁纸保存失败：' + err.message + '\n（图片可能过大，请换一张小一些的）');
      });
    }
  };
  reader.readAsDataURL(file);
};

// ===== 重置壁纸 =====
resetBg.onclick = ()=>{
  Store.remove('wallpaper').catch(()=>{});
  bgLayer.style.backgroundImage = '';
  bgLayer.classList.remove('has-img');
};

// ===== 上传 Logo =====
logoUploadBtn.onclick = ()=> logoFileInput.click();
logoFileInput.onchange = function(){
  const file = this.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    const img = new Image();
    img.src = ev.target.result;
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxW = 480;
      const maxH = 80;
      let w = img.width, h = img.height;
      if(w/h > maxW/maxH){
        w = maxW;
        h = img.height * maxW / img.width;
      }else{
        h = maxH;
        w = img.width * maxH / img.height;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img,0,0,w,h);
      const dataUrl = canvas.toDataURL('image/png');

      Store.set({ customLogo: dataUrl }).then(()=>{
        logoImage.src = dataUrl;
        logoImage.hidden = false;
        logoText.hidden = true;
      }).catch(err=>{
        alert('Logo 保存失败：' + err.message);
      });
    }
  };
  reader.readAsDataURL(file);
};

// ===== 重置 Logo =====
resetLogo.onclick = ()=>{
  Store.remove('customLogo').catch(()=>{});
  logoImage.hidden = true;
  logoText.hidden = false;
};

// ===== 快捷键 / 聚焦搜索框 =====
document.addEventListener('keydown', e=>{
  if(e.key === '/' && document.activeElement !== searchInput){
    e.preventDefault();
    searchInput.focus();
  }
})
