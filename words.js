(() => {
    const KEY = "zm_words_v1";
  
    const DEFAULT_WORDS = [
      { han: "我", zy: "ㄨㄛˇ" },
      { han: "你", zy: "ㄋㄧˇ" },
      { han: "他", zy: "ㄊㄚ" },
      { han: "是", zy: "ㄕˋ" },
      { han: "的", zy: "ㄉㄜ˙" },
      { han: "在", zy: "ㄗㄞˋ" },
      { han: "有", zy: "ㄧㄡˇ" },
      { han: "不", zy: "ㄅㄨˋ" },
      { han: "好", zy: "ㄏㄠˇ" },
      { han: "學", zy: "ㄒㄩㄝˊ" },
      { han: "校", zy: "ㄒㄧㄠˋ" },
      { han: "注", zy: "ㄓㄨˋ" },
      { han: "音", zy: "ㄧㄣ" },
      { han: "打", zy: "ㄉㄚˇ" },
      { han: "字", zy: "ㄗˋ" },
      { han: "快", zy: "ㄎㄨㄞˋ" },
      { han: "慢", zy: "ㄇㄢˋ" },
      { han: "火", zy: "ㄏㄨㄛˇ" },
      { han: "水", zy: "ㄕㄨㄟˇ" },
      { han: "木", zy: "ㄇㄨˋ" },
      { han: "土", zy: "ㄊㄨˇ" },
    ];
  
    function loadWords() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULT_WORDS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_WORDS;
        return parsed;
      } catch {
        return DEFAULT_WORDS;
      }
    }
  
    function saveWords(words) {
      localStorage.setItem(KEY, JSON.stringify(words));
    }
  
    function resetWords() {
      localStorage.removeItem(KEY);
    }
  
    window.LEXICON = { KEY, loadWords, saveWords, resetWords, DEFAULT_WORDS };
    window.WORDS = loadWords();
  })();
  