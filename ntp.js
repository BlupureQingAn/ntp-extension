/* 搜索引擎图标由 engines.js 提供（engines 数组） */



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

// 本地存储读取
// 注意：索引必须做范围校验，否则一旦存进越界值，engines[idx] 为 undefined，
// renderEngineIcon 会抛错，图标和菜单会一起挂掉
let currentEngineIdx = Number(localStorage.getItem('engineIdx'));
if (!Number.isInteger(currentEngineIdx) || currentEngineIdx < 0 || currentEngineIdx >= engines.length) {
  currentEngineIdx = 0;
}
let savedBg = localStorage.getItem('wallpaper');
let savedCustomLogo = localStorage.getItem('customLogo');

// 恢复壁纸
if(savedBg){
  bgLayer.style.backgroundImage = `url(${savedBg})`;
  bgLayer.classList.add('has-img');
}

// 恢复自定义Logo
if(savedCustomLogo){
  logoImage.src = savedCustomLogo;
  logoImage.hidden = false;
  logoText.hidden = true;
}

// 渲染搜索引擎下拉菜单
function renderEngineMenu(){
  engineMenu.innerHTML = '';
  engines.forEach((item, idx)=>{
    const div = document.createElement('button');
    div.className = 'engine-item' + (idx === currentEngineIdx ? ' active' : '');
    div.innerHTML = `${item.svg}<span>${item.name}</span>${idx===currentEngineIdx?'<span class="check">✓</span>':''}`;
    div.onclick = ()=>{
      currentEngineIdx = idx;
      localStorage.setItem('engineIdx', idx);
      renderEngineIcon();
      renderEngineMenu();
      engineMenu.hidden = true;
    };
    engineMenu.appendChild(div);
  });
}

// 渲染当前引擎图标
function renderEngineIcon(){
  engineIconWrap.innerHTML = engines[currentEngineIdx].svg;
}

renderEngineIcon();
renderEngineMenu();

// 切换引擎菜单显示隐藏
engineBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  engineMenu.hidden = !engineMenu.hidden;
});

document.addEventListener('click', ()=>{
  engineMenu.hidden = true;
});

// 搜索提交逻辑
searchForm.addEventListener('submit', function(e){
  e.preventDefault();
  const text = searchInput.value.trim();
  if(!text) return;

  // 判断是否网址
  const isUrl = /^(https?:\/\/|www\.)/.test(text);
  let targetUrl;
  if(isUrl){
    targetUrl = text.startsWith('http') ? text : `https://${text}`;
  }else{
    targetUrl = engines[currentEngineIdx].url + encodeURIComponent(text);
  }
  location.href = targetUrl;
});

// 设置面板开关
settingsBtn.onclick = ()=> panel.hidden = false;
closePanel.onclick = ()=> panel.hidden = true;

// 上传壁纸
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
      localStorage.setItem('wallpaper', dataUrl);
      bgLayer.style.backgroundImage = `url(${dataUrl})`;
      bgLayer.classList.add('has-img');
    }
  };
  reader.readAsDataURL(file);
};

// 重置壁纸
resetBg.onclick = ()=>{
  localStorage.removeItem('wallpaper');
  bgLayer.style.backgroundImage = '';
  bgLayer.classList.remove('has-img');
};

// 上传Logo
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
      localStorage.setItem('customLogo', dataUrl);
      logoImage.src = dataUrl;
      logoImage.hidden = false;
      logoText.hidden = true;
    }
  };
  reader.readAsDataURL(file);
};

// 重置Logo
resetLogo.onclick = ()=>{
  localStorage.removeItem('customLogo');
  logoImage.hidden = true;
  logoText.hidden = false;
};

// 快捷键 / 聚焦搜索框
document.addEventListener('keydown', e=>{
  if(e.key === '/' && document.activeElement !== searchInput){
    e.preventDefault();
    searchInput.focus();
  }
})
