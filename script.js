import { siteCardConfig } from "./site-config.js?v=20260821-cigit-image-1";

const state = {
  sites: [],
  health: new Map(),
  clickCounts: new Map(),
  heatCounts: new Map(),
  lastClickAt: new Map(),
  scoreRows: new Map(),
};

const elements = {
  grid: document.querySelector("#site-grid"),
  template: document.querySelector("#site-card-template"),
  scoreYearRange: document.querySelector("#score-year-range"),
  scorePlans: new Map(
    [...document.querySelectorAll("[data-score-plan]")].map((section) => [
      section.dataset.scorePlan,
      {
        section,
        status: section.querySelector("[data-score-status]"),
        table: section.querySelector("[data-score-table]"),
        tableBody: section.querySelector("[data-score-table-body]"),
        institutionFilter: section.querySelector('[data-score-filter="institution"]'),
        yearFilter: section.querySelector('[data-score-filter="year"]'),
        courseFilter: section.querySelector('[data-score-filter="course"]'),
        degreeFilter: section.querySelector('[data-score-filter="degree"]'),
      },
    ]),
  ),
  status: document.querySelector("#status-panel"),
  visibleCount: document.querySelector("#visible-count"),
  contact: document.querySelector("#contact-button"),
  contactDialog: document.querySelector("#contact-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  copyEmail: document.querySelector("#copy-email"),
  backToTop: document.querySelector("#back-to-top"),
  year: document.querySelector("#year"),
};

const configuredCards = siteCardConfig ?? {};
const scorePlanDefinitions = [
  { id: "normal", headings: ["普通计划"] },
  { id: "soldier", headings: ["退役大学生士兵计划", "士兵计划"] },
  { id: "minority", headings: ["少数民族高层次骨干人才计划", "少数民族骨干计划", "少干计划"] },
];
const clickCounterApi = configuredCards.clickCounter?.apiBaseUrl?.replace(/\/$/, "") || "";
const clickVisitorId = getClickVisitorId();

function getClickVisitorId() {
  const storageKey = "cskaoyan-click-visitor";
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;

    const generated = globalThis.crypto?.randomUUID?.()
      || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return "session";
  }
}
const fallbackTheme = { color: "#6750a4", aura: "#eaddff" };
const defaultCard = {
  variant: "standard",
  linkLabel: "访问站点",
  ...configuredCards.defaults,
  theme: configuredCards.defaults?.theme || fallbackTheme,
};
const cardCoverTimeoutMs = 5_000;
const cardCoverProbes = new WeakMap();

function cardCoverUrl(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}

function getCardImageSources(image) {
  return [
    { url: image?.src, name: "image-host" },
    { url: image?.serverSrc, name: "aliyun-server" },
    { url: image?.fallbackSrc, name: "github-pages" },
  ].filter((source, index, sources) => {
    return source.url && sources.findIndex((candidate) => candidate.url === source.url) === index;
  });
}

function applyCardCover(card, image) {
  const sources = getCardImageSources(image);
  if (!sources.length) return;

  card.classList.add("site-card--cover");
  card.style.setProperty("--card-cover-position", image.position || "center");

  let sourceIndex = 0;
  let settled = false;
  let timeout;
  let probe;
  let attempt = 0;

  const tryNextSource = () => {
    if (settled) return;
    window.clearTimeout(timeout);
    if (sourceIndex >= sources.length) {
      settled = true;
      cardCoverProbes.delete(card);
      return;
    }

    const source = sources[sourceIndex];
    sourceIndex += 1;
    const currentAttempt = ++attempt;
    card.style.setProperty("--card-cover", cardCoverUrl(source.url));
    card.dataset.coverSource = source.name;

    const currentProbe = new Image();
    probe = currentProbe;
    const advance = () => {
      if (settled || currentAttempt !== attempt) return;
      tryNextSource();
    };
    timeout = window.setTimeout(advance, cardCoverTimeoutMs);
    currentProbe.addEventListener("load", () => {
      if (settled || currentAttempt !== attempt) return;
      settled = true;
      window.clearTimeout(timeout);
      cardCoverProbes.delete(card);
    }, { once: true });
    currentProbe.addEventListener("error", advance, { once: true });
    cardCoverProbes.set(card, currentProbe);
    currentProbe.src = source.url;
  };

  tryNextSource();
}

