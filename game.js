(() => {
  // ===================== DOM =====================
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const elKills = document.getElementById("kills");
  const elScore = document.getElementById("score");
  const elTime  = document.getElementById("time");
  const elHp    = document.getElementById("hp");
  const elWordCount = document.getElementById("wordCount");
  const elCombo = document.getElementById("combo");
  const elMult  = document.getElementById("mult");

  // Level HUD (optional)
  const elLevel = document.getElementById("level");
  const elLevelName = document.getElementById("levelName");
  const elLevelKills = document.getElementById("levelKills");
  const elLevelTarget = document.getElementById("levelTarget");

  // Boss HUD
  const elBossHud = document.getElementById("bossHud");
  const elBossHpFill = document.getElementById("bossHpFill");
  const elBossHpText = document.getElementById("bossHpText");

  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnRestart = document.getElementById("btnRestart");
  const btnPlayAgain = document.getElementById("btnPlayAgain");

  const speed = document.getElementById("speed");
  const speedVal = document.getElementById("speedVal");
  const spawn = document.getElementById("spawn");
  const spawnVal = document.getElementById("spawnVal");

  const typingInput = document.getElementById("typingInput");
  const keymapMode = document.getElementById("keymapMode");

  const overlay = document.getElementById("overlay");
  const overTitle = document.getElementById("overTitle");
  const overKills = document.getElementById("overKills");
  const overScore = document.getElementById("overScore");
  const overTime  = document.getElementById("overTime");

  // Lexicon modal
  const btnLexicon = document.getElementById("btnLexicon");
  const lexiconModal = document.getElementById("lexiconModal");
  const btnLexiconClose = document.getElementById("btnLexiconClose");
  const lexiconText = document.getElementById("lexiconText");
  const btnImportJson = document.getElementById("btnImportJson");
  const btnImportCsv = document.getElementById("btnImportCsv");
  const btnExportJson = document.getElementById("btnExportJson");
  const btnResetDefault = document.getElementById("btnResetDefault");
  const lexiconCount = document.getElementById("lexiconCount");
  const lexiconMsg = document.getElementById("lexiconMsg");

  // ===================== Utils =====================
  const rand = (a,b)=>Math.random()*(b-a)+a;
  const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`);

  const normalizeZhuyin = (s) => (s || "")
    // 只移除空白；保留聲調符號（ˊˇˋ˙），用來「必須含聲調」的比對
    .replace(/\s+/g, "")
    .trim();

  // ===== Pronunciation index: han -> set(zhuyin) (含聲調) =====
  let HAN_TO_ZY = new Map();
  function rebuildPronIndex(){
    HAN_TO_ZY = new Map();
    const words = (window.WORDS || GAME?.activeWords || []).slice();
    for(const w of words){
      const han = String(w?.han ?? "").trim();
      const zy = normalizeZhuyin(String(w?.zy ?? ""));
      if(!han || !zy) continue;
      if(!HAN_TO_ZY.has(han)) HAN_TO_ZY.set(han, new Set());
      HAN_TO_ZY.get(han).add(zy);
    }
  }
  const TONE_RE = /[ˊˇˋ˙]/g;
  const hasToneMark = (s) => /[ˊˇˋ˙]/.test(s || "");
  const stripTone = (s) => (s || "").replace(TONE_RE, "");

  function inputMatchesZy(inputZy, targetZy){
    if(!inputZy || !targetZy) return false;
    // 玩家輸入含聲調 => 嚴格比對；未含聲調 => 以去聲調比對（同音不同調時由目標選擇規則決定命中誰）
    if(hasToneMark(inputZy)) return inputZy === targetZy;
    return stripTone(inputZy) === stripTone(targetZy);
  }
const nowMs = () => performance.now();
// ===== IME / composition buffer (for zhuyin IME "no need to choose character") =====
const IME = { active:false, buffer:"", lastAt:0 };

function getImePreferredText(){
  // If we recently saw zhuyin symbols in composition, prefer that over committed Hanzi.
  if(!IME.buffer) return "";
  if(nowMs() - IME.lastAt > 800) return "";
  if(/[ㄅ-ㄦˊˇˋ˙]/.test(IME.buffer)) return IME.buffer;
  return "";
}

function hardClearInput(){
  if(!typingInput) return;
  typingInput.value = "";
  IME.buffer = "";
  IME.active = false;
  // cancel IME composition reliably (esp. mobile)
  try{
    typingInput.blur();
    setTimeout(()=>typingInput.focus(), 0);
  }catch{}
}


  function vibrate(pattern){
    try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch{}
  }

  // ===================== Audio (可插拔) =====================
  const Music = (() => {
    let audio = null;
    function play(track){
      const url = `./assets/music/${track}`;
      if(!audio){
        audio = new Audio(url);
        audio.loop = true;
        audio.volume = 0.35;
        audio.play().catch(()=>{});
        return;
      }
      audio.pause();
      audio.src = url;
      audio.load();
      audio.play().catch(()=>{});
    }
    return { play };
  })();

  function playSfx(url, vol=0.75){
    if(!url) return;
    try{
      const a = new Audio(url);
      a.volume = vol;
      a.play().catch(()=>{});
    }catch{}
  }

  const SFX = {
    hit: {
      creeper:  "./assets/sfx/hit_creeper.mp3",
      spider:   "./assets/sfx/hit_spider.mp3",
      skeleton: "./assets/sfx/hit_skeleton.mp3",
      witch:    "./assets/sfx/hit_witch.mp3",
      dragon:   "./assets/sfx/hit_dragon.mp3",
      enderman: "./assets/sfx/hit_dragon.mp3",
      ghast:    "./assets/sfx/hit_skeleton.mp3",
      blaze:    "./assets/sfx/hit_skeleton.mp3",
      magma_cube:"./assets/sfx/hit_spider.mp3",
      piglin:   "./assets/sfx/hit_skeleton.mp3",
      item:     "./assets/sfx/hit_skeleton.mp3",
      animal:   "./assets/sfx/hit_spider.mp3",
    },
    ground: "./assets/sfx/hurt_ground.mp3",
    heal: "./assets/sfx/heal.mp3",
    boom: "./assets/sfx/boom.mp3",
    place: "./assets/sfx/place.mp3",
  };

  // ===================== Keymap（可選）=====================
  const KEYMAP = {
    Digit1:"ㄅ", Digit2:"ㄉ", Digit3:"ˇ", Digit4:"ˋ", Digit5:"ㄓ", Digit6:"ˊ", Digit7:"˙",
    Digit8:"ㄚ", Digit9:"ㄞ", Digit0:"ㄢ", Minus:"ㄦ",
    KeyQ:"ㄆ", KeyW:"ㄊ", KeyE:"ㄍ", KeyR:"ㄐ", KeyT:"ㄔ", KeyY:"ㄗ", KeyU:"ㄧ", KeyI:"ㄛ", KeyO:"ㄟ", KeyP:"ㄣ",
    KeyA:"ㄇ", KeyS:"ㄋ", KeyD:"ㄎ", KeyF:"ㄑ", KeyG:"ㄕ", KeyH:"ㄘ", KeyJ:"ㄨ", KeyK:"ㄜ", KeyL:"ㄠ",
    Semicolon:"ㄤ",
    KeyZ:"ㄈ", KeyX:"ㄌ", KeyC:"ㄏ", KeyV:"ㄒ", KeyB:"ㄖ", KeyN:"ㄙ", KeyM:"ㄩ",
    Comma:"ㄝ", Period:"ㄡ", Slash:"ㄥ",
  };

  function applyKeymapToInput(e){
    if(!keymapMode?.checked) return false;
    if(e.ctrlKey || e.metaKey || e.altKey) return false;

    if(e.key === "Backspace"){
      e.preventDefault();
      typingInput.value = typingInput.value.slice(0, -1);
      return true;
    }
    if(e.key === "Escape"){
      e.preventDefault();
      typingInput.value = "";
      return true;
    }

    // 需求：必須按 Enter 才輸出攻擊指令
    if(e.key === "Enter"){
      e.preventDefault();
      submitAttack(typingInput.value);
      return true;
    }

    // keymap 模式下，允許空白當分隔（比對會去空白）
    if(e.key === " "){
      e.preventDefault();
      typingInput.value += " ";
      return true;
    }

    const z = KEYMAP[e.code];
    if(!z) return false;

    e.preventDefault();
    typingInput.value += z;

    // 不在輸入過程中自動攻擊；等待 Enter
    if(typingInput.value.length > 12) typingInput.value = typingInput.value.slice(-12);
    return true;
  }

  // ===================== Levels =====================
  const LEVELS = [
    { id:1,  name:"森林",     bg:"forest",   music:"forest.mp3",   spawnMs: 980, speedMul:1.10, targetKills:10 },
    { id:2,  name:"海洋",     bg:"ocean",    music:"ocean.mp3",    spawnMs: 900, speedMul:1.15, targetKills:20 },
    { id:3,  name:"村莊",     bg:"village",  music:"village.mp3",  spawnMs: 820, speedMul:1.20, targetKills:30 },
    { id:4,  name:"山地",     bg:"mountain", music:"mountain.mp3", spawnMs: 750, speedMul:1.25, targetKills:40 },
    { id:5,  name:"沙地",     bg:"desert",   music:"desert.mp3",   spawnMs: 680, speedMul:1.30, targetKills:50 },
    { id:6,  name:"雪地",     bg:"snow",     music:"snow.mp3",     spawnMs: 620, speedMul:1.35, targetKills:60 },
    { id:7,  name:"黑森林",   bg:"darkwood", music:"darkwood.mp3", spawnMs: 570, speedMul:1.42, targetKills:70 },
    { id:8,  name:"岩漿洞窟", bg:"lava",     music:"lava.mp3",     spawnMs: 520, speedMul:1.52, targetKills:80 },
    { id:9,  name:"地獄",     bg:"nether",   music:"nether.mp3",   spawnMs: 470, speedMul:1.62, targetKills:90 },
    { id:10, name:"異世界",   bg:"end",      music:"end.mp3",      spawnMs: 430, speedMul:1.75, targetKills:100 },
  ];

  const MOB_BY_LEVEL = {
    1: ["creeper","spider","skeleton"],
    2: ["spider","skeleton"],
    3: ["creeper","skeleton"],
    4: ["creeper","spider","skeleton"],
    5: ["spider","skeleton"],
    6: ["creeper","skeleton"],
    7: ["spider","witch","skeleton"],
    8: ["magma_cube","blaze","spider"],
    9: ["ghast","piglin","blaze"],
    10:["enderman"], // dragon 由 Boss 系統固定掉落
  };

  const MOB_HP = {
    creeper: 2,
    spider: 3,
    skeleton: 2,
    witch: 5,
    blaze: 4,
    magma_cube: 4,
    piglin: 4,
    ghast: 6,
    enderman: 6,
    dragon: 10,
  };

  // ===================== Animals (heal) =====================
  const ZHUYIN_SYMBOLS = [
    "ㄅ","ㄆ","ㄇ","ㄈ","ㄉ","ㄊ","ㄋ","ㄌ","ㄍ","ㄎ","ㄏ","ㄐ","ㄑ","ㄒ","ㄓ","ㄔ","ㄕ","ㄖ","ㄗ","ㄘ","ㄙ",
    "ㄧ","ㄨ","ㄩ","ㄚ","ㄛ","ㄜ","ㄝ","ㄞ","ㄟ","ㄠ","ㄡ","ㄢ","ㄣ","ㄤ","ㄥ","ㄦ"
  ];

  const ANIMAL_CFG = {
    chicken:   { heal:1, hitsReq:1, changeMs:0,     label:"雞" },
    sheep_w:   { heal:1, hitsReq:1, changeMs:5000,  label:"白羊" },
    sheep_b:   { heal:2, hitsReq:1, changeMs:333,   label:"黑羊" }, // 每秒3變
    cow:       { heal:3, hitsReq:2, changeMs:10000, label:"牛" },
    pig:       { heal:3, hitsReq:2, changeMs:8000,  label:"豬" },
  };

  function pickZy(){
    const z = pick(ZHUYIN_SYMBOLS);
    return { display: z, accept: normalizeZhuyin(z) };
  }

  // ===================== Items (props) =====================
  const ITEM_CFG = {
    bomb:  { label:"炸彈",  changeMs:0, hitsReq:1, icon:"bomb"  },
    dirt:  { label:"泥土",  changeMs:0, hitsReq:1, icon:"dirt"  },
    stone: { label:"石牆",  changeMs:0, hitsReq:1, icon:"stone" },
    lava:  { label:"岩漿",  changeMs:0, hitsReq:1, icon:"lava"  },
    water: { label:"水",    changeMs:0, hitsReq:1, icon:"water" },
  };

  const ITEM_TYPES = Object.keys(ITEM_CFG);

  // ===================== Game State =====================
  const GAME = {
    running:false,
    paused:false,
    timeLeft:180,
    score:0,
    kills:0,
    hp:5,
    maxHp:10,

    mobs:[],     // enemies + boss
    animals:[],  // heal animals (ground walkers)
    items:[],    // falling items
    walls:[],    // {x,y,w,dur,type}
    flows:[],    // waterfalls / lavafalls effects
    blasts:[],   // bomb ring visual

    particles:[],
    floatTexts:[],

    speedMul: Number(speed?.value ?? 1.2),
    spawnEvery: Number(spawn?.value ?? 900),

    lastTs:0,
    spawnAcc:0,
    itemAcc:0,
    _timeAcc:0,

    combo:0,
    mult:1.0,
    lastHitAt:0,
    comboWindowMs:1800,

    shake:0,
    damageFlash:0,
    healFlash:0,

    // level
    level: 1,
    levelKills: 0,
    levelTarget: 10,
    bgTheme: "forest",

    // boss
    bossId: null,
    bossDropMs: 1400,
    bossAcc: 0,

    t: 0,
    activeWords: (window.WORDS || []).slice(),
  };

  // ===================== Canvas Resize =====================
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener("resize", resize);
  // ===================== RWD / iOS viewport fixes =====================
  function setAppHeight(){
    // Use actual innerHeight to avoid 100vh issues on iOS Safari (address bar / keyboard).
    try{
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    }catch{}
  }

  function setKeyboardOffset(){
    // When iOS keyboard opens, visualViewport height shrinks. We lift the typing bar via CSS var --kb.
    const vv = window.visualViewport;
    if(!vv){
      try{ document.documentElement.style.setProperty('--kb', '0px'); }catch{}
      return;
    }
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    try{ document.documentElement.style.setProperty('--kb', `${kb}px`); }catch{}
  }

  function syncViewportVars(){
    setAppHeight();
    setKeyboardOffset();
    // Canvas size depends on layout; ensure we recalc after viewport changes.
    requestAnimationFrame(resize);
  }

  window.addEventListener('orientationchange', () => setTimeout(syncViewportVars, 80));
  window.addEventListener('resize', syncViewportVars);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', syncViewportVars);
    window.visualViewport.addEventListener('scroll', syncViewportVars);
  }


  // ===================== Pixel helpers =====================
  function pxRect(x,y,w,h, s=4){
    ctx.fillRect(Math.round(x/s)*s, Math.round(y/s)*s, Math.round(w/s)*s, Math.round(h/s)*s);
  }

  // ===================== Sprites: Enemies =====================
  function drawCreeper(x,y){
    const s=4;
    ctx.fillStyle="#2bbd3a"; pxRect(x,y,48,56,s);
    ctx.fillStyle="#0b2a0f";
    pxRect(x+8,y+12,8,8,s); pxRect(x+32,y+12,8,8,s);
    pxRect(x+16,y+24,16,8,s);
    pxRect(x+12,y+32,8,12,s); pxRect(x+28,y+32,8,12,s);
  }

  function drawSpider(x,y){
    const s=4;
    ctx.fillStyle="#1b1b1b"; pxRect(x+8,y+16,32,24,s);
    ctx.fillStyle="#d33"; pxRect(x+12,y+24,8,8,s); pxRect(x+28,y+24,8,8,s);
    ctx.fillStyle="#0f0f0f";
    pxRect(x,y+16,8,8,s); pxRect(x,y+32,8,8,s);
    pxRect(x+40,y+16,8,8,s); pxRect(x+40,y+32,8,8,s);
  }

  function drawSkeleton(x,y){
    const s=4;
    ctx.fillStyle="#d9d9d9"; pxRect(x,y,48,56,s);
    ctx.fillStyle="#222";
    pxRect(x+8,y+12,8,8,s); pxRect(x+32,y+12,8,8,s);
    pxRect(x+20,y+28,8,8,s);
  }

  function drawWitch(x,y){
    const s=4;
    ctx.fillStyle="#2b2b2b"; pxRect(x,y,48,56,s);
    ctx.fillStyle="#1a1a1a"; pxRect(x,y,48,16,s);
    ctx.fillStyle="#5a3b2e"; pxRect(x+16,y+24,16,12,s);
    ctx.fillStyle="#0f0f0f"; pxRect(x+20,y+28,8,4,s);
  }

  function drawEnderman(x,y){
    const s=4;
    ctx.fillStyle="#121015"; pxRect(x+14,y,20,56,s);
    ctx.fillStyle="#ff6bd6"; pxRect(x+18,y+16,6,4,s);
    ctx.fillStyle="#ff6bd6"; pxRect(x+26,y+16,6,4,s);
  }

  function drawDragon(x,y){
    // boss larger
    const s=4;
    ctx.fillStyle="#241226"; pxRect(x,y+14,92,44,s);
    ctx.fillStyle="#140b18"; pxRect(x+12,y,68,20,s);
    ctx.fillStyle="#ffdf6e"; pxRect(x+60,y+12,10,6,s);
    ctx.fillStyle="#3a1d3f"; pxRect(x-10,y+24,18,10,s);
    ctx.fillStyle="#3a1d3f"; pxRect(x+92,y+24,18,10,s);
  }

  // ===================== Sprites: Animals =====================
  function drawChicken(x,y){
    const s=4;
    ctx.fillStyle="#ffffff"; pxRect(x,y+12,28,24,s);
    ctx.fillStyle="#ffdf6e"; pxRect(x+16,y+8,8,8,s);
    ctx.fillStyle="#d33";    pxRect(x+12,y+4,6,6,s);
    ctx.fillStyle="#222";    pxRect(x+6,y+18,4,4,s);
  }

  function drawSheep(x,y,isBlack){
    const s=4;
    ctx.fillStyle = isBlack ? "#1b1b1b" : "#f5f5f5";
    pxRect(x,y+10,34,26,s);
    ctx.fillStyle="#5a3b2e"; pxRect(x+24,y+16,12,12,s);
    ctx.fillStyle="#222"; pxRect(x+28,y+20,4,4,s);
  }

  function drawCow(x,y){
    const s=4;
    ctx.fillStyle="#f5f5f5"; pxRect(x,y+10,38,26,s);
    ctx.fillStyle="#222"; pxRect(x+6,y+16,8,8,s); pxRect(x+20,y+22,10,8,s);
    ctx.fillStyle="#5a3b2e"; pxRect(x+30,y+16,10,10,s);
  }

  function drawPig(x,y){
    const s=4;
    ctx.fillStyle="#f0a3b6"; pxRect(x,y+12,36,24,s);
    ctx.fillStyle="#d98aa0"; pxRect(x+22,y+18,12,10,s);
    ctx.fillStyle="#222"; pxRect(x+26,y+21,3,3,s); pxRect(x+31,y+21,3,3,s);
  }

  // ===================== Sprites: Items =====================
  // Goal: visually resemble Minecraft items (TNT block, iron bucket with water/lava).
  // Note: use small pixel blocks; canvas has image-rendering: pixelated in CSS.
  function drawItem(x,y,type){
    const s=2; // smaller pixel size for better detail
    const px = (xx,yy,ww,hh)=>pxRect(xx,yy,ww,hh,s);

    function drawTNT(){
      // 28x28 icon area
      // base
      ctx.fillStyle="#c63a3a"; px(x,y,28,28);
      // shading
      ctx.fillStyle="#a72f2f"; px(x,y,4,28); px(x,y+24,28,4);
      ctx.fillStyle="#e35a5a"; px(x+24,y,4,28); px(x,y,28,4);

      // white band
      ctx.fillStyle="#efefef"; px(x,y+10,28,8);
      ctx.fillStyle="#d8d8d8"; px(x,y+16,28,2);

      // top speckles (like MC texture)
      ctx.fillStyle="rgba(0,0,0,0.12)";
      px(x+6,y+6,2,2); px(x+12,y+4,2,2); px(x+18,y+7,2,2); px(x+20,y+5,2,2);

      // "TNT" pixel letters (black) on band
      ctx.fillStyle="#111";
      // T
      px(x+4,y+12,6,2); px(x+6,y+14,2,4);
      // N
      px(x+12,y+12,2,6); px(x+16,y+12,2,6); px(x+14,y+14,2,2);
      // T
      px(x+20,y+12,6,2); px(x+22,y+14,2,4);
    }

    function drawBucket(liquidMain, liquidHi){
      // Approx iron bucket 28x28
      // handle
      ctx.fillStyle="#5b6166";
      px(x+6,y+4,16,2);
      px(x+6,y+4,2,8);
      px(x+20,y+4,2,8);

      // rim
      ctx.fillStyle="#e6e8ea";
      px(x+6,y+10,16,4);
      ctx.fillStyle="#c9cdd1";
      px(x+6,y+12,16,2);

      // liquid surface
      ctx.fillStyle=liquidMain;
      px(x+8,y+12,12,4);
      ctx.fillStyle=liquidHi;
      px(x+10,y+12,8,2);

      // bucket body
      ctx.fillStyle="#b7bdc3";
      px(x+6,y+14,16,12);

      // shading + depth
      ctx.fillStyle="#8d959c";
      px(x+6,y+14,2,12);
      px(x+20,y+14,2,12);
      px(x+8,y+24,12,2);

      ctx.fillStyle="#737a80";
      px(x+8,y+16,12,2);

      // highlight edge
      ctx.fillStyle="#f5f6f7";
      px(x+8,y+14,2,10);
      px(x+18,y+14,2,10);
    }

    if(type === "bomb"){
      // Minecraft TNT-like block
      return drawTNT();
    }
    if(type === "dirt"){
      ctx.fillStyle="#6a4a2a"; px(x,y+4,28,20);
      ctx.fillStyle="#2f6a2f"; px(x,y,28,8);
      // little stones
      ctx.fillStyle="rgba(0,0,0,0.12)";
      px(x+6,y+14,2,2); px(x+16,y+18,2,2); px(x+20,y+12,2,2);
      return;
    }
    if(type === "stone"){
      ctx.fillStyle="#7a7a86"; px(x,y+4,28,20);
      ctx.fillStyle="#5a5a66"; px(x+6,y+10,10,8);
      ctx.fillStyle="#90909c"; px(x+16,y+14,8,6);
      return;
    }
    if(type === "lava"){
      // Minecraft iron bucket (lava)
      return drawBucket("#ff6b2a", "#ffdf6e");
    }
    if(type === "water"){
      // Minecraft iron bucket (water)
      return drawBucket("#2aa6ff", "#7ad6ff");
    }

    ctx.fillStyle="#999"; px(x,y,24,24);
  }

  // ===================== Minecraft-like background (block clouds + parallax + voxel ground) =====================
  const THEME = {
    forest:   { sky1:"#0c2a38", sky2:"#1f6a3f", cloud:"#e9f6ff", far:"#2e5b3b", mid:"#2f6a2f", near:"#1f4a24", dirt:"#5a3b2e" },
    ocean:    { sky1:"#062035", sky2:"#0f5f8a", cloud:"#e9f6ff", far:"#0a2b3a", mid:"#0b3a57", near:"#0f4f6b", dirt:"#153a4a" },
    village:  { sky1:"#2a4a7a", sky2:"#4d8a6a", cloud:"#ffffff", far:"#355b3b", mid:"#5a8a4a", near:"#3f6a3f", dirt:"#6a4a2a" },
    mountain: { sky1:"#1b2b3a", sky2:"#3b5b3f", cloud:"#ffffff", far:"#3a3a3a", mid:"#4a4a4a", near:"#2f6a2f", dirt:"#5a3b2e" },
    desert:   { sky1:"#7a5a2a", sky2:"#e0c27a", cloud:"#fff6d6", far:"#c29b52", mid:"#e0c27a", near:"#d8b86a", dirt:"#b08a42" },
    snow:     { sky1:"#5a7a9a", sky2:"#eaf3ff", cloud:"#ffffff", far:"#9bb8cf", mid:"#cfe2f5", near:"#eaf3ff", dirt:"#9bb8cf" },
    darkwood: { sky1:"#0a0a0a", sky2:"#1b2a1b", cloud:"#cfd6cf", far:"#0d1a0d", mid:"#132413", near:"#0b130b", dirt:"#2a1a1a" },
    lava:     { sky1:"#1a0505", sky2:"#5a1a0a", cloud:"#ffd2a6", far:"#3a0b0b", mid:"#5a1a0a", near:"#7a2a0a", dirt:"#2a0a0a" },
    nether:   { sky1:"#1b0505", sky2:"#2a0a0a", cloud:"#ffb1a6", far:"#2a0a0a", mid:"#3b0b0b", near:"#5a1a0a", dirt:"#1a0505" },
    end:      { sky1:"#0a0a12", sky2:"#1a1a3a", cloud:"#e8e0ff", far:"#131326", mid:"#1a1a3a", near:"#23234a", dirt:"#0a0a12" },
  };

  function drawBlockClouds(w,h,t, theme){
    const size = 8;
    const speed = 12;
    const offset = (t * speed) % (w + 300);

    ctx.fillStyle = theme.cloud;
    for(let i=0;i<8;i++){
      const baseX = (i*180 - offset) + 60;
      const baseY = 24 + (i%3)*24;
      for(let dx=0; dx<5; dx++){
        for(let dy=0; dy<3; dy++){
          if((dx===0 && dy===0) || (dx===4 && dy===2)) continue;
          const x = baseX + dx*size;
          const y = baseY + dy*size;
          if(x < -80 || x > w+80) continue;
          ctx.fillRect(x,y,size,size);
        }
      }
      ctx.fillRect(baseX + 5*size, baseY + 1*size, size, size);
      ctx.fillRect(baseX - 1*size, baseY + 1*size, size, size);
    }
  }

  function drawParallaxHills(w,h,t, theme){
    const farY = h*0.38;
    const farSpeed = 6;
    const farOff = (t*farSpeed) % 120;
    ctx.fillStyle = theme.far;
    for(let x=-140; x<w+140; x+=24){
      const height = 18 + ((x+farOff) % 48);
      ctx.fillRect(x - farOff, farY - height, 24, height);
    }

    const midY = h*0.48;
    const midSpeed = 12;
    const midOff = (t*midSpeed) % 120;
    ctx.fillStyle = theme.mid;
    for(let x=-140; x<w+140; x+=20){
      const height = 22 + ((x+midOff) % 60);
      ctx.fillRect(x - midOff, midY - height, 20, height);
    }
  }

  function drawVoxelGround(w,h, groundY, t, theme){
    const block = 12;
    const nearSpeed = 18;
    const off = (t*nearSpeed) % block;

    for(let x=-block; x<w+block; x+=block){
      ctx.fillStyle = theme.near;
      ctx.fillRect(x - off, groundY, block, block);
      if(((x/block)|0) % 7 === 0) ctx.fillRect(x - off, groundY - block, block, block);
    }

    for(let y=groundY+block; y<h; y+=block){
      ctx.fillStyle = theme.dirt;
      for(let x=-block; x<w+block; x+=block){
        ctx.fillRect(x - off, y, block, block);
      }
    }
  }

  function drawBackground(themeKey, w, h, groundY){
    const th = THEME[themeKey] || THEME.forest;

    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, th.sky1);
    g.addColorStop(1, th.sky2);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    drawBlockClouds(w,h,GAME.t, th);
    drawParallaxHills(w,h,GAME.t, th);
    drawVoxelGround(w,h,groundY,GAME.t, th);
  }

  // ===================== Spawn: Enemies / Boss / Animals / Items =====================
  function pickMobTypeForLevel(level){
    const list = MOB_BY_LEVEL[level] || ["creeper","spider","skeleton"];
    return pick(list);
  }

  function spawnMob(){
    const list = GAME.activeWords;
    const word = pick(list);
    if(!word) return;

    const type = pickMobTypeForLevel(GAME.level);

    const mainText = String(word.han).trim();
const hp = MOB_HP[type] ?? 1;

    const mob = {
      id: uuid(),
      type,
      x: rand(20, canvas.getBoundingClientRect().width - 120),
      y: -90 - rand(0,60),
      w: 48,
      h: 56,
      baseSpeed: rand(30, 70),
      hp,
      maxHp: hp,
      mainText,
      han: String(word.han).trim(),
      zy: String(word.zy).trim(),
      acceptHan: String(word.han).trim(),
      acceptZy: normalizeZhuyin(word.zy),
      flash:0,
      isBoss:false,
    };
    GAME.mobs.push(mob);
  }

  function spawnBossIfNeeded(){
    if(GAME.level !== 10) return;
    if(GAME.bossId) return;

    const list = GAME.activeWords;
    const word = pick(list) || { han:"龍", zy:"ㄌㄨㄥˊ" };

    const mainText = String(word.han).trim();
const hp = MOB_HP.dragon;

    const w = 92, h = 58;
    const boss = {
      id: uuid(),
      type:"dragon",
      x: (canvas.getBoundingClientRect().width/2) - w/2, // 固定掉落：中央
      y: -140,
      w, h,
      baseSpeed: 44,
      hp, maxHp: hp,
      mainText,
      han: String(word.han).trim(),
      zy: String(word.zy).trim(),
      acceptHan: String(word.han).trim(),
      acceptZy: normalizeZhuyin(word.zy),
      flash:0,
      isBoss:true,
    };
    GAME.mobs.push(boss);
    GAME.bossId = boss.id;
  }

  function resetBossToTop(){
    const boss = GAME.mobs.find(m => m.id === GAME.bossId);
    if(!boss) return;
    boss.x = (canvas.getBoundingClientRect().width/2) - boss.w/2;
    boss.y = -140;
  }

  function spawnAnimals(){
    const groundY = canvas.getBoundingClientRect().height - 88;
    const y = groundY - 44;
    const W = canvas.getBoundingClientRect().width;

    function make(type, x){
      const cfg = ANIMAL_CFG[type];
      const p = pickZy();
      return {
        id: uuid(),
        type,
        x,
        y: y + rand(-6, 6),
        w: 40,
        h: 40,
        vx: rand(10, 26) * (Math.random()<0.5?-1:1),
        dirChangeAt: nowMs() + rand(800, 2200),
        prompt: p.display,
        acceptZy: p.accept,
        hits: 0,
        hitsReq: cfg.hitsReq,
        heal: cfg.heal,
        changeMs: cfg.changeMs,
        nextPromptAt: cfg.changeMs ? nowMs() + cfg.changeMs : Infinity,
        label: cfg.label,
        dead:false,
        respawnAt: Infinity,
      };
    }

    GAME.animals = [
      make("chicken", W*0.12),
      make("sheep_w", W*0.30),
      make("sheep_b", W*0.48),
      make("cow",     W*0.66),
      make("pig",     W*0.84),
    ];
  }

  function respawnAnimal(a, delayMs){
    a.dead = true;
    a.respawnAt = nowMs() + delayMs;
  }

  function updateAnimals(dt){
    const W = canvas.getBoundingClientRect().width;
    const groundY = canvas.getBoundingClientRect().height - 88;
    const baseY = groundY - 44;
    const t = nowMs();

    for(const a of GAME.animals){
      if(a.dead){
        if(t >= a.respawnAt){
          // respawn: new prompt and walk
          const cfg = ANIMAL_CFG[a.type];
          const p = pickZy();
          a.dead = false;
          a.hits = 0;
          a.prompt = p.display;
          a.acceptZy = p.accept;
          a.nextPromptAt = cfg.changeMs ? t + cfg.changeMs : Infinity;
          a.vx = rand(10, 26) * (Math.random()<0.5?-1:1);
          a.dirChangeAt = t + rand(800, 2200);
          // keep x but clamp
          a.x = clamp(a.x, 12, W-52);
        }
        continue;
      }

      if(t >= a.dirChangeAt){
        a.vx = rand(8, 30) * (Math.random()<0.5?-1:1);
        a.dirChangeAt = t + rand(700, 2400);
      }

      a.x += a.vx * dt;
      if(a.x < 12){ a.x=12; a.vx = Math.abs(a.vx); }
      if(a.x > W-52){ a.x=W-52; a.vx = -Math.abs(a.vx); }

      a.y = baseY + Math.sin((GAME.t*2) + (a.x*0.01))*3;

      if(t >= a.nextPromptAt){
        const p = pickZy();
        a.prompt = p.display;
        a.acceptZy = p.accept;
        a.hits = 0;
        a.nextPromptAt = t + a.changeMs;
      }
    }
  }

  function spawnItem(){
    // items spawn every ~7-12s (with jitter)
    const W = canvas.getBoundingClientRect().width;
    const type = pick(ITEM_TYPES);
    const p = pickZy();

    GAME.items.push({
      id: uuid(),
      type,
      x: rand(30, W-60),
      y: -60,
      w: 28,
      h: 30,
      baseSpeed: rand(26, 40),
      prompt: p.display,
      acceptZy: p.accept,
      label: ITEM_CFG[type].label,
      flash:0,
    });
  }

  // ===================== Combo / Crit =====================
  function updateComboOnHit(){
    const t = nowMs();
    if(t - GAME.lastHitAt <= GAME.comboWindowMs) GAME.combo = Math.min(999, GAME.combo + 1);
    else GAME.combo = 1;
    GAME.lastHitAt = t;

    const raw = 1 + (GAME.combo - 1) * 0.04;
    GAME.mult = Math.min(3.0, Number(raw.toFixed(2)));
  }

  function maybeCrit(){
    const chance = Math.min(0.35, 0.08 + GAME.combo * 0.01);
    return Math.random() < chance;
  }

  function addFloatText(text, x, y, ttl=0.6, big=false, color=""){
    GAME.floatTexts.push({ text, x, y, vy: big ? -52 : -35, ttl, big, color });
  }

  // ===================== Effects: Items =====================
  const MOB_DIST = 70; // approx "一隻怪的距離"（像素估算）

  function triggerItemEffect(item, groundY){
    const x = item.x + item.w/2;
    const y = item.y + item.h/2;

    if(item.type === "bomb"){
      const radius = 5 * MOB_DIST;
      GAME.blasts.push({ x, y, r: radius, t: 0.35 });

      playSfx(SFX.boom, 0.9);
      vibrate([40,30,50]);

      // area dmg: mobs within radius -1 hp
      const hits = [];
      for(const m of GAME.mobs){
        const cx = m.x + m.w/2;
        const cy = m.y + m.h/2;
        const d = Math.hypot(cx - x, cy - y);
        if(d <= radius){
          m.hp -= 1;
          m.flash = 0.12;
          hits.push(m);
        }
      }
      for(const m of hits){
        if(m.hp <= 0) killMob(m, { byItem:true });
      }
      addFloatText("BOOM!", x+8, y-10, 0.7, true, "#ffdf6e");
      return;
    }

    if(item.type === "dirt"){
      // horizontal dirt wall (3 mobs distance), blocks 1s
      const w = 3 * MOB_DIST;
      GAME.walls.push({ id:uuid(), type:"dirt", x: x - w/2, y: item.y + item.h, w, t: 1.0 });
      playSfx(SFX.place, 0.8);
      addFloatText("土牆!", x+8, y-10, 0.7, true, "#ffdf6e");
      return;
    }

    if(item.type === "stone"){
      const w = 5 * MOB_DIST;
      GAME.walls.push({ id:uuid(), type:"stone", x: x - w/2, y: item.y + item.h, w, t: 2.0 });
      playSfx(SFX.place, 0.8);
      addFloatText("石牆!", x+8, y-10, 0.7, true, "#ffdf6e");
      return;
    }

    if(item.type === "lava"){
      // 岩漿：消失時該位置下方垂直線產生一個岩漿瀑布，效果時間 3 秒；可消滅下方的怪物，然後瀑布消失
      const dur = 3.0;
      GAME.flows.push({
        id: uuid(),
        type: "lava",
        x: x - 30,
        y: item.y + item.h,
        w: 60,
        h: Math.max(0, groundY - (item.y + item.h)),
        t: dur,
        dur,
      });
      playSfx(SFX.boom, 0.7);
      addFloatText("岩漿!", x+8, y-10, 0.8, true, "#ffdf6e");
      return;
    }

    if(item.type === "water"){
      // 水：消失時該位置上方垂直線產生一個水瀑布；水會一層一層往上出現，慢慢把上方怪物推回畫面最上面
      const dur = 3.0;
      GAME.flows.push({
        id: uuid(),
        type: "water",
        x: x - 30,
        w: 60,
        pivotY: item.y,
        t: dur,
        dur,
        riseSpeed: 240,   // 上升展開速度（像素/秒）
        pushSpeed: 180,   // 推怪速度（像素/秒）
        block: 12,        // 分層方塊高度
      });
      playSfx(SFX.place, 0.7);
      addFloatText("水柱!", x+8, y-10, 0.8, true, "#ffdf6e");
      return;
    }
  }

  function applyFlows(dt){
    // continuous while effect exists
    for(const f of GAME.flows){
      const dur = f.dur || 0.7;
      const age = dur - f.t;

      if(f.type === "lava"){
        // 3秒內：垂直向下的熔岩柱，碰到就消滅
        for(const m of [...GAME.mobs]){
          const mx = m.x + m.w/2;
          const my = m.y + m.h/2;
          if(mx >= f.x && mx <= f.x + f.w && my >= f.y){
            killMob(m, { byItem:true, silent:true });
          }
        }
      }else if(f.type === "water"){
        // 分層往上長出：從 pivotY 往上延伸到 topY
        const pivotY = f.pivotY ?? 0;
        const riseSpeed = f.riseSpeed ?? 240;
        const topY = Math.max(-220, pivotY - riseSpeed * age);

        // 緩慢推上方怪物回到最上
        const pushSpeed = f.pushSpeed ?? 180;
        for(const m of GAME.mobs){
          const mx = m.x + m.w/2;
          const my = m.y + m.h/2;
          if(mx >= f.x && mx <= f.x + f.w && my <= pivotY && my >= topY){
            m.y -= pushSpeed * dt;
            m.flash = 0.10;
            if(m.y < -150){
              m.y = -180 - rand(0,80);
            }
          }
        }
      }
    }
  }

  function applyWalls(dt){
    // walls decay handled elsewhere; here apply blocking
    for(const wall of GAME.walls){
      for(const m of GAME.mobs){
        // boss also blocked (更像被擋住)
        if(m.y + m.h >= wall.y && m.y < wall.y && (m.x + m.w) > wall.x && m.x < (wall.x + wall.w)){
          // clamp above wall
          m.y = wall.y - m.h;
          // "block for N seconds": simulate stun by reducing movement this frame
          m._blocked = Math.max(m._blocked || 0, wall.t);
        }
      }
    }

    for(const m of GAME.mobs){
      if(m._blocked){
        m._blocked = Math.max(0, m._blocked - dt);
      }
    }
  }

  // ===================== Combat / Heal / Kill =====================
  function applyHeal(amount, x, y, label){
    const before = GAME.hp;
    GAME.hp = clamp(GAME.hp + amount, 0, GAME.maxHp);
    const gained = GAME.hp - before;

    if(gained > 0){
      addFloatText(`+${gained}❤ ${label}`, x, y, 0.8, true, "#a6ffb0");
      GAME.healFlash = 1.0;
      vibrate(18);
      playSfx(SFX.heal, 0.65);
    }else{
      addFloatText(`滿血`, x, y, 0.6, false, "#a6ffb0");
    }
  }

  function killMob(m, { byItem=false, silent=false } = {}){
    // boss death => win
    if(m.isBoss){
      GAME.mobs = GAME.mobs.filter(mm => mm.id !== m.id);
      GAME.bossId = null;
      if(!silent){
        addFloatText("BOSS DEFEATED!", 24, 90, 1.0, true, "#e8e0ff");
      }
      endGame("通關！你打倒了終界龍！");
      return;
    }

    GAME.mobs = GAME.mobs.filter(mm => mm.id !== m.id);
    GAME.kills += 1;
    GAME.levelKills += 1;

    // score
    if(byItem) GAME.score += 8;
    else GAME.score += 5;

    if(elLevelKills) elLevelKills.textContent = String(GAME.levelKills);

    const cfg = LEVELS[GAME.level-1];
    if(GAME.level < 10 && GAME.levelKills >= cfg.targetKills){
      applyLevel(GAME.level + 1);
      addFloatText(`LEVEL UP!`, 24, 90, 0.9, true, "#ffdf6e");
      vibrate([25,25,25]);
    }
  }

  
  // ===================== Attack submission & hit resolution (rewritten) =====================
  function submitAttack(rawOverride){
    // Prefer Zhuyin IME composition (so user can "not choose characters") if available
    const ime = getImePreferredText();
    const raw = (ime || (rawOverride ?? typingInput.value) || "");
    const hit = tryHitByInput(raw);

    // Requirement: Enter clears input even if miss
    hardClearInput();

    // Optional miss feedback
    if(!hit){
      GAME.shake = Math.max(GAME.shake, 2);
      addFloatText("MISS", 18, canvas.getBoundingClientRect().height - 120, 0.5, false, "#ffb1a6");
      syncHud();
    }
  }

  function classifyAttackInput(raw){
    const s = String(raw || "").trim();
    if(!s) return { kind:"none" };

    const isZy = /[ㄅ-ㄦ]/.test(s) || /[ˊˇˋ˙]/.test(s);
    if(isZy){
      const zy = normalizeZhuyin(s);
      return {
        kind: "zy",
        zy,
        zyNoTone: stripTone(zy),
        hasTone: hasToneMark(zy),
      };
    }
    return { kind:"han", han: s };
  }

  function collectMatches(key){
    const matches = [];

    // Enemies: accept Han exact OR Zhuyin (with/without tone)
    for(const m of GAME.mobs){
      if(m.kind !== "enemy") continue;

      let ok = false;
      if(key.kind === "han"){
        ok = key.han === m.acceptHan;
      }else if(key.kind === "zy"){
        ok = key.hasTone ? (key.zy === m.acceptZy) : (key.zyNoTone === stripTone(m.acceptZy));
      }

      if(ok){
        matches.push({ obj:m, kind:"enemy", y: m.y, pr: 3 });
      }
    }

    // Items: Zhuyin only
    for(const it of GAME.items){
      if(key.kind !== "zy") continue;
      const ok = key.hasTone ? (key.zy === it.acceptZy) : (key.zyNoTone === stripTone(it.acceptZy));
      if(ok){
        matches.push({ obj:it, kind:"item", y: it.y, pr: 2 });
      }
    }

    // Animals: Zhuyin only (alive only)
    for(const a of GAME.animals){
      if(a.dead) continue;
      if(key.kind !== "zy") continue;
      const ok = key.hasTone ? (key.zy === a.acceptZy) : (key.zyNoTone === stripTone(a.acceptZy));
      if(ok){
        matches.push({ obj:a, kind:"animal", y: a.y, pr: 1 });
      }
    }

    return matches;
  }

  // Fully rewritten hit resolver:
  // - Determine input type (Hanzi or Zhuyin)
  // - Find all matching targets (enemy/item/animal)
  // - Pick the ONE target closest to the bottom (largest y). If tie, prefer enemy > item > animal.
  function tryHitByInput(raw){
    const key = classifyAttackInput(raw);
    if(key.kind === "none") return false;

    const matches = collectMatches(key);
    if(!matches.length) return false;

    matches.sort((a,b)=> (b.y - a.y) || (b.pr - a.pr));
    const hit = matches[0];

    // Apply hit based on target kind
    if(hit.kind === "enemy"){
      const target = hit.obj;

      updateComboOnHit();
      const isCrit = maybeCrit();

      playSfx(SFX.hit[target.type] || SFX.hit.skeleton, isCrit ? 0.95 : 0.75);
      vibrate(isCrit ? [20,20,30] : 12);

      target.flash = 0.12;
      target.hp -= 1;

      GAME.particles.push({
        x: target.x + target.w/2,
        y: target.y + target.h/2,
        t: isCrit ? 0.28 : 0.18,
        crit: isCrit,
      });

      if(isCrit){
        GAME.shake = Math.max(GAME.shake, 10);
        addFloatText("CRIT!", target.x + target.w + 10, target.y + 2, 0.75, true, "#ffdf6e");
      }else{
        GAME.shake = Math.max(GAME.shake, 4);
      }

      const base = (target.hp <= 0) ? (target.isBoss ? 25 : 10) : 3;
      const scored = Math.round(base * GAME.mult * (isCrit ? 2 : 1));
      GAME.score += scored;

      if(target.hp <= 0){
        GAME.mobs = GAME.mobs.filter(m => m.id !== target.id);
        GAME.kills += 1;
        onMobKilled(target);
      }

      addFloatText(`+${scored}`, target.x + target.w + 10, target.y + 24, 0.55, false, "#e7f5e7");

      syncHud();
      return true;
    }

    if(hit.kind === "item"){
      const it = hit.obj;

      updateComboOnHit();
      playSfx(SFX.hit.item, 0.75);
      it.flash = 0.12;

      const groundY = canvas.getBoundingClientRect().height - 88;
      GAME.items = GAME.items.filter(x => x.id !== it.id);
      triggerItemEffect(it, groundY);

      GAME.score += Math.round(6 * GAME.mult);
      addFloatText(`道具 ${it.label}!`, it.x + it.w + 10, it.y + 8, 0.7, true, "#ffdf6e");

      syncHud();
      return true;
    }

    if(hit.kind === "animal"){
      const a = hit.obj;

      playSfx(SFX.hit.animal, 0.7);
      vibrate(10);

      a.hits += 1;
      addFloatText(`Hit ${a.label} (${a.hits}/${a.hitsReq})`, a.x, a.y - 16, 0.5, false, "#b8d5b8");

      if(a.hits >= a.hitsReq){
        a.hits = 0;
        applyHeal(a.heal, a.x, a.y - 40, a.label);
        // Animal will be eliminated then respawn later
        respawnAnimal(a, rand(2500, 5200));
      }

      syncHud();
      return true;
    }

    return false;
  }

// ===================== HUD / End / Reset =====================
  function syncHud(){
    if (elKills) elKills.textContent = String(GAME.kills);
    if (elScore) elScore.textContent = String(GAME.score);
    if (elTime)  elTime.textContent  = String(GAME.timeLeft);
    if (elHp)    elHp.textContent    = String(GAME.hp);
    if (elCombo) elCombo.textContent = String(GAME.combo);
    if (elMult)  elMult.textContent  = `${GAME.mult.toFixed(2)}x`;

    if (speedVal) speedVal.textContent = `${GAME.speedMul.toFixed(2)}x`;
    if (spawnVal) spawnVal.textContent = `${GAME.spawnEvery}ms`;
    if (elWordCount) elWordCount.textContent = String((GAME.activeWords || []).length);

    if (elLevel) elLevel.textContent = String(GAME.level);
    const cfg = LEVELS[GAME.level-1];
    if (elLevelName && cfg) elLevelName.textContent = cfg.name;
    if (elLevelKills) elLevelKills.textContent = String(GAME.levelKills);
    if (elLevelTarget && cfg) elLevelTarget.textContent = String(cfg.targetKills);

    // boss HUD
    const boss = GAME.bossId ? GAME.mobs.find(m => m.id === GAME.bossId) : null;
    if(boss && elBossHud && elBossHpFill && elBossHpText){
      elBossHud.classList.remove("hidden");
      const ratio = boss.maxHp ? clamp(boss.hp / boss.maxHp, 0, 1) : 0;
      elBossHpFill.style.width = `${ratio*100}%`;
      elBossHpText.textContent = `${boss.hp}/${boss.maxHp}`;
    }else{
      elBossHud?.classList?.add("hidden");
    }
  }

  function endGame(title="遊戲結束"){
    GAME.running = false;
    GAME.paused = false;

    if(overTitle) overTitle.textContent = title;
    if(overKills) overKills.textContent = String(GAME.kills);
    if(overScore) overScore.textContent = String(GAME.score);
    if(overTime)  overTime.textContent  = String(GAME.timeLeft);

    overlay?.classList?.remove("hidden");
  }

  function resetGame(){
    GAME.running=false;
    GAME.paused=false;
    GAME.timeLeft=180;
    GAME.score=0;
    GAME.kills=0;
    GAME.hp=5;

    GAME.mobs=[];
    GAME.items=[];
    GAME.walls=[];
    GAME.flows=[];
    GAME.blasts=[];
    GAME.particles=[];
    GAME.floatTexts=[];
    GAME.bossId=null;
    GAME.bossAcc=0;

    GAME.lastTs=0;
    GAME.spawnAcc=0;
    GAME.itemAcc=0;
    GAME._timeAcc=0;

    GAME.combo=0;
    GAME.mult=1.0;
    GAME.lastHitAt=0;

    GAME.shake=0;
    GAME.damageFlash=0;
    GAME.healFlash=0;

    GAME.level=1;
    GAME.levelKills=0;
    GAME.levelTarget=LEVELS[0].targetKills;
    GAME.bgTheme=LEVELS[0].bg;

    overlay?.classList?.add("hidden");
    if(typingInput) typingInput.value="";

    spawnAnimals();
    syncHud();
  }

  // ===================== Level apply =====================
  function applyLevel(level){
    const cfg = LEVELS[level-1];
    if(!cfg) return;

    GAME.level = level;
    GAME.levelKills = 0;
    GAME.levelTarget = cfg.targetKills;
    GAME.bgTheme = cfg.bg;

    // set difficulty baseline (slider can override afterwards)
    GAME.spawnEvery = cfg.spawnMs;
    GAME.speedMul = cfg.speedMul;

    Music.play(cfg.music);

    // boss: spawn at level 10
    if(level === 10){
      GAME.bossId = null;
      spawnBossIfNeeded();
      addFloatText("BOSS 出現！", 24, 90, 0.9, true, "#e8e0ff");
      vibrate([30,30,30]);
    }else{
      GAME.bossId = null;
      elBossHud?.classList?.add("hidden");
    }

    syncHud();
  }

  // ===================== Draw helpers =====================
  function drawHpBar(m){
    const x = m.x;
    const y = m.y - 8;
    const w = m.w;
    const h = 5;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(x, y, w * (m.hp / m.maxHp), h);
  }

  function drawEnemySprite(m){
    if(m.type==="creeper") return drawCreeper(m.x,m.y);
    if(m.type==="spider") return drawSpider(m.x,m.y);
    if(m.type==="skeleton") return drawSkeleton(m.x,m.y);
    if(m.type==="witch") return drawWitch(m.x,m.y);
    if(m.type==="dragon") return drawDragon(m.x,m.y);
    if(m.type==="enderman") return drawEnderman(m.x,m.y);
    ctx.fillStyle="#999"; ctx.fillRect(m.x,m.y,m.w,m.h);
  }

  function drawAnimalSprite(a){
    if(a.type==="chicken") return drawChicken(a.x,a.y);
    if(a.type==="sheep_w") return drawSheep(a.x,a.y,false);
    if(a.type==="sheep_b") return drawSheep(a.x,a.y,true);
    if(a.type==="cow") return drawCow(a.x,a.y);
    if(a.type==="pig") return drawPig(a.x,a.y);
    ctx.fillStyle="#999"; ctx.fillRect(a.x,a.y,a.w,a.h);
  }

  function drawWallsAndFlows(groundY){
    // walls
    for(const wall of GAME.walls){
      ctx.fillStyle = wall.type === "stone" ? "rgba(150,150,160,0.75)" : "rgba(120,90,60,0.75)";
      ctx.fillRect(wall.x, wall.y-10, wall.w, 10);
      // top highlight
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(wall.x, wall.y-12, wall.w, 2);
    }

    // flows
    for(const f of GAME.flows){
      const dur = f.dur || 0.7;
      const age = dur - f.t;

      if(f.type === "lava"){
        // 熔岩：略帶閃爍的柱狀
        const flick = 0.10 + 0.06*Math.sin((age*18) + f.x*0.02);
        ctx.fillStyle = `rgba(255,90,30,${0.35 + flick})`;
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.fillStyle = `rgba(255,220,110,${0.20 + flick*0.6})`;
        ctx.fillRect(f.x+8, f.y, f.w-16, f.h);
      }else if(f.type === "water"){
        // 水：一層一層往上出現（方塊層疊）
        const pivotY = f.pivotY ?? 0;
        const block = f.block ?? 12;
        const riseSpeed = f.riseSpeed ?? 240;
        const topY = Math.max(0, pivotY - riseSpeed * age);

        // main column (soft)
        ctx.fillStyle = "rgba(100,210,255,0.16)";
        ctx.fillRect(f.x, topY, f.w, Math.max(0, pivotY - topY));

        // layered blocks
        const span = Math.max(1, pivotY - topY);
        for(let yy = pivotY - block; yy >= topY; yy -= block){
          const t = (yy - topY) / span;
          const alpha = 0.22 + 0.14 * t;
          ctx.fillStyle = `rgba(100,210,255,${alpha})`;
          ctx.fillRect(f.x, yy, f.w, block-1);
          ctx.fillStyle = `rgba(220,255,255,${alpha*0.55})`;
          ctx.fillRect(f.x+8, yy+2, f.w-16, 3);
        }
      }
    }

    // blasts
    for(const b of GAME.blasts){
      ctx.strokeStyle = "rgba(255,220,110,0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,90,30,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r*0.72, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  // ===================== Render =====================
  function render(groundY, dt){
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    // shake
    if(GAME.shake > 0) GAME.shake = Math.max(0, GAME.shake - dt * 30);
    const sx = GAME.shake > 0 ? (Math.random()*2-1) * GAME.shake : 0;
    const sy = GAME.shake > 0 ? (Math.random()*2-1) * GAME.shake : 0;

    ctx.setTransform(1,0,0,1, sx, sy);
    ctx.clearRect(-sx, -sy, w+Math.abs(sx), h+Math.abs(sy));

    // background + voxel ground
    drawBackground(GAME.bgTheme, w, h, groundY);

    // item effects (walls/flows/blasts)
    drawWallsAndFlows(groundY);

    // animals
    for(const a of GAME.animals){
      if(a.dead) continue;
      drawAnimalSprite(a);

      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#a6ffb0";
      ctx.fillText(a.prompt, a.x + a.w + 8, a.y + 2);

      ctx.font = "12px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(`${a.label}`, a.x + a.w + 8, a.y + 24);

      if(a.hitsReq > 1){
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillStyle = "#ffdf6e";
        ctx.fillText(`${a.hits}/${a.hitsReq}`, a.x + a.w + 8, a.y + 38);
      }
    }

    // items
    for(const it of GAME.items){
      if(it.flash > 0){ ctx.globalAlpha = 0.55; drawItem(it.x,it.y,it.type); ctx.globalAlpha = 1; }
      else drawItem(it.x,it.y,it.type);

      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#b8f2ff";
      ctx.fillText(it.prompt, it.x + it.w + 10, it.y + 2);

      ctx.font = "12px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(it.label, it.x + it.w + 10, it.y + 24);
    }

    // mobs + labels
    for(const mob of GAME.mobs){
      if(mob.flash > 0){ ctx.globalAlpha = 0.55; drawEnemySprite(mob); ctx.globalAlpha = 1; }
      else drawEnemySprite(mob);

      drawHpBar(mob);

      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#f0fff0";
      ctx.fillText(mob.mainText, mob.x + mob.w + 10, mob.y + 2);

      ctx.font = "14px ui-monospace, monospace";
      ctx.fillStyle = "#ffdf6e";
      ctx.fillText(mob.zy, mob.x + mob.w + 10, mob.y + 24);
    }

    // particles
    for(const p of GAME.particles){
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.crit ? 10 : 6, 0, Math.PI*2);
      ctx.fill();

      if(p.crit){
        ctx.strokeStyle = "#ffdf6e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI*2);
        ctx.stroke();
      }
    }

    // float texts
    for(const t of GAME.floatTexts){
      ctx.font = t.big ? "bold 20px ui-monospace, monospace" : "bold 14px ui-monospace, monospace";
      ctx.fillStyle = t.color || (t.big ? "#ffdf6e" : "#e7f5e7");
      ctx.fillText(t.text, t.x, t.y);
    }

    // flashes
    if(GAME.damageFlash > 0){
      GAME.damageFlash = Math.max(0, GAME.damageFlash - dt * 2.5);
      ctx.setTransform(1,0,0,1, 0, 0);
      ctx.fillStyle = `rgba(255,0,0,${0.25 * GAME.damageFlash})`;
      ctx.fillRect(0,0,w,h);
    }
    if(GAME.healFlash > 0){
      GAME.healFlash = Math.max(0, GAME.healFlash - dt * 2.5);
      ctx.setTransform(1,0,0,1, 0, 0);
      ctx.fillStyle = `rgba(0,255,120,${0.14 * GAME.healFlash})`;
      ctx.fillRect(0,0,w,h);
    }

    ctx.setTransform(1,0,0,1, 0, 0);
  }

  // ===================== Loop =====================
  function tick(ts){
    if(!GAME.running) return;
    if(GAME.paused){
      requestAnimationFrame(tick);
      return;
    }

    if(!GAME.lastTs) GAME.lastTs = ts;
    const dt = Math.min(0.05, (ts - GAME.lastTs) / 1000);
    GAME.lastTs = ts;
    GAME.t += dt;

    // timer
    GAME._timeAcc += dt;
    if(GAME._timeAcc >= 1){
      const dec = Math.floor(GAME._timeAcc);
      GAME._timeAcc -= dec;
      GAME.timeLeft = Math.max(0, GAME.timeLeft - dec);
      if(GAME.timeLeft <= 0){ syncHud(); endGame("時間到！"); return; }
    }

    // combo decay
    if(GAME.combo > 0 && nowMs() - GAME.lastHitAt > GAME.comboWindowMs){
      GAME.combo = 0;
      GAME.mult = 1.0;
    }

    const groundY = canvas.getBoundingClientRect().height - 88;

    // spawn mobs
    GAME.spawnAcc += dt * 1000;
    while(GAME.spawnAcc >= GAME.spawnEvery){
      GAME.spawnAcc -= GAME.spawnEvery;
      // level10: still spawn some mobs, but keep boss independent
      if(GAME.level !== 10 || Math.random() < 0.55) spawnMob();
      if(GAME.level === 10) spawnBossIfNeeded();
    }

    // boss fixed drop: if boss exists, reset to top every bossDropMs
    if(GAME.level === 10 && GAME.bossId){
      GAME.bossAcc += dt * 1000;
      if(GAME.bossAcc >= GAME.bossDropMs){
        GAME.bossAcc = 0;
        resetBossToTop();
      }
    }

    // items spawn (independent)
    GAME.itemAcc += dt * 1000;
    const nextItemEvery = 9000; // base
    if(GAME.itemAcc >= nextItemEvery + rand(-2200, 2800)){
      GAME.itemAcc = 0;
      spawnItem();
    }

    // animals update
    updateAnimals(dt);

    // walls effects
    // decay walls/flows/blasts
    for(const w of GAME.walls) w.t -= dt;
    GAME.walls = GAME.walls.filter(w => w.t > 0);

    for(const f of GAME.flows) f.t -= dt;
    GAME.flows = GAME.flows.filter(f => f.t > 0);

    for(const b of GAME.blasts) b.t -= dt;
    GAME.blasts = GAME.blasts.filter(b => b.t > 0);

    // apply walls blocking and flows actions
    applyWalls(dt);
    applyFlows(dt);

    // move mobs (respect wall blocking)
    for(const mob of GAME.mobs){
      mob.flash = Math.max(0, mob.flash - dt);
      if(mob._blocked && mob._blocked > 0) continue;
      mob.y += (mob.baseSpeed * GAME.speedMul) * dt;
    }

    // move items
    for(const it of GAME.items){
      it.flash = Math.max(0, it.flash - dt);
      it.y += (it.baseSpeed * (0.95 + GAME.speedMul*0.25)) * dt;
    }

    // float texts
    for(const t of GAME.floatTexts){ t.y += t.vy * dt; t.ttl -= dt; }
    GAME.floatTexts = GAME.floatTexts.filter(t => t.ttl > 0);

    // particles
    GAME.particles = GAME.particles.map(p => ({...p, t: p.t - dt})).filter(p => p.t > 0);

    // ground collision: mobs
    const survivors = [];
    for(const mob of GAME.mobs){
      if(mob.y + mob.h >= groundY){
        // boss hitting ground: damage + keep falling (fixed drop)
        GAME.hp -= 1;

        playSfx(SFX.ground, 0.9);
        vibrate([60, 30, 60]);
        GAME.damageFlash = 1.0;
        GAME.shake = Math.max(GAME.shake, 10);

        if(GAME.hp <= 0){ syncHud(); endGame("被怪物突破了！"); return; }

        if(mob.isBoss){
          resetBossToTop();
          survivors.push(mob);
        }else{
          // normal mob disappears
          // reset combo (missed)
          GAME.combo = 0;
          GAME.mult = 1.0;
        }
      }else{
        survivors.push(mob);
      }
    }
    GAME.mobs = survivors;

    // ground collision: items -> trigger effect & disappear
    const itSurv = [];
    for(const it of GAME.items){
      if(it.y + it.h >= groundY){
        // disappear triggers effect
        triggerItemEffect(it, groundY);
      }else{
        itSurv.push(it);
      }
    }
    GAME.items = itSurv;

    render(groundY, dt);
    syncHud();
    requestAnimationFrame(tick);
  }

  // ===================== Controls =====================
  function startGame(){
    if(GAME.running) return;

    overlay?.classList?.add("hidden");
    GAME.running = true;
    GAME.paused = false;
    GAME.lastTs = 0;

    applyLevel(GAME.level);

    typingInput?.focus();
    requestAnimationFrame(tick);
  }

  btnStart?.addEventListener("click", startGame);

  btnPause?.addEventListener("click", () => {
    if(!GAME.running) return;
    GAME.paused = !GAME.paused;
    if(!GAME.paused) typingInput?.focus();
  });

  btnRestart?.addEventListener("click", () => {
    resetGame();
    applyLevel(1);
    GAME.running = true;
    typingInput?.focus();
    requestAnimationFrame(tick);
  });

  btnPlayAgain?.addEventListener("click", () => {
    resetGame();
    applyLevel(1);
    GAME.running = true;
    typingInput?.focus();
    requestAnimationFrame(tick);
  });

  speed?.addEventListener("input", () => {
    GAME.speedMul = Number(speed.value);
    syncHud();
  });

  spawn?.addEventListener("input", () => {
    GAME.spawnEvery = Number(spawn.value);
    syncHud();
  });

// IME composition: capture zhuyin symbols before candidate conversion
typingInput?.addEventListener("compositionstart", () => {
  IME.active = true;
  IME.buffer = "";
  IME.lastAt = nowMs();
});
typingInput?.addEventListener("compositionupdate", (e) => {
  IME.active = true;
  IME.buffer = e.data || IME.buffer;
  IME.lastAt = nowMs();
});
typingInput?.addEventListener("compositionend", (e) => {
  // Do not overwrite buffer with committed Hanzi; keep last zhuyin from update
  IME.active = false;
  IME.lastAt = nowMs();
  // Some browsers provide zhuyin on end; keep if it looks like zhuyin
  if(e?.data && /[ㄅ-ㄦˊˇˋ˙]/.test(e.data)) IME.buffer = e.data;
});

  typingInput?.addEventListener("input", () => {
    const v = typingInput.value;
    // 需求：不自動輸出攻擊；僅限制長度
    if(v.length > 12) typingInput.value = v.slice(-12);
  });

  typingInput?.addEventListener("keydown", (e) => {
    if(applyKeymapToInput(e)) return;
    if(e.key === "Enter"){
      e.preventDefault();
      const imeText = getImePreferredText();
      try{
        submitAttack(imeText || typingInput.value);
      }finally{
        // 需求：Enter 不論命中與否都清空輸入框
        hardClearInput();
      }
    }
  });

  // ===== Lexicon modal: X 一定關（capture + 委派雙保險）=====
  function openLexicon(){
    lexiconModal?.classList?.remove("hidden");
    setLexiconMsg("", true);
    if(lexiconCount) lexiconCount.textContent = String((window.WORDS || []).length);
  }
  function closeLexicon(){
    lexiconModal?.classList?.add("hidden");
  }

  btnLexiconClose?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeLexicon();
  }, true);

  lexiconModal?.addEventListener("click", (e) => {
    const closeBtn = e.target.closest?.("#btnLexiconClose");
    if(closeBtn){
      e.preventDefault();
      e.stopPropagation();
      closeLexicon();
      return;
    }
    if(e.target === lexiconModal) closeLexicon();
  });

  btnLexicon?.addEventListener("click", (e) => {
    e.preventDefault();
    openLexicon();
  });

  function setLexiconMsg(text, ok){
    if(!lexiconMsg) return;
    lexiconMsg.textContent = text || "";
    lexiconMsg.className = `msg ${ok ? "ok" : "bad"}`;
  }

  function validateWords(words){
    const out = [];
    const seen = new Set();
    for(const w of words){
      const han = String(w?.han ?? "").trim();
      const zy  = String(w?.zy ?? "").trim();
      if(!han || !zy) continue;
      const key = `${han}__${zy}`;
      if(seen.has(key)) continue;
      seen.add(key);
      out.push({ han, zy });
    }
    return out;
  }

  function parseCsv(text){
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    if(!lines.length) return [];
    const first = lines[0].toLowerCase();
    const hasHeader = first.includes("han") || first.includes("zy") || first.includes("注音") || first.includes("國字");
    const startIdx = hasHeader ? 1 : 0;

    const rows = [];
    for(let i=startIdx; i<lines.length; i++){
      const parts = lines[i].split(/,|\t/).map(s => s.trim());
      if(parts.length < 2) continue;
      rows.push({ han: parts[0], zy: parts[1] });
    }
    return rows;
  }

  btnImportJson?.addEventListener("click", () => {
    try{
      const parsed = JSON.parse(lexiconText.value);
      const normalized = validateWords(Array.isArray(parsed) ? parsed : []);
      if(normalized.length === 0){
        setLexiconMsg("匯入失敗：沒有任何有效題目（需包含 han 與 zy）。", false);
        return;
      }
      window.WORDS = normalized;
      window.LEXICON.saveWords(normalized);
      GAME.activeWords = normalized.slice();
      rebuildPronIndex();
      syncHud();
      setLexiconMsg(`匯入成功：${normalized.length} 題。`, true);
    }catch{
      setLexiconMsg("JSON 格式錯誤：請確認是合法 JSON。", false);
    }
  });

  btnImportCsv?.addEventListener("click", () => {
    const rows = parseCsv(lexiconText.value);
    const normalized = validateWords(rows);
    if(normalized.length === 0){
      setLexiconMsg("匯入失敗：CSV 解析不到有效題目（每列需：國字,注音）。", false);
      return;
    }
    window.WORDS = normalized;
    window.LEXICON.saveWords(normalized);
    GAME.activeWords = normalized.slice();
    rebuildPronIndex();
      syncHud();
    setLexiconMsg(`匯入成功：${normalized.length} 題。`, true);
  });

  btnExportJson?.addEventListener("click", async () => {
    try{
      const data = JSON.stringify(window.WORDS || [], null, 2);
      await navigator.clipboard.writeText(data);
      setLexiconMsg("已複製目前題庫 JSON 到剪貼簿。", true);
    }catch{
      setLexiconMsg("複製失敗：請手動複製下方文字。", false);
      if(lexiconText) lexiconText.value = JSON.stringify(window.WORDS || [], null, 2);
    }
  });

  btnResetDefault?.addEventListener("click", () => {
    window.LEXICON.resetWords();
    window.WORDS = window.LEXICON.DEFAULT_WORDS.slice();
    GAME.activeWords = window.WORDS.slice();
    rebuildPronIndex();
    syncHud();
    setLexiconMsg("已還原預設題庫。", true);
  });

  // ===================== init =====================
  resize();
  syncViewportVars();
  resetGame();
  rebuildPronIndex();
  applyLevel(1);
  syncHud();
})();
