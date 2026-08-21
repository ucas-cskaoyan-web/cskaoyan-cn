/*
 * 卡片外观配置。
 *
 * 院校名称、链接和介绍放在 sites.md；卡片的图片、变体和排版放在这里。
 * 新增院校时只需要在 profiles 中增加一个同名配置，未配置的院校会使用
 * defaults，不会影响其他卡片。
 */
const sourceImage = (fileName) => `https://source.cskaoyan.cn/img/${fileName}`;

export const siteCardConfig = {
  clickCounter: {
    apiBaseUrl: "https://cskaoyan-cn-d5g3iz6sp2d1860a5-1310904868.ap-shanghai.app.tcloudbase.com/counter",
  },

  defaults: {
    variant: "standard",
    linkLabel: "访问站点",
    theme: {
      color: "#6750a4",
      aura: "#eaddff",
    },
  },

  profiles: {
    信工所: {
      counterId: "iie",
      scoreFile: "scores/iie.md",
      variant: "institute-featured",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzHXQ.jpg",
        serverSrc: sourceImage("iie-cover.jpg"),
        fallbackSrc: "images/iie-cover.jpg",
        position: "center 12%",
      },
      theme: {
        color: "#6750a4",
        aura: "#eaddff",
      },
      identity: {
        code: "CAS · IIE",
        subtitle: "院所专题 / 2026",
      },
      titleParts: [
        { className: "institute-title-academy", text: "中国科学院" },
        { className: "institute-title-name", text: "信息工程研究所" },
        {
          className: "institute-title-english",
          text: "INSTITUTE OF INFORMATION ENGINEERING",
        },
      ],
      linkLabel: "进入专题",
    },

    软件所: {
      counterId: "iscas",
      scoreFile: "scores/iscas.md",
      variant: "cover",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzxhV.jpg",
        serverSrc: sourceImage("iscas-cover.jpg"),
        fallbackSrc: "images/iscas-cover.jpg",
        position: "center 10%",
      },
      theme: {
        color: "#386a20",
        aura: "#b7f397",
      },
    },

    沈计所: {
      counterId: "sict",
      scoreFile: "scores/sict.md",
      variant: "title-only",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzO7n.jpg",
        serverSrc: sourceImage("sict-cover.jpg"),
        fallbackSrc: "images/sict-cover.jpg",
        position: "center",
      },
      theme: {
        color: "#785900",
        aura: "#ffdf9e",
      },
      titleParts: [
        { className: "title-academy", text: "中国科学院" },
        { className: "title-institution", text: "沈阳计算技术研究所" },
        { className: "title-guide", text: "报考指南" },
      ],
    },

    华大: {
      counterId: "bgi",
      scoreFile: "scores/bgi.md",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzqmj.jpg",
        serverSrc: sourceImage("bgi-cover.jpg"),
        fallbackSrc: "images/bgi-cover.jpg",
        position: "center",
      },
      theme: {
        color: "#6750a4",
        aura: "#eaddff",
      },
    },

    杭高院: {
      counterId: "hias",
      scoreFile: "scores/hias.md",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzjkq.png",
        serverSrc: sourceImage("hias-cover.png"),
        fallbackSrc: "images/hias-cover.png",
      },
      theme: {
        color: "#386a20",
        aura: "#b7f397",
      },
    },

    网信中心: {
      counterId: "cnic",
      scoreFile: "scores/cnic.md",
      variant: "cover",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzL0s.jpg",
        serverSrc: sourceImage("cnic-cover.jpg"),
        fallbackSrc: "images/cnic-cover.jpg",
        position: "center",
      },
      theme: {
        color: "#CC0028",
        aura: "#f6c9d2",
      },
    },

    计算所: {
      counterId: "ict",
      scoreFile: "scores/ict.md",
      variant: "ict-watercolor",
      image: {
        src: "https://s41.ax1x.com/2026/08/16/pmXzvt0.png",
        serverSrc: sourceImage("ict-cover.png"),
        fallbackSrc: "images/ict-cover.png",
        position: "center",
      },
      theme: {
        color: "#355d72",
        aura: "#dce8ec",
      },
      monogram: "计算所",
      identity: {
        code: "CAS · ICT",
        subtitle: "院所专题 · 2026",
      },
      titleParts: [
        { className: "ict-title-academy", text: "中国科学院" },
        { className: "ict-title-name", text: "计算技术研究所" },
        {
          className: "ict-title-english",
          text: "INSTITUTE OF COMPUTING TECHNOLOGY",
        },
      ],
      linkLabel: "进入专题",
    },

    重庆所: {
      variant: "cigit-featured",
      image: {
        src: "images/cigit-cover.png",
        position: "center 42%",
      },
      theme: {
        color: "#075e8c",
        aura: "#bce8f7",
      },
      monogram: "重庆所",
      identity: {
        code: "CAS · CIGIT",
        subtitle: "院所专题 · 2026",
      },
      titleParts: [
        { className: "cigit-title-academy", text: "中国科学院" },
        { className: "cigit-title-city", text: "重庆所" },
        { className: "cigit-title-name", text: "绿色智能技术研究院" },
        {
          className: "cigit-title-english",
          text: "CHONGQING INSTITUTE OF GREEN & INTELLIGENT TECHNOLOGY",
        },
      ],
      linkLabel: "进入专题",
    },
  },
};