function normalizeMarkdownLink(line) {
  const nestedLink = line.match(/^\[\[([^\]]+)\]\((https?:\/\/[^)]+)\)\]\((https?:\/\/[^)]+)\)\s*$/);
  if (nestedLink) {
    return { label: nestedLink[1].trim(), url: nestedLink[3].trim() };
  }

  const standardLink = line.match(/^[[]([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/);
  if (standardLink) {
    return { label: standardLink[1].trim(), url: standardLink[2].trim() };
  }

  const plainUrl = line.match(/^(https?:\/\/\S+)\s*$/);
  if (plainUrl) {
    return { label: "访问站点", url: plainUrl[1].trim() };
  }

  return null;
}

function inlineText(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*+]\s+/, "")
    .trim();
}

function parseSites(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const sites = [];
  let current = null;

  function commitCurrent() {
    if (!current) return;

    const description = current.description.map(inlineText).filter(Boolean);
    if (current.url) {
      sites.push({
        ...current,
        description: description.length ? description : ["暂无介绍。"],
        card: resolveCardConfig(current),
      });
    }
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    const heading = line.match(/^##(?!#)\s+(?:\*\*)?(.+?)(?:\*\*)?\s*$/);

    if (heading) {
      commitCurrent();
      current = {
        shortName: heading[1].replace(/^\*\*|\*\*$/g, "").trim(),
        name: "",
        url: "",
        description: [],
        order: sites.length,
      };
      return;
    }

    if (!current || !line) return;

    if (!current.url) {
      const link = normalizeMarkdownLink(line);
      if (link) {
        current.name = link.label === "访问站点" ? current.shortName : link.label;
        current.url = link.url;
        return;
      }
    }

    // 保留旧格式兼容性：未来也可以直接在 Markdown 中提供一张封面图。
    const image = line.match(/^!\[([^\]]*)\]\((\S+)\)\s*$/);
    if (image) {
      current.legacyImage = { src: image[2].trim(), alt: image[1].trim() };
      return;
    }

    current.description.push(line);
  });

  commitCurrent();
  return sites;
}

function resolveCardConfig(site) {
  const profile = configuredCards.profiles?.[site.shortName] ?? {};
  const legacyImage = site.legacyImage;
  const legacyCard = resolveLegacyCardConfig(site, legacyImage);
  const legacyImageConfig = legacyImage ? {
    src: legacyImage.src,
    alt: legacyImage.alt,
    position: legacyImagePosition(legacyImage.alt),
  } : null;
  const image = Object.prototype.hasOwnProperty.call(profile, "image")
    ? profile.image
    : legacyImageConfig ?? defaultCard.image ?? null;

  return {
    ...defaultCard,
    ...legacyCard,
    ...profile,
    theme: profile.theme ?? defaultCard.theme,
    image,
  };
}

function resolveScoreFile(site) {
  return site.card?.scoreFile || `scores/${encodeURIComponent(site.shortName)}.md`;
}

function normalizeScoreHeader(value) {
  return value.replace(/\s+/g, "").replace(/[（(].*?[）)]/g, "").trim();
}

function parseScoreCell(value) {
  const link = value.match(/\[([^\]]+)\]\(([^)]+)\)/);
  return {
    text: inlineText(value),
    url: link?.[2]?.trim() || "",
  };
}

