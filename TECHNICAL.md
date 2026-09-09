# TypeShelf 核心技术架构设计与规范标准手册 (TECHNICAL.md)

> **版本**：v1.0.0  
> **适用项目**：TypeShelf 字体管理系统  
> **文档目标**：统一记录 TypeShelf 项目的**核心架构设计、关键技术模块实现机制、工程规范标准以及常见问题排查手册（FAQ）**。  
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
- [五、文档持续维护与演进规划](#五文档持续维护与演进规划)
  - [5.1 增补规范](#51-增补规范)
  - [5.2 规划中演进功能候选清单](#52-规划中演进功能候选清单)

---

## 一、系统架构总览与设计哲学

### 1.1 系统定位
**TypeShelf** 是一款轻量级、开箱即用的私有化/自托管（Self-Hosted）字体管理与 Web 实时排版渲染系统。其设计哲学贯穿以下四项基本原则：
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
TypeShelf/
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
  1. 采用 `i18next` 框架，配置 `LanguageDetector` 优先读取用户在浏览器的首选语言，并在用户手动切换后写入 `localStorage.getItem('typeshelf_language')` 保持长久记忆。
  2. 提供紧凑型 Icon 切换按钮与下拉选择器，实现全界面所有文本（侧边栏、搜索框提示语、详情页元数据、Toast 弹窗）毫秒级无刷新更新。

### 2.7 全局主题外观系统 (Theme System)
- **源码定位**：`client/src/components/ThemeProvider.tsx`、`client/src/components/ThemeSwitcher.tsx`
- **技术要点**：
  1. 依托 Tailwind CSS 的 `darkMode: 'class'` 策略。
  2. 提供 `ThemeContext` 统一管控 `'light' | 'dark' | 'system'` 状态。
  3. 当主题变更时，严格同步操作 `document.documentElement.classList.toggle('dark', isDark)`，并将首选项存入 `localStorage`，根治由于组件脱节导致的主题切换无响应问题。

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

## 五、文档持续维护与演进规划

### 5.1 增补规范
1. **新模块准入**：当引入新特性（如字体子集化、批量打包导出、标签 Tag 系统）时，必须在**第二部分（核心技术模块设计）**新增小节说明其核心数据结构、API 路由与交互流程。
2. **新故障沉淀**：当生产或本地调试中定位并解决了新的 Bug 时，必须在**第四部分（常见问题排查与故障手册）**登记，包含“现象”、“根因分析”和“解决方案代码/配置”。

### 5.2 规划中演进功能候选清单
- [ ] **多目录路径模糊搜索**：支持搜索字体所在的子文件夹目录名（如输入 `卡通` 检索 `卡通字体/` 目录下的所有字体）；
- [ ] **高级属性筛选器**：支持按字重数值范围（Weight 100 ~ 900）与斜体状态（Italic）在前端进行滑块筛选；
- [ ] **字体子集化与 WOFF2 动态压缩**：对于 CJK 超大字体，支持提取预览字符子集，降低预览带宽 90% 以上；
- [ ] **字体包一键导出**：支持对选中的收藏夹或项目合集进行 ZIP 打包下载。
