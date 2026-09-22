# Ryan · 个人主页

iOS 开发的个人网站。纯静态(HTML + CSS + JS),**零构建、零外部 JS 依赖**,已部署在 GitHub Pages。

线上地址:**https://lzylsq.github.io/**

> 首页为 **孟菲斯(Memphis)风格**,视觉与结构对标 [yantao.wiki](https://yantao.wiki/),
> 文章标题与摘要为占位内容,后续自行填写。

## 设计语言

- 3px 硬黑边框 + 实心偏移投影(无模糊)+ 全直角
- 波点纸背景(`radial-gradient 1.3px / 22px`)
- 波普四原色:粉 `#FF71CE` / 黄 `#FFCE5C` / 青 `#86CCCA` / 紫 `#6A7BB4`
- `Archivo Black` 展示字体 + 卡片错落微旋转 + 标题尾部套色块

## 页面结构

| 区块 | 锚点 | 内容 |
|---|---|---|
| 首屏轮播 | `#top` | 5 张 Hero 幻灯片(自动播放 / 箭头 / 圆点)+ 代码窗口 |
| 代码人生 | `#projects` | 两个真实项目:实时订单数据分析与推荐平台、LawDesign 法律智能体平台 |
| 最新文章 | `#post-stream` | 6 张文章卡片 + 侧栏(个人卡片 / 标签云 / 最新文章 / RSS) |
| 关于我 | `#about` | 个人简介、技术栈、Gmail / GitHub 联系方式(`#contact`) |
| 页脚 | — | 版权、年份、「已稳定运行 N 天」 |

## 特性

- 孟菲斯皮肤:卡片错落微旋转、黄/粉/青三色循环硬投影、波点纸背景
- 深色 / 浅色两套配色,跟随系统偏好,`localStorage` 记忆,首屏前确定主题无闪白
- 吸顶导航 + 移动端汉堡菜单 + 「更多」下拉
- Hero 轮播(5 张,自动播放、hover/focus 暂停、箭头 + 圆点切换)
- ⌘K / Ctrl+K 聚焦搜索框
- 站点统计弹窗(原生 JS 渲染,不依赖 ECharts CDN)
- 回到顶部、滚动进场动画(IntersectionObserver 错峰级联)
- 响应式布局,适配手机 / 平板 / 桌面

## 目录结构

```
├── index.html            # 主页面(唯一页面,所有文案都在这里改)
├── css/
│   ├── style.css … theme-light.css   # 基础样式 / 明暗主题
│   ├── layout.css  pages.css  article.css  footer.css  responsive.css
│   ├── stats.css  particle.css  shortcodes.css  github.css  lock.css  music.css  sticky.css
│   └── style-memphis.css # ★ 孟菲斯皮肤(配色在文件顶部 --m-* 变量)
├── js/
│   └── theme.js         # 交互脚本(轮播/主题/菜单/统计等,无外部依赖)
├── assets/
│   ├── favicon.svg
│   └── images/           # avatar.png 放这里,hero-tech.svg 为图片加载失败兜底图
└── README.md
```

## 如何改成你自己的

1. **改名字/文案**:打开 `index.html`,搜 `Ryan` 与 `TODO` 注释(标题、简介、Hero 5 张、文章卡片、标签云、页脚)。
2. **换头像**:把图片命名为 `avatar.png` 放进 `assets/`(或在 HTML 里改路径),现在是占位图。
3. **加文章**:复制一个 `<article class="post-card">…</article>` 整块,改标题、摘要、分类标签、日期、封面图。
4. **加 Hero 幻灯片**:复制一个 `<article class="hero-slide" data-hero-slide>` 整块,并在 `.hero-dots` 里加一个 `data-hero-dot="N"` 圆点(编号从 0 开始)。
5. **加/改项目**:复制 `#projects` 里的一个 `<article class="project-card">` 整块;项目卡片的错落配色按 `:nth-child(2)` 循环,超过 2 个可在 `css/style-memphis.css` 第 16 节补规则。
6. **改配色**:编辑 `css/style-memphis.css` 顶部的 `--m-pink / --m-yellow / --m-teal / --m-purple`。
7. **站点统计 / 运行天数**:编辑 `js/theme.js` 顶部的 `SITE_START_DATE` 与 `window.fluxgridStats`。
8. **联系方式**:`#about` 区的 Gmail 与 GitHub 链接、侧栏 `profile-social`、页脚 `footer-meta` 三处。

## 本地预览

直接双击 `index.html`,或:

```bash
python3 -m http.server 8000   # 访问 http://localhost:8000
```

## 部署

仓库 `LzyLsq.github.io` 已开启 GitHub Pages(main 分支根目录),推送即自动部署,约 1 分钟生效:

```bash
git add -A && git commit -m "update" && git push
```