function extractScorePlanMarkdown(markdown, planId) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const headings = [];

  lines.forEach((line, index) => {
    const match = line.trim().match(/^##(?!#)\s+(.+?)\s*$/);
    if (!match) return;

    const heading = inlineText(match[1]).replace(/\s+/g, "");
    const plan = scorePlanDefinitions.find((candidate) => {
      return candidate.headings.some((name) => name.replace(/\s+/g, "") === heading);
    });
    if (plan) headings.push({ index, planId: plan.id });
  });

  // 兼容旧文件：没有计划标题时，第一张表仍按普通计划处理。
  if (!headings.length) return planId === "normal" ? markdown : "";

  const targetIndex = headings.findIndex((heading) => heading.planId === planId);
  if (targetIndex < 0) return "";

  const start = headings[targetIndex].index + 1;
  const end = headings[targetIndex + 1]?.index ?? lines.length;
  return lines.slice(start, end).join("\n");
}

function parseScoreMarkdown(markdown, site, planId) {
  const lines = extractScorePlanMarkdown(markdown, planId).split("\n");
  const rows = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index].trim();
    const separatorLine = lines[index + 1].trim();
    if (!headerLine.includes("|") || !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separatorLine)) {
      continue;
    }

    const headers = splitMarkdownTableRow(headerLine).map(normalizeScoreHeader);
    const headerMap = new Map(headers.map((header, headerIndex) => [header, headerIndex]));
    const findColumn = (...names) => names.map(normalizeScoreHeader).find((name) => headerMap.has(name));
    const columns = {
      year: findColumn("年份", "年"),
      degreeType: findColumn("类型", "学硕/专硕", "学硕OR专硕"),
      majorName: findColumn("专业", "专业名称", "方向"),
      professionalCourseCode: findColumn("专业课代码", "科目代码"),
      politics: findColumn("政治"),
      english: findColumn("英语"),
      math: findColumn("数学"),
      professionalCourseScore: findColumn("专业课", "专业课分数", "业务课"),
      totalLine: findColumn("分数线", "总分线", "总分"),
      source: findColumn("来源"),
      note: findColumn("备注"),
    };

    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex].trim();
      if (!rowLine.startsWith("|")) break;

      const cells = splitMarkdownTableRow(rowLine);
      const cellAt = (column) => (column ? parseScoreCell(cells[headerMap.get(column)] ?? "") : { text: "", url: "" });
      const year = Number.parseInt(cellAt(columns.year).text, 10);
      const totalLine = cellAt(columns.totalLine).text;
      if (!Number.isFinite(year) || !totalLine) continue;

      const source = cellAt(columns.source);
      rows.push({
        institutionId: site.shortName,
        institutionName: site.shortName,
        year,
        degreeType: cellAt(columns.degreeType).text || "未注明",
        majorName: cellAt(columns.majorName).text || "未注明专业",
        professionalCourseCode: cellAt(columns.professionalCourseCode).text || "未注明",
        politics: cellAt(columns.politics).text,
        english: cellAt(columns.english).text,
        math: cellAt(columns.math).text,
        professionalCourseScore: cellAt(columns.professionalCourseScore).text,
        totalLine,
        source: source.text,
        sourceUrl: source.url,
        note: cellAt(columns.note).text,
      });
    }
    break;
  }

  return rows;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function getRecentScoreRows(rows) {
  const currentYear = new Date().getFullYear();
  return rows
    .filter((row) => row.year >= currentYear - 2 && row.year <= currentYear)
    .sort((a, b) => b.year - a.year || a.institutionName.localeCompare(b.institutionName, "zh-CN"));
}

function updateScoreFilters(rows, view) {
  const institutions = [...new Set(rows.map((row) => row.institutionName))];
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => b - a);
  const courseCodes = [...new Set(rows.map((row) => row.professionalCourseCode))]
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  const degrees = [...new Set(rows.map((row) => row.degreeType))];
  const updateSelect = (select, values, allLabel) => {
    const previous = select.value;
    const normalizedValues = values.map(String);
    select.replaceChildren(new Option(allLabel, ""), ...normalizedValues.map((value) => new Option(value, value)));
    if (normalizedValues.includes(previous)) select.value = previous;
  };

  updateSelect(view.institutionFilter, institutions, "全部院所");
  updateSelect(view.yearFilter, years, "全部年份");
  updateSelect(view.courseFilter, courseCodes, "全部代码");
  updateSelect(view.degreeFilter, degrees, "全部类型");
}

