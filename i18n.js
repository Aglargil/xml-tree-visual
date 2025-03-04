// language text configuration
const translations = {
  en: {
    title: "XML Tree Visualization Tool",
    uploadLabel: "Upload XML File:",
    inputLabel: "Or Input XML Content Directly:",
    inputPlaceholder: "Paste XML content here",
    visualizeBtn: "Visualize",
    resultTitle: "Visualization Result",
  },
  zh: {
    title: "XML树可视化工具",
    uploadLabel: "上传XML文件：",
    inputLabel: "或直接输入XML内容：",
    inputPlaceholder: "在此处粘贴XML内容",
    visualizeBtn: "可视化",
    resultTitle: "可视化结果",
  },
};

let currentLang = "en"; // default language is English

// switch language function
function switchLanguage(lang) {
  if (!translations[lang]) return;

  currentLang = lang;
  document.documentElement.lang = lang;

  // update all elements with data-i18n attribute
  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // update all elements with data-i18n-placeholder attribute
  const placeholders = document.querySelectorAll("[data-i18n-placeholder]");
  placeholders.forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[lang][key]) {
      el.setAttribute("placeholder", translations[lang][key]);
    }
  });

  // update language button status
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`lang-${lang}`).classList.add("active");

  // save current language to local storage
  localStorage.setItem("preferred-language", lang);
}

// initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  // check language setting in local storage, if not then use default language
  const savedLang = localStorage.getItem("preferred-language") || "en";
  switchLanguage(savedLang);

  // add click event to language buttons
  document
    .getElementById("lang-en")
    .addEventListener("click", () => switchLanguage("en"));
  document
    .getElementById("lang-zh")
    .addEventListener("click", () => switchLanguage("zh"));
});
