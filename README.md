# Ryan · 个人网站

iOS 开发的静态个人网站，使用 HTML、CSS 和原生 JavaScript，无构建步骤，部署于 GitHub Pages：<https://lzylsq.github.io/>。

网站保留孟菲斯／动漫感的硬边框、撞色与几何元素，但**个人资料和项目文字独立撰写**。目前有两个项目介绍，**尚未正式发布文章**；文章页 `post.html` 只是排版示例，不计作已发布内容。

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页导览、轮播入口与写作空状态 |
| `projects.html` | 两个练习项目的技术路径、邮件联系入口 |
| `posts.html` | 文章列表／搜索；目前诚实显示空状态 |
| `about.html` | 个人简介、接触过的技术、邮箱与 GitHub |
| `post.html` | **未发布**的文章排版示例，已设置 `noindex` |

主导航的首页、代码人生、文章、关于我分别跳转独立页面；项目页内部的两个跳转按钮仅用于定位具体项目。旧的 `index.html#projects` 链接会自动转到项目页。关于页可复制邮箱、分享页面链接（系统分享不可用时使用剪贴板）；不支持剪贴板时会明确提示。首页轮播支持箭头、圆点、手机左右划动，并在悬停、聚焦、页面隐藏或系统要求减少动效时停止自动轮播。明暗主题按系统偏好初始化并记住选择。搜索有无 JavaScript 的表单回退，`Ctrl/⌘+K` 聚焦、`Esc` 清空；正式文章发布后可按卡片内容和标签筛选。文章详情提供阅读进度、目录高亮和代码复制。

## 发布第一篇文章

1. 复制 `post.html` 为一个新文件；建议先把新文件放在网站根目录。若放进子目录（例如 `posts/my-first-note.html`），需把 CSS、JS、图片及站内链接的相对路径对应改为 `../`。
2. 修改标题、描述、HTML 正文、实际发布日期和分类；**从正式文章删掉** `<meta name="robots" content="noindex,follow">`。不要再沿用“排版示例”字样。
3. 在 `posts.html` 的 `<div class="post-stack" id="post-list" data-post-list>` 中加入一张真实文章卡。标题、摘要、分类、日期及目标链接都填真实信息；若没有真实封面，可以继续使用几何装饰图，但不要把它当作项目截图；标签链接可写作 `<a href="posts.html#post-list" data-tag="Swift">Swift</a>`。页面侧栏的「最近发布」与「文章标签」会按卡片自动生成。
卡片骨架（放进 `data-post-list` 容器；以下只是填写格式，不是已发布内容）：

```html
<article class="post-card">
  <a class="post-card-media" href="你的文章文件.html">
    <img src="assets/images/post-1.svg" alt="" loading="lazy">
  </a>
  <div class="post-card-body">
    <h3><a href="你的文章文件.html">你的文章标题</a></h3>
    <p>你实际写好的摘要</p>
    <div class="card-meta">
      <div class="tags-list"><a href="posts.html#post-list" data-tag="真实分类">真实分类</a></div>
      <span>真实发布日期</span>
    </div>
  </div>
</article>
```

4. 发布以后，删除 `posts.html` 中的 `[data-empty-publications]` 提示块，并更新文章页标题下方的空状态说明。若希望首页显示最新文章，也将 `index.html` 的 `.empty-publications` 换为真实文章预览。
5. 若首页有新的轮播内容，记得在 `.hero-dots` 中添加对应 `data-hero-dot` 按钮；目前三张内容分别指向关于页、数据项目、AI 项目。

两个项目当前标记为私有仓库，因此使用邮件联系而非无权限的仓库链接。日后公开源码，再把项目按钮链接换为真实地址。

## 外观与维护

- 主配色：`css/style-memphis.css` 的第 21 节集中覆盖粉、黄、青、紫四种点缀色与深色底色；调整时兼顾亮色主题与文字对比度。
- 个人资料：`index.html`、`about.html`、`posts.html`、`projects.html` 及各页页脚；联系方式还在导航的「更多」菜单及页眉邮件入口。
- 图片：`assets/images/` 中的几何图是装饰素材，并非真实项目截图；要展示项目实际画面请自行替换。
- 页面交互：`js/theme.js`；无外部 JavaScript 依赖。

本地预览：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

仓库 `LzyLsq.github.io` 使用 `main` 分支根目录部署 GitHub Pages，推送后通常需要短暂等待生效。