function renderScoreRows(planId) {
  const view = elements.scorePlans.get(planId);
  if (!view) return;

  const institution = view.institutionFilter.value;
  const year = view.yearFilter.value;
  const courseCode = view.courseFilter.value;
  const degree = view.degreeFilter.value;
  const rows = (state.scoreRows.get(planId) || []).filter((row) => {
    return (!institution || row.institutionName === institution)
      && (!year || String(row.year) === year)
      && (!courseCode || row.professionalCourseCode === courseCode)
      && (!degree || row.degreeType === degree);
  });

  view.tableBody.replaceChildren();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const values = [
      row.institutionName,
      row.year,
      row.degreeType,
      row.majorName,
      row.professionalCourseCode,
      row.politics,
      row.english,
      row.math,
      row.professionalCourseScore,
      row.totalLine,
    ];
    values.forEach((value, index) => {
      const td = document.createElement("td");
      td.dataset.label = ["研究所", "年份", "类型", "专业", "专业课代码", "政治", "英语", "数学", "专业课", "总分线"][index];
      td.textContent = value;
      tr.append(td);
    });
    if (row.sourceUrl) {
      const source = document.createElement("a");
      source.href = row.sourceUrl;
      source.target = "_blank";
      source.rel = "noreferrer";
      source.textContent = row.source || "来源";
      source.className = "score-source";
      tr.lastElementChild.append(document.createTextNode(" "), source);
    }
    view.tableBody.append(tr);
  });

  view.table.hidden = rows.length === 0;
  view.status.hidden = rows.length > 0;
  if (!rows.length) view.status.textContent = "近三年暂无已录入的分数线数据";
}

async function loadScoreOverview(sites) {
  const currentYear = new Date().getFullYear();
  elements.scoreYearRange.textContent = `${currentYear - 2}–${currentYear} 年`;

  const scoreDocuments = await Promise.all(sites.map(async (site) => {
    try {
      const response = await fetch(resolveScoreFile(site), { cache: "no-cache" });
      if (!response.ok) return null;
      return { site, markdown: await response.text() };
    } catch {
      return null;
    }
  }));

  scorePlanDefinitions.forEach((plan) => {
    const rows = getRecentScoreRows(scoreDocuments.flatMap((document) => {
      return document ? parseScoreMarkdown(document.markdown, document.site, plan.id) : [];
    }));
    const view = elements.scorePlans.get(plan.id);
    state.scoreRows.set(plan.id, rows);
    if (view) {
      updateScoreFilters(rows, view);
      renderScoreRows(plan.id);
    }
  });
}

function legacyImagePosition(alt) {
  if (alt === "院所封面") return "center 12%";
  if (alt === "封面") return "center 10%";
  return "center";
}

function resolveLegacyCardConfig(site, image) {
  if (!image) return {};

  if (image.alt === "院所封面") {
    return {
      variant: "institute-featured",
      identity: {
        code: "CAS · IIE",
        subtitle: "院所专题 / 2026",
      },
      titleParts: buildLegacyInstituteTitle(site.name),
    };
  }

  if (image.alt === "标题封面") {
    return {
      variant: "title-only",
      titleParts: buildLegacyGuideTitle(site.name),
    };
  }

  return { variant: "cover" };
}

// 仅用于兼容旧版 sites.md；新卡片请直接在 site-config.js 中填写 titleParts。
function buildLegacyInstituteTitle(name) {
  const academyPrefix = "中国科学院";
  if (!name.startsWith(academyPrefix)) return undefined;

  return [
    { className: "institute-title-academy", text: academyPrefix },
    { className: "institute-title-name", text: name.slice(academyPrefix.length) },
    {
      className: "institute-title-english",
      text: "INSTITUTE OF INFORMATION ENGINEERING",
    },
  ];
}

