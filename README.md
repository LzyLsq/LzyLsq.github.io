# Ryan · 个人主页

iOS 开发的个人网站。纯静态(HTML + CSS + JS),**零构建、零外部 JS 依赖**,已部署在 GitHub Pages。

线上地址:**https://lzylsq.github.io/**

> 首页为 **孟菲斯(Memphis)风格**,视觉与结构对标 [yantao.wiki](https://yantao.wiki/)。
> 全站文章标题 / 摘要均为**占位内容**,后续自行填写;所有按钮均已连通真实页面。

## 页面结构(多页跳转,非单页滚动)

| 文件 | 作用 | 说明 |
|---|---|---|
| `index.html` | 首页 | Hero 轮播、代码人生(项目)、最新文章预览、关于我入口 |
| `posts.html` | 文章列表 | 6 张文章卡 + 侧栏(个人卡片 / 标签云 / 最新文章);**搜索 / 标签点击即时筛选** |
| `about.html` | 关于我 | 个人简介、技术栈、Gmail / GitHub 联系方式(`#contact`) |
| `post.html` | 文章详情模板 | 单篇排版骨架(标题/列表/引用/代码块/表格),复制此页填真实正文 |

导航与页脚在这些页面间**整页跳转**;页内锚点(如 `#projects`、文章目录)为**即时跳转**(已禁用平滑滚动)。

## 特性

- 孟菲斯皮肤:卡片错落微旋转、黄/粉/青三色循环硬投影、波点纸背景
- 深色 / 浅色两套配色,跟随系统偏好,`localStorage` 记忆,首屏前确定主题无闪白;右上角 🌓 一键切换
- 吸顶导航 + 移动端汉堡菜单 + 「更多」下拉
- Hero 轮播(5 张,自动播放、hover/focus 暂停、箭头 + 圆点切换)
- **真实搜索**:输入/回车即时过滤文章卡;⌘K / Ctrl+K 聚焦;Esc 清空
- **标签互通**:标签云 / 文章分类 → 点击即按标签筛选(无需后端)
- 侧栏「最新文章 / 标签云」由文章卡**自动生成**,统计弹窗无数据时如实显示空态(不写死假数字)
- 站点统计弹窗(原生 JS 渲染,不依赖 ECharts CDN)
- 回到顶部、滚动进场动画(IntersectionObserver 错峰级联)
- 响应式布局,适配手机 / 平板 / 桌面

## 目录结构

```
├── index.html / posts.html / about.html / post.html
├── css/
│   ├── style.css … theme-light.css   # 基础样式 / 明暗主题
│   ├── layout.css  pages.css  article.css  footer.css  responsive.css
│   ├── stats.css  particle.css  shortcodes.css  github.css  lock.css  music.css  sticky.css
│   └── style-memphis.css # ★ 孟菲斯皮肤(配色在文件顶部 --m-* 变量;新样式在第 19 节起)
├── js/
│   └── theme.js         # 交互脚本(主题/菜单/搜索/筛选/轮播/统计等,无外部依赖)
├── assets/
│   ├── favicon.svg
│   └── images/          # hero-1..5.svg、post-1..6.svg、avatar-fallback.svg(占位图,零外链)
└── README.md
```

## 如何改成你自己的

1. **改名字 / 身份文案**:各页面搜 `Ryan`、`TODO`;页眉、页脚、关于我在 `index.html` / `about.html` / 每个页面的 `<header>`/`<footer>` 里改。
2. **换头像**:把图片命名为 `avatar.png` 放进 `assets/`,并让 `posts.html` 中头像 `img` 的 `src` 指向它(当前用占位图 `assets/images/avatar-fallback.svg`,不会裂图)。
3. **加文章**:在 `posts.html` 的 `.post-stack[data-post-list]` 里复制一个 `<article class="post-card">…</article>` 整块,改标题、摘要、分类标签、日期、封面图(用 `assets/images/post-N.svg`)。
   - 侧栏「最新文章」和「标签云」会**自动**跟着更新,无需手改。
   - 想放真正正文:复制 `post.html`,把标题、`.article-content` 里的 HTML 换成你的正文,再把列表里对应卡的链接指向它。
4. **加 Hero 幻灯片**:在 `index.html` 复制一个 `<article class="hero-slide" data-hero-slide>`,并在 `.hero-dots` 里加一个 `data-hero-dot="N"` 圆点(编号从 0 开始)。
5. **加 / 改项目**:复制 `index.html#projects` 里的一个 `<article class="project-card">`。
   - 两个项目当前是**私有仓库**,按钮用「邮件了解详情」并标注「暂未公开」;**日后开源时**,把按钮 `href` 换成仓库地址即可(HTML 内有注释提示)。
6. **改配色**:编辑 `css/style-memphis.css` 顶部的 `--m-pink / --m-yellow / --m-teal / --m-purple`。
7. **站点统计 / 运行天数**:编辑 `js/theme.js` 顶部的 `SITE_START_DATE` 与 `window.fluxgridStats`(不填则显示空态)。
8. **联系方式**:`about.html` 的 Gmail / GitHub 链接、`posts.html` 侧栏 `profile-social`、页脚 `footer-meta` 三处。

## 本地预览

```bash
python3 -m http.server 8000   # 访问 http://localhost:8000
```

> 多页跳转需通过 http(s) 访问;直接双击 `index.html` 也能看,但跨页跳转/统计建议用本地服务。

## 部署

仓库 `LzyLsq.github.io` 已开启 GitHub Pages(main 分支根目录),推送即自动部署,约 1 分钟生效:

```bash
git add -A && git commit -m "update" && git push
```
