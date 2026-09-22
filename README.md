# 个人主页

个人网站骨架,纯静态(HTML + CSS + JS),无构建、无外部 JS 依赖,已部署在 GitHub Pages。

线上地址:**https://lzylsq.github.io/**

> 当前首页 `index.html` 是 **孟菲斯(Memphis)风格**,与 [yantao.wiki](https://yantao.wiki/) 的视觉/结构 1:1 对齐
> (页面文案与文章均为占位内容,未复用对方任何正文,后续自行填写)。

## 两套皮肤(随时切换)

| 文件 | 风格 | 说明 |
|---|---|---|
| `index.html` | **孟菲斯风(当前)** | 硬边框 3px + 实心偏移投影 + 直角 + 波点纸背景 + 波普四原色 + Archivo Black 展示字 |
| `index-anime.html` | 动漫(二次元)风 | 樱花粉配色、圆角卡片、可爱字体、飘落花瓣,访问 `/index-anime.html` 查看 |

切回动漫风:改 `index.html` 顶部两行引用即可(反过来则改 `index-anime.html`)

```html
<!-- 动漫风 -->
<link rel="stylesheet" href="css/theme-anime.css">
<script src="js/main-anime.js"></script>

<!-- 孟菲斯风(默认,先把 <html data-style="memphis"> 保留) -->
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/style-memphis.css">
<script src="js/theme.js"></script>
```

## 特性

- 孟菲斯皮肤:卡片错落微旋转、黄/粉/青三色循环硬投影、波点纸背景
- 深色 / 浅色两套(各自独立配色),跟随系统偏好,`localStorage` 记忆,切换无闪白
- 毛玻璃(孟菲斯下为实色)吸顶导航 + 移动端汉堡菜单 + 「更多」下拉
- Hero 轮播(5 张,自动播放、hover/focus 暂停、箭头 + 圆点切换)
- 文章列表(左图右文卡片)+ 侧栏(个人卡片 / 标签云 / 最新文章 / RSS 订阅)
- ⌘K / Ctrl+K 聚焦搜索框
- 站点统计弹窗(原生 JS 渲染,不依赖 ECharts CDN)
- 回到顶部、页脚年份与「已稳定运行 N 天」、滚动进场动画
- 响应式布局,适配手机 / 平板 / 桌面

## 目录结构

```
├── index.html            # 主页面(孟菲斯风,所有文案都在这里改)
├── index-anime.html      # 动漫风版本(独立结构)
├── css/
│   ├── style.css … theme-light.css   # 基础样式 / 明暗主题
│   ├── layout.css pages.css article.css footer.css responsive.css
│   ├── stats.css particle.css shortcodes.css github.css lock.css music.css sticky.css
│   ├── style-memphis.css # ★ 孟菲斯皮肤(配色在文件顶部 --m-* 变量)
│   └── theme-anime.css   # 动漫风样式
├── js/
│   ├── theme.js          # 孟菲斯版交互脚本(轮播/主题/菜单/统计等)
│   └── main-anime.js     # 动漫版交互脚本(含花瓣特效)
├── assets/
│   ├── favicon.svg
│   └── images/           # avatar.png 放这里,hero-tech.svg 为图片加载失败兜底图
└── README.md
```

## 如何修改成你自己的

1. **改名字/文案**:打开 `index.html`,搜索 `TODO` 注释和 `Your Name`,逐项替换(标题、简介、导航、Hero 轮播 5 张、文章卡片、标签云、页脚)。
2. **换头像**:把图片命名为 `avatar.png` 放进 `assets/`(或在 HTML 里改路径)。现在是占位图。
3. **加文章**:复制一个 `<article class="post-card">…</article>` 整块,改标题、摘要、分类标签、日期、封面图。
4. **加 Hero 幻灯片**:复制一个 `<article class="hero-slide" data-hero-slide>` 整块,并在 `.hero-dots` 里加一个 `data-hero-dot="N"` 圆点(编号从 0 开始)。
5. **改配色**:孟菲斯改 `css/style-memphis.css` 顶部 `--m-pink / --m-yellow / --m-teal / --m-purple`;动漫改 `css/theme-anime.css` 顶部 `:root`。
6. **站点统计弹窗数据**:编辑 `js/theme.js` 顶部的 `SITE_START_DATE`(页脚运行天数)与 `window.fluxgridStats`(月度/分类/标签/日历热力图数据)。
7. **外链图标**：「更多」下拉里的 GitHub、RSS、时光机等链接已写好 `href`,替换成你自己的地址。

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