function buildLegacyGuideTitle(name) {
  if (!name.endsWith("报考指南")) return undefined;

  const institutionName = name.slice(0, -4);
  const academyPrefix = "中国科学院";
  const hasAcademyPrefix = institutionName.startsWith(academyPrefix);

  return [
    { className: "title-academy", text: hasAcademyPrefix ? academyPrefix : "" },
    {
      className: "title-institution",
      text: hasAcademyPrefix ? institutionName.slice(academyPrefix.length) : institutionName,
    },
    { className: "title-guide", text: "报考指南" },
  ];
}

function getVisibleSites() {
  return [...state.sites].sort((a, b) => a.order - b.order);
}

function renderStructuredData(sites) {
  document.querySelector("#site-list-schema")?.remove();

  const schema = document.createElement("script");
  schema.id = "site-list-schema";
  schema.type = "application/ld+json";
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://cskaoyan.cn/#site-list",
    name: "国科大计算机考研院所专题站",
    description: "国科大及中国科学院相关院所的计算机考研报考信息站点列表。",
    numberOfItems: sites.length,
    itemListElement: sites.map((site, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "WebSite",
        name: site.name,
        alternateName: site.shortName,
        url: site.url,
        description: site.description.join(" "),
        inLanguage: "zh-CN",
      },
    })),
  });
  document.head.append(schema);
}

function applyHealthState(siteId, status) {
  document.querySelectorAll(`[data-site-id="${siteId}"] .site-health`).forEach((badge) => {
    updateHealthBadge(badge, status);
  });
}

function formatClickCount(value) {
  return `${Number(value).toLocaleString("zh-CN")} 次点击`;
}

function formatHeat(value) {
  return `${Number(value).toLocaleString("zh-CN")} 热度`;
}

function updateClickCount(counterId, value, stateName = "ready") {
  document.querySelectorAll(`[data-counter-id="${counterId}"]`).forEach((badge) => {
    badge.classList.remove("is-loading", "is-ready", "is-unavailable");
    badge.classList.add(`is-${stateName}`);

    if (stateName === "ready") {
      badge.textContent = formatClickCount(value);
      badge.title = `该卡片累计被点击 ${Number(value).toLocaleString("zh-CN")} 次`;
    } else if (stateName === "unavailable") {
      badge.textContent = "点击量暂缺";
      badge.title = "暂时无法读取卡片点击量";
    } else {
      badge.textContent = "读取点击量";
      badge.title = "正在读取卡片点击量";
    }
  });
}

function updateHeat(counterId, value, stateName = "ready") {
  document.querySelectorAll(`[data-heat-counter-id="${counterId}"]`).forEach((badge) => {
    badge.classList.remove("is-loading", "is-ready", "is-unavailable");
    badge.classList.add(`is-${stateName}`);

    if (stateName === "ready") {
      badge.textContent = formatHeat(value);
      badge.title = "站点访问热度";
    } else if (stateName === "unavailable") {
      badge.textContent = "热度暂缺";
      badge.title = "暂时无法读取站点热度";
    } else {
      badge.textContent = "读取热度";
      badge.title = "正在读取站点热度";
    }
  });
}

function reorderSiteCardsByHeat() {
  const sortedSites = [...state.sites].sort((a, b) => {
    const aCounterId = a.card.counterId;
    const bCounterId = b.card.counterId;
    const hasAHeat = Boolean(aCounterId) && state.heatCounts.has(aCounterId);
    const hasBHeat = Boolean(bCounterId) && state.heatCounts.has(bCounterId);

    if (hasAHeat && hasBHeat) {
      return state.heatCounts.get(aCounterId) - state.heatCounts.get(bCounterId)
        || a.order - b.order;
    }
    if (hasAHeat !== hasBHeat) return hasAHeat ? -1 : 1;
    return a.order - b.order;
  });

  const cardsBySiteId = new Map(
    [...elements.grid.children].map((card) => [card.dataset.siteId, card]),
  );

  sortedSites.forEach((site) => {
    const card = cardsBySiteId.get(String(site.order));
    if (card) elements.grid.append(card);
  });
}

