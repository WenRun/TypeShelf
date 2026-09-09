# TypeShelf 字体管理工具

<p align="center">
  <b>一款轻量、开箱即用的自托管（Self-Hosted）字体管理与 Web 预览系统</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-green.svg" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED.svg" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
</p>

---

## 📖 项目简介

**TypeShelf** 是一个专为设计师、独立开发者及字体爱好者打造的本地/私有化自托管字体管理系统。

它可以自动递归扫描指定文件夹中的字体文件，解析字体的底层元数据（字族名、字重、风格、版本等），并提供美观现代的 Web 交互界面。你可以直接在浏览器中实时输入任意文本（支持中文及各类语言）对比预览字体渲染效果、分类归档、建立收藏集。

> **亮点**：零外部数据库依赖！采用本地 JSON 文件持久化存储，启动迅速，单容器即可运行，数据备份与迁移仅需复制文件夹。

---

## ✨ 核心特性

- 📂 **目录与分类管理**：支持监听本地默认字体文件夹，或在 Web 界面添加任意外部目录路径，支持递归遍历子目录。
- 🔍 **字体规格自动识别**：基于 `fontkit` 二进制深度解析字体文件，自动提取：
  - **Font Family**（字体家族名称）
  - **Subfamily / Variant**（子样式变体：Regular, Bold, Light, Italic 等）
  - **Weight**（标准字重数值：100 ~ 900）
  - **Italic**（斜体状态识别）
  - **Stretch**（字宽拉伸比例）
  - **TTC 集合拆解**：支持对 `.ttc` 字体合集文件进行自动拆解，独立展示与索引各个字形。
- 🌐 **多语言（i18n）无缝切换**：原生内置简体中文与英文（English）双语界面，顶部导航与设置中心均支持一键即时切换，自动检测浏览器首选语言并在本地持久记忆。
- 🔤 **实时效果预览**：
  - 自定义预览文案（可在顶部输入框随时输入文字实时查看）。
  - 支持滑块无级调节预览字号。
  - 完整支持中文字符集渲染与中文字体信息展示。
- 🗂️ **收藏与项目集合（Collections）**：
  - 支持对心仪的字体一键加入“收藏夹（Favorites）”。
  - 支持自定义创建项目分组集合（如“电商海报字体”、“代码等宽字体”），分类整理更高效。
- 💾 **免数据库运维**：底层索引和配置自动持久化到 `./data/*.json`，无需安装和配置 PostgreSQL / MySQL。
- 🐳 **灵活的多端部署**：支持 Docker 单容器一键部署、Umbrel 社区应用一键安装以及 Node.js 本地开发调试。

---

## 🗃️ 支持的字体格式

| 格式扩展名 | 格式类型 | 说明 |
| :--- | :--- | :--- |
| **`.ttf`** | TrueType Font | 最常用的标准矢量字体格式 |
| **`.otf`** | OpenType Font | 高级排版矢量字体格式 |
| **`.woff` / `.woff2`** | Web Open Font Format | 网页压缩字体格式，体积小、加载快 |
| **`.ttc`** | TrueType Collection | 字体合集文件（自动解构成多个独立字体） |

---

## 🚀 快速上手：本地源码运行与调试

### 1. 前置环境要求
- **Node.js**：`>= 20.0.0`（推荐 LTS 版本，如 v20 或 v24）
- **包管理工具**：`npm` 或 `pnpm`

### 2. 克隆与安装依赖
```bash
git clone https://github.com/WenRun/TypeShelf.git
cd TypeShelf

# 安装依赖
npm install
```

### 3. 开发模式启动（推荐）
本项目已内置对 Windows / macOS / Linux 的跨平台环境兼容（包含 `cross-env` 与 Winsock 端口适配）：

```bash
npm run dev
```

启动成功后，打开浏览器访问：
👉 **http://localhost:5000**

> **说明**：开发模式下集成了 Vite HMR（热模块替换），修改 `client/` 或 `server/` 代码将自动刷新重载。

