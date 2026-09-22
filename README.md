# 个人主页

个人网站骨架,纯静态(HTML + CSS + JS),无构建依赖,已部署在 GitHub Pages。

线上地址:**https://lzylsq.github.io/**

## 两套主题(随时切换)

| 文件 | 风格 | 说明 |
|---|---|---|
| `index.html` | 深色科技风 | 参考 fluxgrid 风格:深蓝黑底 + 蓝色强调 + 代码窗口,**当前线上版本** |
| `index-anime.html` | 动漫(二次元)风 | 樱花粉配色、圆角卡片、可爱字体、飘落花瓣,访问 `/index-anime.html` 查看 |

切换方法:编辑 `index.html` 顶部的两行引用即可

```html
<link rel="stylesheet" href="css/theme-anime.css">  <!-- 换成 css/theme-anime.css -->
<script src="js/main-anime.js"></script>            <!-- 换成 js/main-anime.js -->
```

两套主题共用同一份 HTML 结构,改内容只改 `index.html` 一处即可。

## 特性

- 深色 / 浅色(樱花粉)主题一键切换,跟随系统偏好,localStorage 记忆
- 毛玻璃吸顶导航 + 移动端汉堡菜单 + Scrollspy 导航高亮
- Hero 首屏 + 代码窗口卡片
- 项目 / 博客 / 技能 / 联系版块
- 滚动进场动画、背景粒子、飘落花瓣(动漫主题)
- 响应式布局,适配手机 / 平板 / 桌面

## 目录结构

```
├── index.html          # 主页面(深色科技风,所有文案都在这里改)
├── index-anime.html    # 动漫风版本(共用同一结构)
├── css/
│   ├── style.css       # 深色科技风样式(配色在文件顶部 :root 变量)
│   └── theme-anime.css # 动漫风样式
├── js/
│   ├── main.js         # 深色版交互脚本
│   └── main-anime.js   # 动漫版交互脚本(含花瓣特效)
├── assets/             # 头像、自定义图片放这里
└── README.md
```

## 如何修改成你自己的

1. **改名字/文案**:打开 `index.html`,搜索 `TODO` 注释,逐项替换(名字、简介、博客、联系方式、社交链接)。
2. **换头像**:把图片命名为 `avatar.png` 放进 `assets/`(或在 HTML 里改路径)。现在是程序生成的占位图。
3. **加项目/文章**:复制对应的 `<article class="post-card">` 整块,改标题、描述、标签、链接。封面图可换成自己的图片路径。
4. **改配色**:深色版改 `css/style.css` 顶部 `:root`;动漫版改 `css/theme-anime.css` 顶部 `:root`。

## 本地预览

直接双击 `index.html`,或:

```bash
python3 -m http.server 8000   # 访问 http://localhost:8000
```

## 部署

仓库 `LzyLsq.github.io` 已开启 GitHub Pages(main 分支根目录),推送即自动部署,约 1 分钟生效。