async function loadClickCounts(sites) {
  const counterIds = sites.map((site) => site.card.counterId).filter(Boolean);
  if (!clickCounterApi || !counterIds.length) return;

  try {
    const response = await fetch(`${clickCounterApi}/counts`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const counts = await response.json();
    const heat = counts.heat || {};
    counterIds.forEach((counterId) => {
      const clicks = Number(counts[counterId] || 0);
      const heatValue = Number(heat[counterId] || 0);
      state.clickCounts.set(counterId, clicks);
      state.heatCounts.set(counterId, heatValue);
      updateClickCount(counterId, clicks);
      updateHeat(counterId, heatValue);
    });
    reorderSiteCardsByHeat();
  } catch {
    counterIds.forEach((counterId) => {
      updateClickCount(counterId, 0, "unavailable");
      updateHeat(counterId, 0, "unavailable");
    });
  }
}

function trackSiteClick(counterId) {
  if (!clickCounterApi || !counterId) return;

  const now = Date.now();
  const lastClick = state.lastClickAt.get(counterId) || 0;
  if (now - lastClick < 10_000) return;
  state.lastClickAt.set(counterId, now);

  const endpoint = new URL(`${clickCounterApi}/click/${encodeURIComponent(counterId)}`);
  endpoint.searchParams.set("visitor", clickVisitorId);
  fetch(endpoint, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    keepalive: true,
  })
    .then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      const clicks = Number(result.clicks);
      const heat = Number(result.heat);
      if (Number.isFinite(clicks)) {
        state.clickCounts.set(counterId, clicks);
        updateClickCount(counterId, clicks);
      }
      if (Number.isFinite(heat)) {
        state.heatCounts.set(counterId, heat);
        updateHeat(counterId, heat);
        reorderSiteCardsByHeat();
      }
    })
    .catch(() => {});
}

function updateHealthBadge(badge, status) {
  badge.classList.remove("is-checking", "is-online", "is-offline");
  badge.classList.add(`is-${status}`);

  const label = badge.querySelector(".health-label");
  if (status === "online") {
    label.textContent = "可访问";
    badge.title = "网站连接正常";
  } else if (status === "offline") {
    label.textContent = "检测异常";
    badge.title = "暂时无法建立连接，目标网站仍可能正常运行";
  } else {
    label.textContent = "检测中";
    badge.title = "正在检测网站连通性";
  }
}

async function checkSiteHealth(site) {
  if (state.health.has(site.order)) {
    applyHealthState(site.order, state.health.get(site.order));
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  const healthUrl = new URL("/favicon.ico", site.url);
  healthUrl.searchParams.set("health-check", Date.now().toString());

  try {
    await fetch(healthUrl, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    state.health.set(site.order, "online");
  } catch {
    state.health.set(site.order, "offline");
  } finally {
    window.clearTimeout(timeout);
    applyHealthState(site.order, state.health.get(site.order));
  }
}

function appendTitleParts(title, parts) {
  if (!Array.isArray(parts) || !parts.length) {
    title.textContent = title.dataset.siteName ?? "";
    return;
  }

  title.replaceChildren(
    ...parts.map(({ className, text }) => {
      const part = document.createElement("span");
      part.className = className;
      part.textContent = text;
      return part;
    }),
  );
}

function appendIdentity(card, identity) {
  if (!identity) return;

  const identityNode = document.createElement("div");
  const rule = document.createElement("span");
  const copy = document.createElement("span");
  const code = document.createElement("strong");
  const subtitle = document.createElement("small");

  identityNode.className = "institute-identity";
  identityNode.setAttribute("aria-hidden", "true");
  rule.className = "institute-identity-rule";
  copy.className = "institute-identity-copy";
  code.textContent = identity.code ?? "";
  subtitle.textContent = identity.subtitle ?? "";
  copy.append(code, subtitle);
  identityNode.append(rule, copy);
  card.querySelector(".card-topline").after(identityNode);
}

function configureCard(card, site) {
  const config = site.card;
  const variant = config.variant || "standard";
  const theme = config.theme || defaultCard.theme;

  card.dataset.siteId = String(site.order);
  card.dataset.cardVariant = variant;
  card.classList.add(`site-card--${variant}`);
  card.style.setProperty("--card-color", theme.color);
  card.style.setProperty("--card-aura", theme.aura);

  applyCardCover(card, config.image);

  card.querySelector(".site-monogram").textContent = config.monogram ?? site.shortName;
  appendIdentity(card, config.identity);
}

function renderSiteCard(site) {
  const node = elements.template.content.cloneNode(true);
  const card = node.querySelector(".site-card");
  const title = node.querySelector("h3");
  const config = site.card;

  configureCard(card, site);
  title.dataset.siteName = site.name;
  appendTitleParts(title, config.titleParts);

  const knownHealth = state.health.get(site.order);
  if (knownHealth) updateHealthBadge(node.querySelector(".site-health"), knownHealth);

  const clickCount = node.querySelector(".site-click-count");
  const heat = node.querySelector(".site-heat");
  if (config.counterId) {
    clickCount.dataset.counterId = config.counterId;
    heat.dataset.heatCounterId = config.counterId;
  } else {
    clickCount.hidden = true;
    heat.hidden = true;
  }

  const description = node.querySelector(".site-description");
  site.description.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    description.append(p);
  });

  const link = node.querySelector(".site-link");
  link.href = site.url;
  link.setAttribute("aria-label", `访问 ${site.name}`);
  link.firstChild.textContent = `${config.linkLabel || "访问站点"} `;
  link.addEventListener("click", () => trackSiteClick(config.counterId));
  return node;
}

