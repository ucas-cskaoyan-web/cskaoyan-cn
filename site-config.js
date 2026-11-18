/*
 * 卡片外观与子页面专题配置。
 *
 * 院校名称、链接和介绍放在 sites.md；卡片的图片、变体和子页特色排版放在这里。
 * 新增院校时只需要在 profiles 中增加一个同名配置，未配置的院校会使用
 * defaults，不会影响其他卡片或子页面。
 */
const sourceImage = (fileName) => `https://source.cskaoyan.cn/img/${fileName}`;

export const siteCardConfig = {
  clickCounter: {
    apiBaseUrl: "https://source.cskaoyan.cn/counter",
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
      article: {
        style: "iie-report",
        layout: "metrics",
        kicker: "IIE · 2026 DATA REPORT",
        subtitle: "统考与推免独立建档，按年度拆解生源结构、初试分数段与 11 个研究室录取去向。",
        portal: {
          title: "信工所考研信息站",
          desc: "查看 2026 保研/考研完整数据报告、各科室录取明细与上岸经验库",
          cta: "前往信工所信息站",
          tags: ["年度数据全景", "11 个科室分布", "初复试经验"],
        },
        highlightsTitle: "2026 考情快照",
        highlights: [
          { value: "315 / 318", label: "学硕 / 专硕复试线", note: "单科线 40/70 · 40/60" },
          { value: "145 人", label: "统考拟录取规模", note: "216 人进复试 · 录 67.1%" },
          { value: "11408 / 22408", label: "学硕 / 专硕科目", note: "26 专硕改考数二英二" },
          { value: "11 个科室", label: "按研究室独立报考", note: "各室名额与竞争度不同" },
        ],
      },
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
      article: {
        style: "iscas-terminal",
        layout: "modules",
        windowTitle: "iscas.cskaoyan.cn — ISCAS Admission Docs",
        kicker: "ISCAS :: GUIDE",
        subtitle: "按初试方向选择、复试机试与面试考核、各研究部门拟录取分组模块化归档。",
        portal: {
          title: "中科院软件所（ISCAS）考研指南",
          desc: "查阅各实验室招生方向对照、复试机试准备攻略与历年拟录取名单",
          cta: "打开软件所考研指南",
          tags: ["实验室方向对照", "机试与面试攻略", "历年录取归档"],
        },
        highlightsTitle: "报考核心模块",
        highlights: [
          { code: "01 // EXAM", title: "学专分科清晰", desc: "学硕考 11408（26 线 269 分），专硕考 22408（26 线 300 分）。" },
          { code: "02 // DEPT", title: "按研究部门报考", desc: "国重、天基、人机、并行等部门独立划线分组，报名前需先定部门。" },
          { code: "03 // RETEST", title: "重视编码与工程能力", desc: "复试覆盖材料审查、上机/笔试与综合面试，建议尽早准备机试。" },
        ],
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
      article: {
        style: "sict-editorial",
        layout: "roadmap",
        kicker: "2027 SICT ADMISSION GUIDE",
        subtitle: "把最新招生目录、统考可用名额与历年分数分布整理成一页可核对的报考路线图。",
        portal: {
          title: "沈阳计算所报考指南（沈计指南）",
          desc: "查看 2027 统考名额拆解、历年录取完整分数分布、登分统计与经验归档",
          cta: "进入沈计报考指南",
          tags: ["2027 招生计划", "完整分数段分布", "上岸经验归档"],
        },
        highlightsTitle: "报考速览路线",
        highlights: [
          { step: "01 · 招生口径", title: "27 预计统考 55 人", desc: "目录拟招 61 人、公示推免 6 人；26 起专硕改考统考 22408。" },
          { step: "02 · 成绩权重", title: "初复试各占 50%", desc: "复试包含专业课笔试、综合面试与英语听说测试三个环节。" },
          { step: "03 · 培养与待遇", title: "研一北京集中授课", desc: "研一在国科大北京校区上课，免收学费并发放研究所助学补贴。" },
        ],
      },
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
      article: {
        style: "bgi-bio",
        layout: "qa",
        kicker: "UCAS × BGI · AI 学院联合培养",
        subtitle: "国科大人工智能学院双证专硕专项，聚焦生物信息、AI+生命科学与智能测序工程。",
        portal: {
          title: "国科大人工智能学院 · 华大联培指南",
          desc: "查看 2026 各分数段报录比、单科中位数统计、基地介绍与真实利弊问答",
          cta: "进入华大联培指南",
          tags: ["26 分数段样本", "多地基地解析", "真实利弊 Q&A"],
        },
        highlightsTitle: "考生高频三问",
        highlights: [
          { q: "在哪里上课与科研？", a: "前半年在北京国科大雁栖湖集中授课，后 2.5 年随课题组赴深圳、杭州、青岛、武汉等基地。" },
          { q: "初试考什么、偏什么方向？", a: "统考北京 22408（26 线 290 分，单科 45/70），课题以生信算法、基因组模型与工程实践为主。" },
          { q: "报名前需要联系导师吗？", a: "无需提前联系，复试确定拟录取名单后统一组织学生与导师双选。" },
        ],
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
      article: {
        style: "hias-academy",
        layout: "tracks",
        kicker: "HIAS GUIDE · 杭州高等研究院",
        subtitle: "按智能学院、物光学院等二级学院独立招生，同一代码下不同方向复试线差异显著。",
        portal: {
          title: "国科大杭州高等研究院报考指南",
          desc: "按二级学院查阅招生目录、细分方向复试线、杭州园区住宿与培养体验",
          cta: "前往杭高院报考指南",
          tags: ["智能学院", "物光学院与联培", "园区生活指南"],
        },
        highlightsTitle: "2026 细分方向复试线对照",
        highlights: [
          { badge: "主方向", title: "人工智能", value: "360 分", note: "22408 · 连续两年高热度" },
          { badge: "主方向", title: "计算机技术", value: "335 分", note: "22408 · 25–26 分数线持平" },
          { badge: "特色方向", title: "智能光电处理", value: "330 分", note: "人工智能专业下设单列方向" },
          { badge: "联培方向", title: "小卫星联培", value: "315 分", note: "人工智能专业下设联合培养" },
        ],
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
      article: {
        style: "cnic-pioneer",
        layout: "metrics",
        kicker: "CNIC · 中国互联网的发源地",
        subtitle: "运行中国科技云与中国科技网等国家级基础设施，深耕超算、云计算与大数据系统。",
        portal: {
          title: "计算机网络信息中心（CNIC）报考指南",
          desc: "查阅初试核心数据分析、复试考核细则、毕业生大厂/科研去向与上岸经验",
          cta: "进入网信中心指南",
          tags: ["初试数据分析", "毕业去向统计", "6 大业务部介绍"],
        },
        highlightsTitle: "2026 考情与平台速览",
        highlights: [
          { value: "290 / 346", label: "26 学硕 / 专硕线", note: "学硕 11408 · 专硕 22408" },
          { value: "95 人", label: "26 拟录取总人数", note: "推免 50 · 学硕 14 · 专硕 33" },
          { value: "288 / 237", label: "士兵 / 少干专项线", note: "专项计划独立划线招生" },
          { value: "6 大部门", label: "国家级科研平台", note: "超算 · 科技云 · 大数据 · AI" },
        ],
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
      article: {
        style: "ict-scholar",
        layout: "modules",
        kicker: "CAS · ICT · 先看数据，再做决定",
        subtitle: "按专业与重点实验室组织招生，数学及 408 单科线显著高于国家线，报名前务必核对。",
        portal: {
          title: "中国科学院计算技术研究所报考指南",
          desc: "查看各专业初试总分分布、十余个重点实验室/研究中心详解与多园区培养说明",
          cta: "进入计算所报考指南",
          tags: ["初试分数分布", "15+ 实验室详解", "本部与分所联培"],
        },
        highlightsTitle: "报考决策要点",
        highlights: [
          { code: "单科高线", title: "数学 / 408 达 80–90 分", desc: "26 计科与专硕总分 310，网安总分 290 但数一 90、408 85。" },
          { code: "科研矩阵", title: "处理器芯片 · 智能信息 · 网络数据", desc: "下设微处理器、智能处理器、高性能计算等十余个核心研究单元。" },
          { code: "培养园区", title: "不止中关村本部", desc: "包含中关村、顺义园区及各地分所联培名额，填报时须看清培养地。" },
        ],
      },
    },

    重庆所: {
      counterId: "cigit",
      scoreFile: "scores/cigit.md",
      variant: "cigit-featured",
      image: {
        src: "https://s41.ax1x.com/2026/08/21/pmz9Dx0.png",
        serverSrc: sourceImage("cigit-cover.png"),
        fallbackSrc: "images/cigit-cover.png",
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
      article: {
        style: "cigit-emerald",
        layout: "metrics",
        kicker: "CAS · CIGIT / 智能技术方向",
        subtitle: "聚焦智能技术方向，2026 年起改考 22408，复试无笔试机试、以综合面试为主。",
        portal: {
          title: "重庆绿所智能技术方向报考指南",
          desc: "查看 2023–2026 招生录取明细、研究生奖助补贴、两江园区住宿与就业去向",
          cta: "进入重庆所报考指南",
          tags: ["23–26 报录数据", "纯面试复试解析", "补贴与园区生活"],
        },
        highlightsTitle: "2026 招生概览",
        highlights: [
          { value: "290 分", label: "26 专硕复试线", note: "单科 35/53 · 录取 302–401" },
          { value: "22 → 11", label: "一志愿复录比 2:1", note: "332 分以上未出现淘汰" },
          { value: "22408", label: "初试科目调整", note: "2026 年由 11408 改为 22408" },
          { value: "纯面试", label: "无笔试 · 无机试", note: "围绕个人简历与项目经历考核" },
        ],
      },
    },
  },
};