### 4. VS Code 一键断点调试
项目中已预置 `.vscode/launch.json` 调试配置：
1. 使用 VS Code 打开本项目根目录。
2. 在服务端代码（例如 `server/routes.ts`、`server/scanner.ts`、`server/storage.ts`）中设置断点。
3. 按键盘快捷键 **`F5`**，选择 **`Debug TypeShelf (Server & Vite)`** 即可开启单步断点调试。

### 5. 生产环境构建与启动
```bash
# 编译前端静态资源并打包服务端
npm run build

# 启动生产服务
npm start
```

---

## 🐳 Docker 部署指南

### 方案一：Docker 单容器运行（最简推荐）

因为数据直接使用本地 JSON 持久化，无需运行复杂的数据库容器，单容器即可直接跑起来：

#### 1. 构建镜像
```bash
docker build -t typeshelf:local .
```

#### 2. 运行容器
```bash
docker run -d \
  --name typeshelf \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/fonts:/app/fonts \
  --restart unless-stopped \
  typeshelf:local
```

> **Windows PowerShell 命令示例**：
> ```powershell
> docker run -d `
>   --name typeshelf `
>   -p 5000:5000 `
>   -v ${PWD}/data:/app/data `
>   -v ${PWD}/fonts:/app/fonts `
>   --restart unless-stopped `
>   typeshelf:local
> ```

---

### 方案二：Docker Compose 编排

在项目根目录下创建或使用 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  typeshelf:
    image: typeshelf:local
    build: .
    container_name: typeshelf
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      # 持久化字体分类及收藏等元数据
      - ./data:/app/data
      # 默认字体存放目录
      - ./fonts:/app/fonts
      # （可选）以只读方式挂载主机现有的字体库
      - /your/host/fonts:/host-fonts:ro
```

启动容器：
```bash
docker compose up -d
```

---

### 方案三：Umbrel 个人私有云安装

TypeShelf 支持通过 Umbrel 社区应用商店一键安装：
1. 打开 Umbrel 后台：`App Store` → 右上角菜单 `...` → `Community App Stores`。
2. 添加社区应用源：`https://github.com/hashmoody/umbrel-app-store`。
3. 在应用列表中找到 **TypeShelf**，点击 **Install** 即可完成部署。

---

## 📁 如何添加与管理字体

1. **方式 1：使用默认字体目录（推荐）**
   - 本地运行：将你的字体文件（`.ttf`, `.otf`, `.woff`, `.woff2`, `.ttc`）放入项目根目录下的 `fonts/` 文件夹内。
   - Docker 运行：将字体拷贝到映射的宿主机 `./fonts` 目录（对应容器内 `/app/fonts`）。
   - 放入后，在 Web 界面右上角点击 **刷新扫描图标（↻）** 即可载入。

2. **方式 2：添加自定义文件夹**
   - 打开 Web 界面，在左侧边栏的 **Categories（分类）** 区域点击 `+` 号。
   - 输入你电脑或服务器上的文件夹路径（如果是 Docker 部署，请输入容器内的挂载路径，如 `/host-fonts/MyFonts`）。
   - 点击保存后，系统将自动递归读取并索引该路径下的所有字体。

---

## 💡 常见问题与注意事项（FAQ）

### Q1: 这个网站支持中文吗？
- **UI 界面**：**已原生支持中文界面！** 采用 `react-i18next` 实现了完整的多语言（i18n）支持，在顶部导航栏或设置中心可一键切换【简体中文】与【English】，并持久化保存在本地浏览器中。
- **中文预览**：**完全支持！** 默认预设中文古诗文经典排版预览文案（“落霞与孤鹜齐飞，秋水共长天一色”），并可在顶部输入框随时输入任意中文文本实时渲染。
- **中文字体解析**：后端基于 `fontkit` 深度解析中文字体，能正确提取 Family Name（如“思源黑体”、“方正兰亭”），并支持中文字体关键词的模糊检索。

### Q2: 部署必须依赖外部数据库吗？
- **完全不需要！** 
- 虽然代码库中保留了 Drizzle ORM 相关依赖包，但目前核心存储实现采用的是文件级 `JsonStorage`（位于 `server/storage.ts`）。
- 所有的分类、收藏、索引数据全部保存在 `./data/` 目录下的 JSON 文件中，只要持久化挂载该目录，数据永不丢失。

