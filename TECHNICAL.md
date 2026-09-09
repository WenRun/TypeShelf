# RunFonts 核心技术架构设计与规范标准手册 (TECHNICAL.md)

> **版本**：v1.0.0  
> **适用项目**：RunFonts 字体管理系统  
> **文档目标**：统一记录 RunFonts 项目的**核心架构设计、关键技术模块实现机制、工程规范标准以及常见问题排查手册（FAQ）**。  
> **维护说明**：本文档为全项目的统一技术基准。后续如有新功能演进、架构重构或排查出新问题，均需在本文档对应章节持续补充。

---

## 目录 (Table of Contents)

- [一、系统架构总览与设计哲学](#一系统架构总览与设计哲学)
  - [1.1 系统定位](#11-系统定位)
  - [1.2 技术栈全景](#12-技术栈全景)
  - [1.3 工程目录结构规范](#13-工程目录结构规范)
  - [1.4 系统拓扑与端到端数据流](#14-系统拓扑与端到端数据流)
- [二、核心技术模块设计与实现机制](#二核心技术模块设计与实现机制)
  - [2.1 字体扫描与元数据提取引擎 (Scanner Engine)](#21-字体扫描与元数据提取引擎-scanner-engine)
  - [2.2 二进制编码清洗与智能降级解码机制 (Smart Encoding Fallback)](#22-二进制编码清洗与智能降级解码机制-smart-encoding-fallback)
  - [2.3 首页字体搜索与多维聚合过滤机制 (Search & Aggregation Engine)](#23-首页字体搜索与多维聚合过滤机制-search--aggregation-engine)
  - [2.4 海量字体分页与触底无限滚动机制 (Infinite Scroll)](#24-海量字体分页与触底无限滚动机制-infinite-scroll)
  - [2.5 物理文件溯源与详情展示体系 (Traceability & Details)](#25-物理文件溯源与详情展示体系-traceability--details)
  - [2.6 多语言国际化系统设计 (i18n Architecture)](#26-多语言国际化系统设计-i18n-architecture)
  - [2.7 全局主题外观系统 (Theme System)](#27-全局主题外观系统-theme-system)
  - [2.8 字体标签与智能分类系统架构设计 (Tagging & Classifier)](#28-字体标签与智能分类系统架构设计-tagging--classifier)
- [三、技术规范与工程标准](#三技术规范与工程标准)
  - [3.1 编码与类型安全规范](#31-编码与类型安全规范)
  - [3.2 字体数据安全与路径防护标准](#32-字体数据安全与路径防护标准)
  - [3.3 Git 提交规范 (Commit Standards)](#33-git-提交规范-commit-standards)
  - [3.4 本地敏感与动态数据隔离标准](#34-本地敏感与动态数据隔离标准)
- [四、常见问题排查手册与故障排解指南 (Troubleshooting & FAQ)](#四常见问题排查手册与故障排解指南-troubleshooting--faq)
  - [Q1: 首页字体搜索是单一条件还是聚合条件？](#q1-首页字体搜索是单一条件还是聚合条件)
  - [Q2: 全部字体统计显示几百款，为什么往下滚动只看到几十款？](#q2-全部字体统计显示几百款为什么往下滚动只看到几十款)
  - [Q3: 为什么部分中文字体名字显示为方块带问号（）或显示为 "pur"？](#q3-为什么部分中文字体名字显示为方块带问号或显示为-pur)
  - [Q4: 访问中文字体详情页报错 GET /api/fonts/%E9... 500 是什么原因？](#q4-访问中文字体详情页报错-get-apifontse9-500-是什么原因)
  - [Q5: 设置中点击“外观风格”切换深浅色模式没有反应？](#q5-设置中点击外观风格切换深浅色模式没有反应)
  - [Q6: 在局域网非 HTTPS 环境下一键复制文件相对路径失效？](#q6-在局域网非-https-环境下一键复制文件相对路径失效)
  - [Q7: Docker 容器启动后扫描不到字体或没有权限？](#q7-docker-容器启动后扫描不到字体或没有权限)
  - [Q8: 修改了字体元数据或新增字体后，界面如何立即生效？](#q8-修改了字体元数据或新增字体后界面如何立即生效)
  - [Q9: 字体标签是怎么来的？系统如何识别字体属于什么类型？](#q9-字体标签是怎么来的系统如何识别字体属于什么类型)
  - [Q10: 如何自定义新标签或修改某个字体的标签？](#q10-如何自定义新标签或修改某个字体的标签)
- [五、文档持续维护与演进规划](#五文档持续维护与演进规划)
  - [5.1 增补规范](#51-增补规范)
  - [5.2 规划中演进功能候选清单](#52-规划中演进功能候选清单)

---

## 一、系统架构总览与设计哲学

### 1.1 系统定位
**RunFonts** 是一款轻量级、开箱即用的私有化/自托管（Self-Hosted）字体管理与 Web 实时排版渲染系统。其设计哲学贯穿以下四项基本原则：
1. **零外部数据库依赖（No-DB Architecture）**：摒弃繁重的 PostgreSQL / MySQL 数据库，采用基于本地原子写入的结构化 JSON 文件持久化（`data/*.json`）。单容器即可完整启动，数据备份与跨机器迁移仅需复制文件夹。
2. **海量字体高性能吞吐**：针对 300+ 乃至数千款本地字体，具备毫秒级索引加载、增量去重扫描与流式 Web 字体渲染能力，确保页面不卡顿、浏览器内存不膨胀。
3. **底层二进制级字体解析**：不依赖操作系统的本地字体注册表，直接解析字体文件的 OpenType/TrueType 内部二进制表（SFNT 表头、`name` 表、`cmap` 表），提取真实准确的字体元数据。
4. **极致易用的人性化交互**：无缝多语言切换（i18n）、深浅主题切换、实时自定义预览文字与字号无级缩放、分类管理与自定义项目合集归档。

### 1.2 技术栈全景

| 分层 | 核心技术选型 | 作用与实现说明 |
| :--- | :--- | :--- |
| **前端框架** | React 18 + TypeScript | 组件化开发，强类型契约保障 |
| **构建与开发** | Vite 5 | 毫秒级热模块替换 (HMR) 与生产环境高效压缩打包 |
| **样式与交互** | Tailwind CSS + Radix UI (shadcn/ui) | 极速响应式样式定制与现代无障碍可访问交互组件 |
| **轻量路由** | Wouter | 极小体积的轻量客户端路由系统 |
| **服务端状态管理** | @tanstack/react-query v5 | 异步请求缓存、无限分页滚动游标（useInfiniteQuery）处理 |
| **国际化 (i18n)** | i18next + react-i18next | 多语言自动检测、即时动态热切换与本地持久化记忆 |
| **后端运行时** | Node.js (v20+) + Express | 轻量 RESTful API 服务与静态资源安全分发 |
| **字体底层解析** | fontkit + iconv-lite | 二进制 SFNT/OpenType 解析与全编码多字符集智能转码降级 |
| **数据持久化** | JsonStorage (drizzle-zod 模式) | 内存快速索引 + 本地 JSON 结构化数据原子持久化 |

### 1.3 工程目录结构规范

```text
RunFonts/
├── client/                     # 前端 React 单页应用源码
│   ├── src/
│   │   ├── components/         # 通用与业务组件 (Sidebar, FontCard, ui/*)
│   │   ├── hooks/              # 业务 Hooks (use-fonts.ts, use-collections.ts, use-toast.ts)
│   │   ├── i18n/               # 国际化多语言配置与字典 (zh-CN.json, en.json)
│   │   ├── lib/                # 基础网络与通用工具 (queryClient.ts, utils.ts)
│   │   ├── pages/              # 页面视图 (Home.tsx, FontDetail.tsx, Settings.tsx)
│   │   ├── App.tsx             # 根组件、路由定义、上下文注入 (Theme, QueryClient, i18n)
│   │   └── main.tsx            # 前端启动挂载入口
│   └── index.html
├── server/                     # 后端 Express 服务源码
│   ├── db.ts                   # 存储层门面与接口抽象绑定
│   ├── font-utils.ts           # 字体底层二进制提取、多编码打分、字符串清洗器
│   ├── index.ts                # HTTP 服务监听入口与异常捕获中间件
│   ├── routes.ts               # REST API 路由控制器
│   ├── scanner.ts              # 物理文件目录递归扫描引擎
│   ├── static.ts               # 生产环境前端构建产物静态分发
│   ├── storage.ts              # JsonStorage 数据持久化与搜索聚合实现
│   └── vite.ts                 # 本地开发模式下 Vite 开发服务器集成
├── shared/                     # 前后端共享类型定义
│   └── schema.ts               # Drizzle 实体模型定义与 Zod 校验 Schema
├── data/                       # 本地持久化数据目录 (已加入 .gitignore，不随代码提交)
├── fonts/                      # 默认字体存放目录 (已加入 .gitignore，不随代码提交)
├── README.md                   # 用户使用与部署说明文档
└── TECHNICAL.md                # 核心技术架构设计与规范标准手册 (本文档)
```

### 1.4 系统拓扑与端到端数据流

```text
+-------------------------------------------------------------------------+
|                              磁盘存储层                                 |
|   本地/挂载目录 (fonts/)                         持久化数据 (data/*.json) |
|   .ttf / .otf / .woff / .woff2 / .ttc             files, faces, favs    |
+-------------------------------------------------------------------------+
            │ (增量递归扫描)                                  ▲ (原子写操作)
            ▼                                                 │
+-------------------------------------------------------------------------+
|                             服务端引擎 (Node.js)                        |
|  [scanner.ts] ──► [font-utils.ts] (SFNT 二进制解析 + 多编码打分降级清洗) |
|         │                                                               |
|         ▼                                                               |
|  [storage.ts (JsonStorage)] ──► 内存索引建立、多字段模糊过滤、家族聚合   |
|         │                                                               |
|         ▼                                                               |
|  [routes.ts (Express API)]                                              |
|      - GET  /api/fonts           (支持 q, 分类, 收藏, 合集多维聚合搜索)  |
|      - GET  /api/fonts/:family   (字体家族详情与全部关联样式变体)        |
|      - GET  /fonts/:urlKey       (安全流式分发真实字体供 Web 预览)      |
|      - POST /api/rescan          (触发全库重扫与清洗重载)                |
+-------------------------------------------------------------------------+
            ▲
            │ (HTTP RESTful / JSON / 字体二进制流)
            ▼
+-------------------------------------------------------------------------+
|                             客户端层 (React 18)                         |
|  [useInfiniteFonts] (TanStack Query 触底无限分页加载)                   |
|  [Home.tsx]         (搜索过滤、全库统计、卡片文件名溯源、触底进度提示)   |
|  [FontDetail.tsx]   (实时可编辑排版、字号滑块、相对路径一键复制)         |
|  [Theme / i18n]     (Tailwind 深浅色切换 + 中英双语热切换)               |
+-------------------------------------------------------------------------+
```

---

## 二、核心技术模块设计与实现机制

### 2.1 字体扫描与元数据提取引擎 (Scanner Engine)
- **源码定位**：`server/scanner.ts`
- **核心能力**：
  1. **目录递归遍历**：深度递归扫描指定的一个或多个目录（支持分类动态关联），过滤支持 `.ttf`、`.otf`、`.woff`、`.woff2`、`.ttc` 格式。
  2. **增量跳过（Incremental Skip）机制**：在提取文件前，快速计算文件的 `sha1` 哈希值和 `mtimeMs`（最后修改时间戳）。对已存在且哈希与修改时间未变更的文件直接跳过深度解析，大幅降低重复扫描时的 CPU 开销。
  3. **TTC（TrueType Collection）解包**：`.ttc` 属于字体合集文件，单个文件中封装了多套字形数据。引擎通过 `fontkit.openSync` 读取其 `fonts` 集合数组，分别遍历提取每个独立字形的家族名、字重、子样式，生成多条独立的 `FontFace` 记录，确保合集文件中的每一款字体均能被独立展示与检索。
  4. **虚拟访问键（urlKey）安全隔离**：为每个入库的字体实体文件生成安全随机 UUID 形式的 `urlKey`。前端 Web 字体加载统一通过 `/fonts/:urlKey` 路由请求，完全屏蔽操作系统物理真实路径，彻底杜绝目录遍历攻击隐患。

### 2.2 二进制编码清洗与智能降级解码机制 (Smart Encoding Fallback)
- **源码定位**：`server/font-utils.ts`、`server/storage.ts`
- **历史背景与乱码痛点**：
  大量历史中文字体（如 90 年代至 2000 年代初制作的字库）在 OpenType `name` 表声明时存在严重的规范偏离：
  - Windows 平台（Platform 3）中 Encoding ID 声明为 1（Unicode），底层字节流实际为 GBK；
  - 早期 Winman 等制作工具存在历史 Bug，在 Big5 繁体编码的每一个有效字节前错误填充了一个 `0x00` 空字节（例如 `0x00 0xB6 0x00 0xEC`）；
  - Macintosh 平台（Platform 1）中使用了非标准的 Big5（Encoding 2）或 GB2312（Encoding 25）；
  - 现代主流解析库（如 `fontkit`）在遇到非规范编码时，会直接抛出或将其强制解码为 Unicode 替换字符 `\uFFFD`（表现为黑色菱形/方块带问号 ），或者产生特定的残损标识 `pur`。
- **技术解决方案**：
  在 `server/font-utils.ts` 中实现了**底层二进制 name 表直接解析与智能加权打分算法**：
  1. **SFNT 二进制表偏移直读**：通过 Buffer 偏移直接定位 OpenType 的 `name` 表与子表，完整提取每一个 `NameRecord` 的 Platform ID、Encoding ID、Language ID 及原始字节流 Buffer。
  2. **候选结果加权评分模型（Scoring Engine）**：
     - **Windows Unicode (UTF-16BE)**：标准格式，成功解析出 CJK 字符赋予 180 ~ 200 分最高权重；
     - **Winman 历史 Bug 修复**：检测 `0x00` 填充规律，剔除填充字节后使用 `iconv-lite` 按 `big5` 解码，赋予 170 分高权重；
     - **Macintosh Big5 (Encoding 2) 与 GB2312 (Encoding 25)**：按 `big5` / `gbk` 解码，赋予 140 分；
     - **Windows PRC (Encoding 3)**：尝试 UTF-16BE 与 GBK 双向尝试，赋予 130 ~ 135 分；
     - **Macintosh Roman (Encoding 0)**：降级兜底，赋予 80 分。
  3. **脏字符深度清洗器 (`cleanFontString` & `isCorruptedFontString`)**：
     - 正则剔除 ASCII 控制字符（`\x00-\x1F`）、删除符（`\x7F`）以及 Unicode 替换字符（`\uFFFD`）；
     - 检测无效损坏标识（如纯空白字符、残余问号串、特殊脏词 `pur`）。
  4. **物理文件名终极兜底（Ultimate Fallback）**：
     若经过多级多编码解码后，字符依然命中损坏判定，系统自动回退采用物理字体文件的原始名称（去除后缀名）作为字体家族名，**确保系统绝不呈现方块问号乱码或脏词**。

### 2.3 首页字体搜索与多维聚合过滤机制 (Search & Aggregation Engine)
- **源码定位**：`server/storage.ts` (`searchFonts`)、`client/src/pages/Home.tsx`
- **机制剖析**：
  首页搜索是一个**双层聚合（复合条件）检索系统**：
  1. **关键词层面（OR 模糊匹配聚合）**：
     用户在顶部搜索框输入的任意关键词 `q`（统一转小写去除空格），后端会**同时在 3 个核心字段中模糊检索**（命中任一项即视为匹配）：
     ```typescript
     // server/storage.ts
     if (params.q) {
       const q = String(params.q).toLowerCase().trim();
       results = results.filter(r => 
         (r.face?.family && r.face.family.toLowerCase().includes(q)) || 
         (r.face?.subfamily && r.face.subfamily.toLowerCase().includes(q)) || 
         (r.file?.filename && r.file.filename.toLowerCase().includes(q))
       );
     }
     ```
     - 搜索家族名（如 `PingFang`、`落伍体`）立即命中；
     - 搜索样式名（如 `Bold`、`Italic`）立即命中；
     - 搜索文件物理名称（如 `黄引齐落伍体.TTF`、`.ttc`）立即命中。
  2. **业务环境层面（AND 上下文聚合过滤）**：
     关键词检索必须与当前用户所处的视图环境进行**严格交集（AND）过滤**：
     - `categoryId`：在某个分类视图下，只在当前分类目录中检索；
     - `favorites`：在“我的收藏”视图下，只在已收藏的字体中检索；
     - `collectionId`：在特定项目合集视图下，只在该合集关联的字体中检索。
  3. **细粒度初筛与家族归组（Group By Family）**：
     初筛在最细粒度的 `FontFace`（单个变体）及关联的 `FontFile` 上执行；初筛完成后，系统使用内存 `Map` 按照字体家族名称聚合合并，形成包含所有匹配样式的字体家族卡片列表。

### 2.4 海量字体分页与触底无限滚动机制 (Infinite Scroll)
- **源码定位**：`client/src/pages/Home.tsx`、`client/src/hooks/use-fonts.ts`
- **性能挑战与瓶颈**：
  当字体库拥有 300+ 乃至上千款字体时，若一次性全量把所有字体注入页面 DOM：
  1. 浏览器需要同时下载并解析数百个庞大的字体文件（中文字体单个通常在 5MB ~ 30MB）；
  2. 浏览器内存消耗瞬间飙升至数 GB，导致页面严重掉帧、滚动白屏甚至标签页崩溃。
- **技术解决方案**：
  1. **游标式无限分页（Infinite Query）**：前端接入 `@tanstack/react-query` 的 `useInfiniteQuery`，默认单页步长 `pageSize = 50`。
  2. **视口触底侦测（IntersectionObserver）**：在列表底部设置不可见锚点元素 `loadMoreRef`，配置 `rootMargin: "300px"` 提前触发预加载：
     ```typescript
     const observer = new IntersectionObserver((entries) => {
       if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
         fetchNextPage();
       }
     }, { rootMargin: "300px", threshold: 0.1 });
     ```
  3. **加载进度可视化**：在页面底部实时展示当前已加载数量与全库统计总数（如“正在载入更多字体... (已载入 100 / 共 331 款)”），当全部拉取完毕后明确提示“已展示全部 331 款字体”。

### 2.5 物理文件溯源与详情展示体系 (Traceability & Details)
- **源码定位**：`client/src/components/FontCard.tsx`、`client/src/pages/FontDetail.tsx`
- **技术实现**：
  1. **首页卡片物理文件标注**：在每个字体卡片右下角展示对应的实体文件名称（等宽字体风格）。当一个家族由多个独立文件组成时，鼠标悬停 Tooltip 会完整列出该家族包含的所有文件名。
  2. **详情页相对路径追溯**：
     - **单文件家族**：展示字体文件名称与相对路径（如 `卡通字体/黄引齐落伍体.TTF`），支持独立一键复制。
     - **多文件家族**：聚合去重所有关联的变体文件，以卡片列表形式分别展示每个文件的名称及相对路径，支持分别复制。
  3. **跨网络环境剪贴板复制兼容性方案**：
     现代浏览器对 `navigator.clipboard` 施加了安全限制（仅在 HTTPS 或 localhost 下可用）。若用户在局域网内通过 HTTP IP 访问，直接调用会报错抛出异常。
     为此实现了标准降级复制机制：
     ```typescript
     export function copyToClipboard(text: string, successMessage: string) {
       if (navigator.clipboard && window.isSecureContext) {
         navigator.clipboard.writeText(text).then(() => {
           toast({ title: successMessage });
         }).catch(() => fallbackCopy(text, successMessage));
       } else {
         fallbackCopy(text, successMessage);
       }
     }

     function fallbackCopy(text: string, successMessage: string) {
       const textArea = document.createElement("textarea");
       textArea.value = text;
       textArea.style.position = "fixed";
       textArea.style.opacity = "0";
       document.body.appendChild(textArea);
       textArea.focus();
       textArea.select();
       try {
         document.execCommand('copy');
         toast({ title: successMessage });
       } catch (err) {
         toast({ title: "复制失败，请手动选中复制", variant: "destructive" });
       } finally {
         document.body.removeChild(textArea);
       }
     }
     ```

### 2.6 多语言国际化系统设计 (i18n Architecture)
- **源码定位**：`client/src/i18n/index.ts`、`client/src/i18n/locales/*`、`client/src/components/LanguageSwitcher.tsx`
- **技术要点**：
  1. 采用 `i18next` 框架，配置 `LanguageDetector` 优先读取用户在浏览器的首选语言，并在用户手动切换后写入 `localStorage.getItem('runfonts_language')` 保持长久记忆。
  2. 提供紧凑型 Icon 切换按钮与下拉选择器，实现全界面所有文本（侧边栏、搜索框提示语、详情页元数据、Toast 弹窗）毫秒级无刷新更新。

### 2.7 全局主题外观系统 (Theme System)
- **源码定位**：`client/src/components/ThemeProvider.tsx`、`client/src/components/ThemeSwitcher.tsx`
- **技术要点**：
  1. 依托 Tailwind CSS 的 `darkMode: 'class'` 策略。
  2. 提供 `ThemeContext` 统一管控 `'light' | 'dark' | 'system'` 状态。
  3. 当主题变更时，严格同步操作 `document.documentElement.classList.toggle('dark', isDark)`，并将首选项存入 `localStorage`，根治由于组件脱节导致的主题切换无响应问题。

### 2.8 字体标签与智能分类系统架构设计 (Tagging & Classifier)
- **源码定位**：
  - 类型契约层：`shared/schema.ts`（`tags`、`font_tags`、`FontTagWithDetails`）
  - 智能规则引擎：`server/classifier.ts`
  - 数据存储检索层：`server/storage.ts`（`data/tags.json`、`data/font_tags.json`）
  - RESTful 控制器：`server/routes.ts`
  - 客户端状态与视图：`client/src/hooks/use-tags.ts`、`client/src/lib/tag-styles.ts`、`client/src/components/Sidebar.tsx`、`client/src/pages/Home.tsx`、`client/src/pages/FontDetail.tsx`、`client/src/components/FontCard.tsx`
- **分阶段实施架构**：
  1. **Phase 1（规则引擎驱动 + 详情页打标交互）**：
     - **预设 13 种核心特征分类规则**：涵盖黑体 (Sans)、宋体 (Serif)、楷体 (KaiTi)、圆体 (Rounded)、书法手写 (Calligraphy)、卡通可爱 (Cartoon)、艺术海报 (Display)、等宽字体 (Monospace)、可变字体 (Variable)、斜体 (Italic)、多字重家族 (Multi-Weight)、中文 (Chinese)、西文 (Latin)。
     - **多维特征识别输入**：深度提取字体家族名（`family`）、字重样式（`subfamily`）、物理文件名（`filename`）、文件相对路径（`relPath`，提取上层目录语义，如 `卡通字体合集/`）、变体数、字重跨度及 OpenType 格式属性。
     - **详情页交互**：清晰展示已绑定的标签列表，标识标签来源（`rule` 规则匹配、`manual` 手工添加、`ai` 智能识别）；支持系统预设推荐标签一键点选关联、自定义新标签即时添加、已绑定标签一键删除。
     - **一键重新识别**：详情页提供“重新识别”动作，支持单独重跑规则分类。
  2. **Phase 2（全链路搜索与导航联动）**：
     - **左侧边栏标签分类导航**：动态统计每个标签下的字体数量，支持一键切换进入 `/tags/:id` 路由视图，支持展开/折叠更多标签。
     - **首页顶部快捷胶囊筛选栏**：横向滚动展示高频标签胶囊按钮与数字角标，点击即刻联动主视图过滤，支持“全部”快速清除。
     - **字体卡片标签徽章**：在首页字体卡片标题下方展示彩色 Tag Badge，并在卡片悬浮/点击时支持一键按此标签过滤。
     - **`#标签` 复合检索语法**：在主搜索框中输入 `#黑体` 可快速精准匹配拥有“黑体”标签的字体；同时支持普通关键字匹配家族名、文件名或标签名。
  3. **Phase 3（AI 视觉多模态风格分析与大模型集成落地）**：
     - **系统设置可视化配置面板**：在系统设置（Settings）页面新增“AI 智能分析配置”模块，提供一键启用/禁用开关、服务商快捷预设（DeepSeek、OpenAI、通义千问 DashScope、月之暗面 Moonshot/Kimi、本地 Ollama 及自定义服务商）、Base URL、API Key（支持显隐切换）以及 Model 名称配置。
     - **连通性探测接口 (`POST /api/settings/ai/test`)**：前端点击“测试连通性”时，向服务端发送探测请求，服务端对配置的模型端点发送极简测试心跳并计算真实响应延迟（ms），前端即时呈现连通成功或友好错误原因（如 Key 无效、网络不可达、超时等），避免盲目配置。
     - **配置持久化与环境安全降级**：配置保存至本地 `data/settings.json`（已被 `.gitignore` 隔离安全保护）；若未保存配置，自动回退读取宿主环境变量（`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`AI_MODEL`）。
     - **大模型排版风格分析引擎 (`POST /api/fonts/:family/ai-tag`)**：
       - 智能组装 Prompt：包含字体家族名、变体字重列表、物理文件名以及所在相对目录语义；
       - 结构化多维度 Prompt 引导：输出双层分类模型（正式分类 tags + 用户确认候选 suggestions），并附带简短分析理由；
     - **全链路高可用降级矩阵**：若 AI 未启用、未配置 Key、网络断开、超时（20s）或响应格式异常，系统百分之百自动降级为规则引擎分析（`storage.autoTagFonts`)，返回 `status: "fallback_rule"` 并清晰告知用户降级原因，保障生产不中断。
      - **双层分类模型与 Prompt 契约**：
        - `tags`：3~4 个核心正式分类，必须包含至少 1 个基础字形门类（黑体、宋体、楷体、仿宋、圆体、书法手写、等宽字体 等中选择最匹配项）与 2~3 个主视觉风格/应用场景；标签长度严格在 2~6 个汉字；系统自动为字体创建并绑定这些正式分类。
        - `suggestions`：5~8 个基于该字体特征的延伸候选分类（如“咖啡餐饮”、“包装设计”、“儿童绘本”、“手账日记”）；它们不会自动入库，而是用于替换详情页静态推荐标签，供用户逐个确认加入。
      - **鲁棒 JSON 提取器**：内置 Markdown 代码块与正则表达式容错解析，确保各种大模型格式均能稳定解析。
      - **自动入库与候选持久化**：解析成功后自动将 `tags` 创建/匹配至系统标签库并打标（`source: "ai"`）；`suggestions` 会写入 `data/ai_suggestions.json`，并通过字体详情接口的 `font.aiMeta.suggestions` 返回。
      - **动态候选展示规则**：
        1. 有 AI 候选时，“AI 专属灵感候选”优先展示在推荐区域，点击后加入正式分类；已加入的候选自动从待选列表移除。
        2. 全部候选加入后显示“AI 专属推荐分类已全部添加”。
        3. 有 AI 候选时，通用基础分类默认收起，可通过“查看通用基础分类”手动展开。
        4. 无 AI 候选时继续展示系统通用基础分类，并提示用户先执行“AI智能分析”。
- **持久化与迁移安全性**：
  - 标签实体存储在 `data/tags.json`，字体关联存储在 `data/font_tags.json`。
  - 数据文件与 `data/` 一道纳入 `.gitignore`，隔离在用户本地环境，支持 Docker 目录持久化挂载，重启不丢失自定义打标数据。

---

## 三、技术规范与工程标准

### 3.1 编码与类型安全规范
1. **TypeScript 全量类型覆盖**：所有组件 Props、Hook 返回值、API 响应必须声明精确类型，严禁使用裸 `any` 破坏类型链。
2. **防空保护（Defensive Programming）**：针对历史老旧字体中经常缺失的字段（如 `subfamily` 为空、`postscriptName` 为 `null`、`urlKey` 缺失），使用可选链 `?.` 与空值合并操作符 `??` 提供安全兜底，避免渲染或过滤阶段出现 `Cannot read properties of undefined`。
3. **国际化硬编码禁止**：所有新增的前端界面文字、按钮、表单占位符与 Toast 提示，必须在 `zh-CN.json` 和 `en.json` 中同步配置词条，严禁在 JSX 中硬编码中英文字符串。

### 3.2 字体数据安全与路径防护标准
1. **禁止物理路径外泄**：向前端返回的字体对象，必须将物理真实路径（`fullPath`）与相对路径（`relPath`）区隔，字体加载必须且只能使用抽象生成的 `urlKey`。
2. **路径穿越防御**：所有读取、删除或扫描目录的 API（如 `/api/browse`），必须使用 `path.resolve` 校验解析，并防止用户通过 `../` 等恶意输入访问系统受限目录。

### 3.3 Git 提交规范 (Commit Standards)
代码提交统一采用中文语义化作用域前缀，结构清晰、意图明确：
- `[前端] <动宾描述>`：前端页面、组件、样式、Hooks 相关的调整。
- `[后端] <动宾描述>`：Node.js 服务端、API 路由、存储层、扫描与解码模块调整。
- `[全局] <动宾描述>`：多语言、主题、工程构建配置、根配置文件调整。
- `[文档] <动宾描述>`：README、技术文档 TECHNICAL.md、部署文档编写与增补。

### 3.4 本地敏感与动态数据隔离标准
1. **.gitignore 强制隔离**：
   - `data/`：本地持久化生成的结构化 JSON 数据库文件，严禁提交到公共仓库，防止个人分类、合集数据被覆盖。
   - `fonts/`：本地存放的商用或私人字体文件，体积庞大且包含版权风险，严禁提交到代码仓库。
2. **迁移与备份规范**：
   - 生产部署迁移时，只需打包备份 `data` 和 `fonts` 两个文件夹即可实现完整的数据迁移与无缝恢复。

---

## 四、常见问题排查手册与故障排解指南 (Troubleshooting & FAQ)

### Q1: 首页字体搜索是单一条件还是聚合条件？
**答**：是**双层聚合（复合条件）搜索**：
1. **关键词层面（OR 关系）**：在顶部搜索框输入文字时，后端同时在 `face.family`（家族名）、`face.subfamily`（字重/样式）、`file.filename`（物理文件名）3 个字段中进行不区分大小写模糊匹配，只要任意一项命中即视为匹配。
2. **上下文环境层面（AND 关系）**：搜索关键词会与当前所在的上下文视图（如分类 `categoryId`、收藏夹 `favorites`、合集 `collectionId`）进行交集（AND）组合过滤。

---

### Q2: 全部字体统计显示几百款，为什么往下滚动只看到几十款？
**答**：这是**分页机制与无限滚动机制的正常行为**：
- **原因**：前端采用了无限滚动分页加载（默认步长为 50 款/页），避免一次性把几百个字体全部拉入 DOM 导致浏览器内存被大量字体撑爆卡顿。
- **排查点**：
  1. 确保鼠标在页面主区域向下滑动，触发底部的 `IntersectionObserver` 视口侦测；
  2. 检查网络面板是否正常发出 `/api/fonts?page=2&pageSize=50` 的下一页请求；
  3. 查看底部是否展示“正在载入更多字体...”进度条，直至达到总数提示“已展示全部款字体”。

---

### Q3: 为什么部分中文字体名字显示为方块带问号（）或显示为 "pur"？
**答**：
- **原因**：部分老旧字体（特别是在 Windows 95/98/XP 时代或特殊排版软件导出的字体）内部 OpenType `name` 表未使用标准 Unicode 格式，而是使用了 Windows PRC GBK、Macintosh Big5、或者每个字节前带 `0x00` 填充的非常规编码，标准解析库（如 fontkit）在遇到无法识别的字节时会解析为 Unicode 替换字符 `\uFFFD`（黑色方块问号）或特定的乱码标识 `pur`。
- **处理方式**：
  1. 项目在 `server/font-utils.ts` 中内置了底层二进制多编码加权解码器，可自动解析 GBK、Big5、UTF-16BE 字符集并还原正确中文字体名；
  2. `server/storage.ts` 的加载层和清洗层均做了自动兜底，遇到 `pur` 或损坏编码会自动退回使用真实的物理文件名展示；
  3. **解决操作**：点击页面右上角“刷新重新扫描”按钮（Rescan），系统将以最新清洗规则重新扫描并修复。

---

### Q4: 访问中文字体详情页报错 GET /api/fonts/%E9... 500 是什么原因？
**答**：
- **原因**：在较早版本的实现中，路由参数中的中文字符被浏览器进行了 URL 编码（如 `%E9%99%88...`），而后端在根据家族名查询字体信息时，若遇到个别变体对象关联的文件字段为空或属性为 `undefined` 时，未做防空安全校验，直接访问属性导致抛出 500 异常。
- **修复方案**：
  在 `server/storage.ts` 中加强了查询防御机制，对 `family` 参数统一解码，并在映射变体时增加 `.filter(r => r.file)` 过滤无效引用，彻底防止空指针报错。

---

### Q5: 设置中点击“外观风格”切换深浅色模式没有反应？
**答**：
- **原因**：此前主题组件仅修改了局部 React State，没有将 `dark` 类名同步注入到 HTML 根元素（`<html class="dark">`）中，且未对用户的选择做本地持久化，导致刷新页面后恢复默认深色。
- **修复方案**：
  重构并完善了 `ThemeProvider.tsx`，通过 `useTheme` Hook 与 DOM 根节点动态绑定，并在 `localStorage` 中同步存储用户首选模式。

---

### Q6: 在局域网非 HTTPS 环境下一键复制文件相对路径失效？
**答**：
- **原因**：现代浏览器出于安全策略，仅在 `https://` 协议或 `localhost`（环回地址）下开放 `navigator.clipboard` 接口。在内网通过普通 HTTP IP（如 `http://192.168.x.x:5000`）访问时，该 API 会被浏览器禁用并直接抛出异常。
- **修复方案**：
  在 `FontDetail.tsx` 中封装了双重兼容的 `copyToClipboard` 方法，当 `navigator.clipboard` 不可用时，无缝降级采用底层的临时 `textarea` + `document.execCommand('copy')` 方案，确保任何网络环境均能复制成功。

---

### Q7: Docker 容器启动后扫描不到字体或没有权限？
**答**：
- **排查步骤**：
  1. **挂载卷路径核对**：检查 `docker run` 命令中的挂载参数，确保宿主机字体目录正确挂载至容器内的 `/app/fonts`（例如 `-v /your/host/fonts:/app/fonts`）；
  2. **文件读取权限**：确保宿主机字体文件夹对容器内的运行用户具有可读权限（建议 `chmod -R 755 /your/host/fonts`）；
  3. **手动触发重扫**：进入 Web 界面，点击右上角重新扫描按钮，或向服务端发送 `POST /api/rescan` 触发全量遍历。

---

### Q8: 修改了字体元数据或新增字体后，界面如何立即生效？
**答**：
- **操作方式**：
  1. **前端一键触发**：直接在 Web 页面顶部点击带有刷新图标的按钮（Rescan），系统将在后台启动全量异步增量扫描，扫描完成后自动触发 `storage.reload()` 更新内存索引；
  2. **API 触发**：向服务端发送 `POST /api/rescan` 接口即可。

---

### Q9: 字体标签是怎么来的？系统如何识别字体属于什么类型？
**答**：
- **双轨结合机制**：
  1. **自动化规则分类引擎**（冷启动阶段）：新导入字体在扫描时，服务端 `server/classifier.ts` 会结合字体的物理路径名（如父目录 `卡通字体合集`）、文件名、字体家族名、字重/斜体/可变字体特征进行智能规则匹配，自动生成对应的系统标签；
  2. **用户手动打标与微调**（个性化阶段）：在字体详情页面，用户可以根据个人审美，从推荐预设中点选，或在输入框中输入自定义标签名（如“电商标题”、“国风”、“复古”），系统会即时绑定并持久化保存。

---

### Q10: 如何自定义新标签或修改某个字体的标签？
**答**：
- **操作步骤**：
  1. 点击任意字体卡片进入“字体详情页”；
  2. 在右侧或下方的“分类与标签”面板中，可以直接点击现有标签旁的“×”图标进行删除/解绑；
  3. 点击“推荐标签”区域中的彩色徽章可快速添加对应标签；
  4. 在“输入标签名称...”文本框中输入任意自定义标签后按回车或点击“添加”，即可完成自定义打标；
  5. 若自动规则识别有遗漏或修改了分类规则，点击“重新识别”按钮可一键执行规则库重新计算。
---

### Q12: AI 智能分析的系统提示词 (System Prompt) 可以自定义配置吗？
**答**：
完全可以！系统提示词已全面升级为可视化自由配置：
1. **配置位置**：进入「系统设置」->「AI 智能分析配置」面板，在 API Key 下方即可看到「**AI 系统提示词 (System Prompt)**」多行编辑框；
2. **默认提示词**：系统开箱预置了专为字体排版艺术定制的 System Prompt，实行双层分类契约：
   - `tags` 自动入库（精选 3~4 个核心分类，必须包含至少 1 个【基础字形门类】：黑体、宋体、楷体、仿宋、圆体、书法手写、等宽字体 等 + 2~3 项主视觉风格/应用场景）；
   - `suggestions` 输出 5~8 个精准细分标签，用于替换详情页下方的推荐候选供用户按需挑选加入；
   - 每个标签长度规范在 2 到 6 个汉字，不带 `#` 前缀；
   - 默认完整 Prompt 如下：
```text
你是一位精通视觉艺术、平面设计和中英文字体排版的资深字体专家。
你的任务是根据字体的名称、字重家族、物理文件路径等特征，全面分析其视觉风格与应用场景。

请输出两类分类标签：

1. 【核心正式分类】(tags，精选 3 到 4 个最核心分类，将自动添加为该字体的正式分类)：
   - 必须包含至少 1 个【基础字形门类】：从 黑体、宋体、楷体、仿宋、圆体、书法手写、等宽字体 等中选择最匹配的项；
   - 提炼 2 到 3 个最契合的【主视觉风格与应用场景】（例如：现代极简、复古国风、商务办公、二次元可爱、电商海报、大标题字 等）。
2. 【延伸推荐候选】(suggestions，提炼 5 到 8 个精准细分标签，将替换界面下方的推荐标签供用户点击挑选)：
   - 深入挖掘该字体其他潜在的细分风格、调性氛围、行业领域与排版搭配（例如：文创周边、日式和风、文艺清新、影视字幕、游戏UI、包装设计、儿童绘本、硬朗工业、潮流街头、封面排版、诗意随性 等）。

严格返回规则：

1. 必须输出合法 JSON 对象，格式如下，禁止输出任何 Markdown 格式或额外说明文字：
   {
   "tags": ["基础字形门类", "核心风格1", "核心场景2"],
   "suggestions": ["细分候选1", "细分候选2", "细分场景3", "细分场景4", "排版搭配5"],
   "reason": "30字以内的设计分析理由"
   }
2. 每个标签长度在 2 到 6 个汉字，不要加 # 符号。
```
3. **自由定制**：用户可根据特定需求补充自己独有的标签类别、风格偏好或排版规则；
4. **一键恢复**：文本框右上角提供了“**恢复默认提示词**”快捷按钮，若修改后想还原，一键即可重置为官方预设标准；
5. **持久化保障**：提示词与 AI 开关、API Key 一道持久化保存至 `data/settings.json`，重启服务或容器持久挂载均永久生效。

---

### Q11: AI 智能分析配置在哪里？如何配置 DeepSeek、通义千问、OpenAI 或本地 Ollama？
**答**：
- **操作指引**：
  1. 点击左侧边栏底部的“**系统设置 (Settings)**”图标进入设置界面；
  2. 找到“**AI 智能分析配置**”卡片，打开“**启用 AI 智能分析**”开关；
  3. 在“**服务商预设**”下拉菜单中选择您使用的服务商（系统会自动填充推荐的 Base URL 与 Model 名称）：
     - **DeepSeek**（高性价比且对中文排版理解极佳）：自动填入 `https://api.deepseek.com` 与 `deepseek-chat`；
     - **OpenAI**：自动填入 `https://api.openai.com/v1` 与 `gpt-4o-mini`；
     - **通义千问 (DashScope)**：自动填入 `https://dashscope.aliyuncs.com/compatible-mode/v1` 与 `qwen-plus`；
     - **月之暗面 (Moonshot / Kimi)**：自动填入 `https://api.moonshot.cn/v1` 与 `moonshot-v1-8k`；
     - **Ollama (本地私有化部署)**：自动填入 `http://localhost:11434/v1` 与 `qwen2.5:7b`（本地 Ollama 无需输入 Key）；
     - **自定义**：可自由填写任何兼容 OpenAI 接口标准的 API 代理或服务。
  4. 在“**API 密钥 (API Key)**”框中输入您的 Key，点击“**测试连通性**”按钮；
  5. 探测通过后（显示绿色提示与网络延迟），点击“**保存配置**”即可完成；
  6. 进入任意字体详情页，点击“**AI 智能分析**”按钮，系统将直接调用大模型进行风格特征归类与专业标签生成。


---

### Q13: 字体详情页收藏按钮点击后颜色状态未变，且已收藏字体进入详情页显示为空白按钮？
**答**：
- **故障现象**：
  1. 在字体详情页面点击“收藏”按钮，虽然弹出“已更新收藏状态”的通知，但按钮上的爱心依然是空白描边，颜色状态没有改变；
  2. 在首页已经点击过收藏的字体，点击卡片进入详情页后，顶部仍然显示空白未收藏的“收藏”按钮。
- **根因分析**：
  1. **后端详情接口缺失状态组装**：在 `server/storage.ts` 的 `getFontFamily(family)` 方法中，返回的对象为 `{ family, faces, collections, tags, aiMeta }`，未将内存与本地 JSON 中存储的 `favorites` 数据进行关联，导致 `GET /api/fonts/:family` 接口返回的 `isFavorite` 始终为 `undefined`；
  2. **前端缓存未能毫秒级响应**：`useToggleFavorite` 仅做了列表查询失效，未即时调用 `queryClient.setQueryData` 更新当前字体详情缓存；
  3. **UI 视觉反馈不醒目**：原爱心仅使用 `fill-current`，在普通 Outline 按钮下填充的是文字前景色（深灰或浅灰），没有如用户所期望的代表心动的鲜明色彩（玫瑰红/红色高亮）。
- **解决方案**：
  1. **完善数据仓储**：在 `server/storage.ts` 的 `getFontFamily` 中补充收藏判断：
     ```typescript
     const isFavorite = this.favorites.some(
       f => f.targetType === 'family' && f.targetId === family
     );
     return { family, faces, collections, tags, aiMeta, isFavorite };
     ```
  2. **毫秒级缓存响应**：在 `client/src/hooks/use-fonts.ts` 的 `useToggleFavorite` 中，`onSuccess` 立即对 `["/api/fonts", "detail", family]` 写入最新状态并失效相关查询；
  3. **视觉设计升级**：在 `FontDetail.tsx` 与 `FontCard.tsx` 中，统一采用醒目的玫瑰红色调：
     - 已收藏状态：心形图标填充 `fill-rose-500 text-rose-500 scale-110`，按钮伴随 `border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400` 的温润浅色背景；
     - 未收藏状态：保持优雅的柔和描边，点击即可瞬时切换。

---

### Q14: 首页标签栏置顶双行滑动与统计标题固钉（Sticky/Fixed）布局架构
**答**：
- **设计需求**：
  1. **标签栏置顶**：将首页标签筛选胶囊从内容流内部移至搜索栏正下方（Header 下第一顺位），与全局检索形成更自然的自上而下“全局检索 -> 维度筛选 -> 结果浏览”漏斗交互；
  2. **双行网格与横向滑动**：标签胶囊排列改为两行（Two-row Grid）紧凑展示；标签数量较少时自适应展示，当标签数量较多超出屏幕宽度时，自动启用优雅的横向滚动条，并支持鼠标滚轮横向滑动（Wheel-to-horizontal-scroll）；
  3. **标题与统计栏固钉 (Fixed/Sticky)**：标题与“共找到 xx 款字体家族...”统计栏固定在顶部，不再随字体卡片瀑布流下滑而消失，让用户随时掌握当前筛选范围下的字体总量。
- **技术实现核心**：
  1. **Flex 垂直流分层解耦**：在 `client/src/pages/Home.tsx` 中将主区域重构为三个互不干扰的层级：
     - Layer 1 (Header): 顶部搜索与全局工具栏 (高度固定 h-16, shrink-0, z-20)；
     - Layer 2 (Fixed Bar): 置顶固钉区，集成双行标签滑动条与统计信息栏 (shrink-0, border-b, backdrop-blur-sm, z-10)；
     - Layer 3 (Scrollable Content): 独立纵向滚动区 (flex-1, overflow-y-auto)，承载字体卡片网格与无限滚动探测器，滚动时上层内容完全纹丝不动。
  2. **CSS Grid 双行横向流**：使用 `grid-rows-2 grid-flow-col auto-cols-max`，让胶囊先从上至下填满 2 行，随后沿横向平铺递增，兼顾了页面垂直空间的节省与标签的浏览密度。
  3. **鼠标滚轮横向映射**：监听容器 `onWheel` 事件，在垂直 deltaY 滚动且存在横向可滚溢出时，平滑折算为 `scrollLeft` 偏移，大幅提升桌面端鼠标滚轮浏览体验。

---

### Q15: 标签多选筛选（交集模式 / AND）与 URL 状态持久化架构
**答**：
- **设计需求**：
  1. **多选标签实时交集过滤（AND / 同时满足）**：用户在首页快速标签栏中可以点击多个标签进行组合筛选，仅展示**同时具备所有已选标签**的字体家族（例如同时勾选“中文”与“黑体”，只展示既是中文且属于黑体的 2 款字体）；
  2. **URL 状态双向同步与持久化**：多选标签状态实时写入当前 URL 的 Query 参数（如 `/?tags=id1,id2`），支持浏览器无损刷新、前进/后退历史导航，以及将过滤结果直接复制链接分享给其他协作者；
  3. **交互反馈与清晰闭环**：
     - 已选中的标签胶囊呈现高亮主色背景并带有醒目的 `✕` 取消图标；
     - 标题区动态拼接多选标签名称（如 `黑体 + 中文 共找到 2 款字体家族`），并附带 `[已选 2 个标签 (同时满足)]` 明确提示；
     - 提供一键 `[清空标签]` 快捷按钮，且左侧边栏的对应标签高亮状态保持同步。
- **技术实现核心**：
  1. **服务端集合交集算法 (`server/storage.ts`)**：
     - `searchFonts` 接收 `tagIds: string[]`（向下兼容单个 `tagId` 参数）；
     - 遍历目标标签 ID 列表，针对每个标签提取其绑定的所有字体家族名集合 (`Set<string>`)；
     - 循环执行 `intersectionFamilies` 集合缩减运算，提取出各标签集合的纯数学交集，利用 `forEach` 规避 TypeScript 下 ES5 target 迭代器兼容性限制；
     - 最终将结果集限定在 `intersectionFamilies` 内，保证了 O(N) 级别的高性能与绝对交集正确性；
  2. **API 路由智能参数解析 (`server/routes.ts`)**：
     - 支持逗号分隔字符串 `?tags=id1,id2` 或数组参数 `tagIds`，自动规整与过滤无效值；
  3. **前端状态控制与 Query 驱动 (`client/src/pages/Home.tsx`)**：
     - 借助 `wouter` 的 `useSearch()` 监听 URL 查询参数变化；
     - 点击标签胶囊时执行 Toggle 逻辑：若已选中则移除，未选中则追加；
     - 标签全部清空时自动还原根路径，刷新和回退历史无需重新查询。

### Q16: 侧边栏“全部字体”与“我的收藏”实时统计徽标架构设计
**答**：
- **设计需求**：
  1. **全局统一的视觉与对齐规范**：与侧边栏“合集分组”（`col.count`）、“字体目录”（`cat.count`）及“标签分类”（`tag.count`）保持一致，“全部字体”和“我的收藏”尾部也展示对应的数量徽标（如 `全部字体 331`、`我的收藏 2`）；
  2. **高频操作毫秒级响应**：在字体卡片或详情页中进行收藏/取消收藏、新增字体文件夹重新扫描时，侧边栏数字徽标必须无感实时同步，不可出现页面滞后或必须手动刷新才更新的问题；
  3. **排版与激活态视觉统一**：采用 `tabular-nums font-mono` 保证数字切换时不引起布局抖动；激活态自动切换为主色调半透明背景高亮 (`bg-primary/20 text-primary font-semibold`)，未激活态保持精致淡雅的弱化风格 (`bg-muted text-muted-foreground`)。
- **技术实现核心**：
  1. **聚合统计 API (`/api/stats` 与 `server/storage.ts`)**：
     - 新增 `storage.getStats()` 方法与通用数据接口 `SystemStats` (`{ totalFonts: number, totalFavorites: number }`)；
     - 基于内存中已清洗校验的 `fontFiles` 与 `fontFaces` 构建家族全集 `Set<string>`，严格对齐首页去重统计逻辑（计算得出准确的 331 款字体家族）；
     - 针对收藏项严格过滤 `targetType === 'family'` 且匹配有效字体家族，统计收藏家族总数；
     - 扩展 `storage.getCategories()`，为每个目录动态附带属于该目录的字体家族数量 `count: number`；
  2. **前端 React Query 缓存联动 (`client/src/hooks/use-fonts.ts`)**：
     - 引入 `useStats()` Hook，独立维护 `["/api/stats"]` 查询缓存，具备 5 分钟 staleTime 避免无意义重复请求；
     - 在 `useToggleFavorite`（收藏切换）和 `useRescanFonts`（重新扫描）的 `onSuccess` 回调中，精准执行 `queryClient.invalidateQueries({ queryKey: ["/api/stats"] })`，触发侧边栏静默增量刷新；
  3. **组件渲染与布局保护 (`client/src/components/Sidebar.tsx`)**：
     - 在 `Sidebar` 统一注入 `useStats()`，将 `stats?.totalFonts` 与 `stats?.totalFavorites` 作为 `count` 属性传递给对应的 `NavItem`；
     - `NavItem` 内置 `tabular-nums`，并配合 `pr-10` 预留操作区（保证与包含删除图标的合集/目录项数字列在同一垂直线严谨对齐）。

---


---

### Q17: 如何将本地 Fork 修改的代码构建为 Docker 镜像并部署到 NAS / 服务器？
**答**：
用户在将代码 Fork 至自己账号（例如 `WenRun/TypeShelf`）并本地开发完成后，将其重新发布并运行在 NAS / Linux 服务器的 Docker 容器中，有三种标准部署方案：

#### 【方案一（首选推荐）】：通过 GitHub Actions 自动云端构建并发布至 GHCR
这是最省心、最标准且适合长期维护的方案，全程自动化，NAS 端只需要拉取镜像即可：
1. **推送本地代码到 GitHub 仓库**：
   在本地仓库目录（`E:\workspace\2026\TypeShelf`）执行：
   ```bash
   git push origin main
   ```
2. **GitHub Actions 自动构建多架构镜像**：
   项目内置的 `.github/workflows/docker.yml` 监听 `main` 分支推送，会自动触发 GitHub Actions 云端构建，利用 Buildx 编译出兼顾 `linux/amd64` 与 `linux/arm64` 的双架构镜像，并自动发布到您个人账号下的 GHCR (`ghcr.io/wenrun/typeshelf:latest`)。
3. **将 GitHub Package 设为公开（Public，关键）**：
   - 首次构建完成后，进入 GitHub 个人主页 -> **Packages**；
   - 找到 `typeshelf` (或关联的仓库名)，点击 **Package settings**；
   - 滚动到底部 **Danger Zone**，点击 **Change package visibility**，将其改为 **Public**（公开），这样您的 NAS 或服务器在没有登录 GitHub Token 的情况下也可直接免密拉取。
4. **更新服务器/NAS 的 `docker-compose.yml`**：
   只需将原有官方镜像名替换为您的专属镜像：
   ```yaml
   version: "3.8"

   services:
     typeshelf:
       image: ghcr.io/wenrun/typeshelf:latest   # 替换为您自己的 GHCR 镜像（注意全小写）
       container_name: typeshelf
       restart: unless-stopped
       ports:
         - "8090:5000"
       environment:
         NODE_ENV: production
         PORT: 5000
         DATABASE_URL: postgres://dummy:dummy@127.0.0.1:5432/dummy
       volumes:
         - /vol1/1000/fonts/fonts:/app/fonts   # 挂载已有字体目录（保持不变）
         - /vol1/1000/fonts/data:/app/data     # 挂载已有数据目录（保持不变，历史打标与设置自动继承）
   ```
5. **在 NAS / 服务器上重启容器**：
   ```bash
   docker compose pull
   docker compose up -d
   ```

---

#### 【方案二】：直接在 NAS / 服务器终端拉取源码并本地构建
若不想公开发布镜像或网络访问 GitHub Packages 受限，可直接在宿主机构建：
1. **在 NAS 上通过 Git 克隆您的仓库**：
   ```bash
   cd /vol1/1000/
   git clone https://github.com/WenRun/TypeShelf.git runfonts-src
   cd runfonts-src
   ```
2. **本地执行 Docker 构建**：
   ```bash
   docker build -f dockerfile -t runfonts:mybuild .
   ```
3. **修改 `docker-compose.yml` 中的镜像**：
   ```yaml
   image: runfonts:mybuild
   ```
4. **重新启动**：
   ```bash
   docker compose up -d
   ```

---

#### 【方案三】：在 Windows 本地打包镜像并离线导入 NAS
如果 NAS 性能较弱或无法联网拉取：
1. **在本地电脑（已安装 Docker Desktop）构建**：
   ```bash
   cd E:\workspace\2026\TypeShelf
   docker build -f dockerfile -t runfonts:local .
   docker save runfonts:local -o runfonts.tar
   ```
2. **将 `runfonts.tar` 上传到 NAS 任意目录**；
3. **在 NAS SSH 终端执行导入**：
   ```bash
   docker load -i runfonts.tar
   ```
4. **在 `docker-compose.yml` 中指定 `image: runfonts:local` 并启动容器**。

---

### Q18: Docker / 飞牛 fnOS 部署后点击“添加字体文件夹”提示 `Path does not exist` 或“全部字体: 0”？
- **故障现象**：
  1. 打开“添加字体文件夹”，点击“浏览路径”弹出 `/home/umbrel/umbrel/home`，提示红色错误 `Path does not exist` 与 `空目录`；
  2. 左侧边栏“全部字体”、“我的收藏”、“Local Fonts”全部显示为 0，无论如何刷新都不更新。
- **根因分析**：
  1. **上游 Umbrel 路径硬编码**：原开源项目 TypeShelf 为 Umbrel 私有云设计，在 `Sidebar.tsx` 和 `routes.ts` (`/api/browse`) 中写死了 `/home/umbrel/umbrel/home`。在通用 Docker 或 Linux / NAS 环境下该路径根本不存在，触发 `400 Path does not exist`；
  2. **挂载路径不匹配导致永久 Missing 锁死**：若将包含 Windows 本地调试路径（如 `E:\workspace\...\fonts`）的 `data/` 数据卷挂载到 Linux 容器中，容器启动时检查该路径不存在，将分类标记为 `missing`。而在原扫描引擎逻辑中，`scanAll()` 使用了 `if (cat.status === 'ok')` 进行判断，导致标记为 `missing` 的分类被永久跳过，后续无论挂载或 Rescan 都无法自愈；
  3. **目录输入框不可编辑**：原界面的路径框仅为一个只读展示块，未提供手动输入 Docker 内部挂载路径（如 `/app/fonts`）的能力。
- **工程化修复与自愈机制**：
  1. **移除 Umbrel 硬编码，实现候选路径自适应与防崩兜底**：
     - 后端 `/api/browse` 不再依赖硬编码路径，当传入路径不存在时，自动尝试容器字体标准目录 `['fonts', '/app/fonts', '.', '/app', HOME, '/']`，智能锁定可用目录，避免返回 400 导致弹窗变红报错；
     - 自动过滤 `.` 开头的隐藏文件，按字母升序排序，并返回标准 `parentPath` 支持向上一级（`..`）平滑浏览。
  2. **启动与扫描阶段双轨路径自愈 (Self-Healing)**：
     - 在 `seed.ts` 服务启动时，若检测到 `Local Fonts` 的物理路径在当前系统不存在（例如 Windows 路径移植到了 Linux 容器），但当前环境的 `fonts` 挂载目录（`/app/fonts` 或 `./fonts`）存在，则自动修正数据库中的路径为有效路径并将状态重置为 `ok`；
     - 在 `scanner.ts` 的 `scanAll()` 扫描阶段中，对每个分类动态通过 `fs.existsSync(targetPath)` 实时核验，一旦挂载目录恢复，即可直接开始扫描并重置状态为 `ok`，不再永久跳过；
     - 每次扫描结束时同步比对磁盘文件，自动清理已被物理删除或移走的孤儿文件记录和字形记录。
  3. **目录选择器双模交互 (Direct Input & Browse)**：
     - 将路径展示框重构为直观可直接键入的 `<Input>` 输入框（默认占位符提示 `/app/fonts`），用户既可直接粘贴或输入 Docker 映射路径，也可点击“浏览”图形化逐级点选；
     - 选定或键入路径后，若分类名称为空，系统会自动截取路径最后一级作为默认文件夹名称。


### Q19: 为什么彻底移除“字体目录”（Categories / Folders）与路径浏览功能？
- **背景与痛点**：
  1. 原开源项目（TypeShelf）早期为 Umbrel 私有云架构设计，在前端边栏和后端保留了通过 UI 弹窗和 `/api/browse` 路径选择器在容器内部多级添加分类目录的功能；
  2. 在现代通用 Docker / NAS（如飞牛 fnOS、群晖、Unraid、通用 Linux 服务器）部署场景中，用户统一通过 Docker Volume 挂载卷（`-v /host/fonts:/app/fonts`）提供字体。在 Web 界面中暴露文件系统底层路径选择和多目录增删不仅繁琐多余，且极易因宿主机与容器内部挂载路径不一致导致误解与报错；
  3. 字体的多维组织管理需求已由更灵活、现代的“合集分组 (Collections)”、“我的收藏 (Favorites)”和“智能多维度标签体系 (Tags)”完整覆盖，无需依靠基于物理子目录的层级。
- **架构重构与精简方案**：
  1. **前端彻底精简**：完全移除侧边栏“字体目录”区块、`CreateCategoryDialog` 弹窗与 `DirectoryPicker` 组件，移除 `/categories/:id` 路由，界面回归极致清爽；
  2. **扫描引擎直连统一字体库**：`Scanner.scanAll()` 直接扫描统一标准目录 `path.resolve('fonts')`（对应容器内 `/app/fonts` 或本地开发 `./fonts`），自动递归扫描所有子目录下的字体文件；
  3. **后端 API 清理**：移除 `/api/categories` 相关增删改查接口及 `/api/browse` 路径浏览接口，降低系统受攻击面；
  4. **文件监控统一化**：Chokidar 文件监听直接绑定 `fonts` 目录，热更新与文件增删同步逻辑更加稳固高效。

## 五、文档持续维护与演进规划

### 5.1 增补规范
1. **新模块准入**：当引入新特性（如字体子集化、批量打包导出、标签 Tag 系统）时，必须在**第二部分（核心技术模块设计）**新增小节说明其核心数据结构、API 路由与交互流程。
2. **新故障沉淀**：当生产或本地调试中定位并解决了新的 Bug 时，必须在**第四部分（常见问题排查与故障手册）**登记，包含“现象”、“根因分析”和“解决方案代码/配置”。

### 5.2 规划中演进功能候选清单
- [x] **字体分类与标签体系 (Tags & Intelligent Classifier)**：已完成 Phase 1 智能规则引擎与详情页打标交互、Phase 2 侧边栏/首页快捷胶囊筛选/#标签检索全链路；
- [x] **AI 智能分析与风格打标 (Phase 3)**：已完成设置页可视化配置面板、主流服务商一键预设（DeepSeek/OpenAI/千问/月之暗面/本地 Ollama）、连通性探测接口、大模型排版分析引擎与双轨降级兜底；
- [ ] **多目录路径模糊搜索**：支持搜索字体所在的子文件夹目录名（如输入 `卡通` 检索 `卡通字体/` 目录下的所有字体）；
- [ ] **高级属性筛选器**：支持按字重数值范围（Weight 100 ~ 900）与斜体状态（Italic）在前端进行滑块筛选；
- [ ] **字体子集化与 WOFF2 动态压缩**：对于 CJK 超大字体，支持提取预览字符子集，降低预览带宽 90% 以上；
- [ ] **字体包一键导出**：支持对选中的收藏夹或项目合集进行 ZIP 打包下载。