function renderSites() {
  const sites = getVisibleSites();
  const fragment = document.createDocumentFragment();

  elements.grid.replaceChildren();
  elements.visibleCount.textContent = String(sites.length);
  sites.forEach((site) => fragment.append(renderSiteCard(site)));
  elements.grid.append(fragment);
  elements.grid.hidden = sites.length === 0;
  loadClickCounts(sites);
  sites.forEach(checkSiteHealth);
}

async function loadSites() {
  try {
    const response = await fetch("sites.md", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    state.sites = parseSites(await response.text());
    if (!state.sites.length) throw new Error("sites.md 中没有可显示的有效站点");

    elements.status.hidden = true;
    elements.grid.hidden = false;
    renderStructuredData(state.sites);
    renderSites();
    loadScoreOverview(state.sites);
  } catch (error) {
    elements.visibleCount.textContent = "0";
    elements.grid.replaceChildren();
    elements.grid.hidden = true;
    elements.status.hidden = false;
    elements.status.innerHTML = `
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 8v5M12 17h.01"/><path d="M10.3 4.7 2.9 17.5A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.5L13.7 4.7a2 2 0 0 0-3.4 0Z"/></svg>
      </div>
      <p><strong>站点目录读取失败</strong><br><span>${error.message}</span></p>
    `;
  }
}

elements.backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

elements.contact.addEventListener("click", () => {
  elements.contactDialog.showModal();
});

elements.dialogClose.addEventListener("click", () => {
  elements.contactDialog.close();
});

elements.contactDialog.addEventListener("click", (event) => {
  if (event.target === elements.contactDialog) elements.contactDialog.close();
});

elements.scorePlans.forEach((view, planId) => {
  [view.institutionFilter, view.yearFilter, view.courseFilter, view.degreeFilter].forEach((filter) => {
    filter.addEventListener("change", () => renderScoreRows(planId));
  });
});

elements.copyEmail.addEventListener("click", async () => {
  const email = elements.copyEmail.dataset.email;

  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const input = document.createElement("textarea");
    input.value = email;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  const label = elements.copyEmail.querySelector("span");
  label.textContent = "已复制";
  window.setTimeout(() => {
    label.textContent = "复制邮箱";
  }, 1800);
});

window.addEventListener(
  "scroll",
  () => elements.backToTop.classList.toggle("is-visible", window.scrollY > 520),
  { passive: true },
);

elements.year.textContent = new Date().getFullYear();
loadSites();