### Q3: Linux / Umbrel 下提示 `ENOSPC` 崩溃？
- **原因**：字体文件较多时，Node.js 文件监听工具（Chokidar）耗尽了系统的 `inotify` 监视器上限。
- **解决方案**：在 Linux 主机上执行以下命令增加系统文件监视器限额：
  ```bash
  sudo tee /etc/sysctl.d/99-typeshelf-inotify.conf >/dev/null <<'EOF'
  fs.inotify.max_user_watches=2097152
  fs.inotify.max_user_instances=4096
  fs.inotify.max_queued_events=1048576
  EOF
  sudo sysctl --system
  ```

### Q4: Windows 本地启动报 `ENOTSUP` 错误？
- **原因**：原版代码使用了 Linux 专属的 `reusePort: true` Socket 选项，Windows Winsock 不支持此特性。
- **解决方案**：本项目已更新 `server/index.ts`，在 Windows 环境下自动忽略该参数，无需手动修改。

---

## 📂 项目工程结构

```text
TypeShelf/
├── client/                 # 前端源码 (React 18 + Tailwind CSS + Vite)
│   ├── src/
│   │   ├── components/     # UI 组件 (FontCard, Sidebar, LanguageSwitcher 等通用组件)
│   │   ├── i18n/           # 国际化配置与语言包 (zh-CN.json, en.json)
│   │   ├── hooks/          # React Query 数据请求 Hooks
│   │   ├── pages/          # 页面 (Home, FontDetail, Settings 等)
│   │   └── App.tsx         # 路由入口 (wouter)
│   └── index.html          # 前端 HTML 模板
├── server/                 # 后端源码 (Express API 服务)
│   ├── index.ts            # 服务端主入口
│   ├── routes.ts           # RESTful API 路由定义
│   ├── scanner.ts          # 字体文件递归扫描与 fontkit 元数据解析
│   ├── storage.ts          # 基于 JSON 文件的存储层 (JsonStorage)
│   └── vite.ts             # 开发模式 Vite 中间件整合
├── shared/                 # 前后端共享类型定义 (schema.ts)
├── data/                   # 本地数据持久化目录 (*.json)
├── fonts/                  # 默认本地字体存放目录
├── script/
│   └── build.ts            # esbuild + vite 生产打包脚本
├── dockerfile              # 生产环境 Docker 多阶段构建文件
└── package.json            # 依赖声明与运行脚本
```

---

## 📖 技术文档与规范 (Technical Documentation)

本项目提供详细的底层技术架构、关键模块实现机制、工程规范及常见问题排查手册：  
👉 **[查看核心技术架构设计与规范标准手册 (TECHNICAL.md)](TECHNICAL.md)**

涵盖模块：
- **系统架构与数据流**：零外部数据库设计、轻量同构架构与端到端数据拓扑
- **核心模块底层机制**：字体二进制扫描、老旧中文字体编码清洗与智能降级、搜索聚合过滤算法、海量字体触底无限滚动加载、物理文件溯源体系
- **工程规范与标准**：TypeScript 类型与防空规范、数据安全隔离标准、Git 提交规范
- **排错与 FAQ 手册**：字体方块问号与 pur 乱码排查、搜索聚合机制剖析、局域网复制失效处理等高频问题解答

## 🗺️ 后续迭代计划 (Roadmap)

- [x] **UI 界面多语言（i18n）**：支持简体中文与英文双语切换，自动检测浏览器语言并支持本地缓存记住配置。
- [ ] **字体标签系统**：支持自定义给字体打标签（如：衬线、黑体、书法、手写、圆体）。
- [ ] **字体文件打包导出与下载**：支持在 Web 端一键下载单款字体或打包下载 Collection 集合。
- [ ] **增强型去重索引**：根据文件 SHA1 自动合并重复字体文件。
- [ ] **可选数据库驱动**：为超大规模字体库（数万款以上）提供可选的 PostgreSQL 驱动支持。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 许可协议开源。

## 👏 鸣谢

- 原始项目作者：Built with ❤️ by [Azoora](https://github.com/hashmoody)
- 字体解析引擎：[fontkit](https://github.com/foliojs/fontkit)
