# 个人主页

一个简洁的深色科技风个人网站骨架,纯静态(HTML + CSS + JS),无构建依赖,可直接部署到 GitHub Pages。

## 特性

- 深色 / 浅色主题一键切换(跟随系统偏好,记忆选择)
- 毛玻璃吸顶导航 + 移动端汉堡菜单
- Hero 首屏 + 代码窗口卡片
- 项目 / 博客 / 技能 / 联系四大版块
- 滚动进场动画、导航高亮、背景粒子点缀
- 响应式布局,适配手机 / 平板 / 桌面

## 目录结构

```
├── index.html      # 页面结构(所有文案都在这里改)
├── css/style.css   # 主题样式(配色在文件顶部 :root 变量里)
├── js/main.js      # 交互脚本
└── assets/         # 头像、自定义图片放这里
```

## 如何修改成你自己的

1. **改名字/文案**:打开 `index.html`,搜索 `TODO` 注释,逐项替换成你的信息(名字、简介、项目、文章、联系方式、社交链接)。
2. **换头像**:把你的图片命名为 `avatar.png` 放进 `assets/` 目录(或在 `index.html` 中修改头像路径)。
3. **改配色**:打开 `css/style.css`,修改顶部 `:root` 里的颜色变量(如 `--blue`)。
4. **删/加版块**:每个版块都是独立的 `<section>`,整块复制或删除即可。

## 本地预览

直接双击 `index.html` 就能在浏览器里打开;或者起个本地服务:

```bash
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

## 部署到 GitHub Pages

1. 把本项目推送为一个公开仓库,推荐仓库名 `你的用户名.github.io`。
2. 仓库页面 **Settings → Pages → Build and deployment**,Source 选择 `Deploy from a branch`,Branch 选 `main`、目录 `/(root)`,保存。
3. 等 1 分钟左右,访问 `https://你的用户名.github.io` 即可。

## License

MIT
