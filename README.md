# 材料性能分析系统

基于霍普金森压杆实验的有机-无机混合材料专业分析平台

## 项目特性

- ✅ 纯前端实现，无需后端服务器
- ✅ 响应式设计，支持多种设备
- ✅ 模块化架构，代码结构清晰
- ✅ 支持CSV、Excel、PDF文件上传解析
- ✅ 贝叶斯优化算法配比设计
- ✅ 信号处理与数据可视化

## 技术栈

- **HTML5** - 语义化标记
- **CSS3** - 响应式布局、动画效果
- **JavaScript ES6+** - 模块化编程
- **Chart.js** - 数据可视化图表
- **Marked** - Markdown渲染
- **SheetJS** - Excel文件解析

## 项目结构

```
frontend/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── SignalProcessor.js  # 信号处理模块
│   ├── MaterialCalculator.js  # 材料计算模块
│   ├── BayesianOptimizer.js   # 贝叶斯优化模块
│   ├── FileParser.js       # 文件解析模块
│   └── App.js              # 主应用逻辑
├── deploy.ps1              # PowerShell部署脚本
└── README.md               # 项目说明
```

## 功能模块

### 1. 霍普金森压杆分析
- 材料配比参数输入（气凝胶、混凝土、孔隙率）
- 应变率、冲击压强设置
- 实验数据文件上传（CSV、Excel、PDF）
- 波形信号分析与可视化
- 应力-应变曲线计算
- 能量吸收评估

### 2. 配比优化
- 目标性能参数设定
- 贝叶斯优化算法
- 多目标加权优化
- 置信度评估

### 3. 形貌分析
- SEM图像上传
- 图像编辑工具（裁剪、旋转、标注）
- AI图像分析（需API Key）

### 4. 数字孪生
- 参数滑块交互
- 实时计算模拟
- 三维可视化

### 5. 批量分析
- 参数范围设置
- 多参数组合计算
- 结果汇总图表

### 6. 生成报告
- 自动生成Markdown报告
- 多模块协同分析

## 本地运行

### 方式1：使用本地服务器

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

然后访问: http://localhost:8080

### 方式2：直接打开文件

直接用浏览器打开 `index.html` 文件即可使用大部分功能。

## 部署到GitHub Pages

### 前置条件

1. 安装Git: https://git-scm.com/download/win
2. 创建GitHub账号: https://github.com/join
3. 创建公开仓库: https://github.com/new

### 一键部署

```powershell
cd frontend
.\deploy.ps1 -Username "your-username" -RepoName "your-repo-name"
```

### 手动部署步骤

```powershell
# 1. 进入项目目录
cd frontend

# 2. 初始化Git仓库
git init
git checkout -b gh-pages

# 3. 添加远程仓库
git remote add origin https://github.com/your-username/your-repo-name.git

# 4. 添加文件并提交
git add .
git commit -m "Deploy to GitHub Pages"

# 5. 推送到GitHub
git push -u origin gh-pages
```

### 配置GitHub Pages

1. 打开仓库页面: https://github.com/your-username/your-repo-name
2. 点击 **Settings** → **Pages**
3. 在 **Source** 部分:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. 点击 **Save**

### 访问地址

部署完成后（1-10分钟生效），访问:
```
https://your-username.github.io/your-repo-name/
```

## API Key配置（可选）

部分AI功能需要阿里云API Key:

1. 在页面顶部输入API Key
2. 点击"保存"按钮
3. API Key会保存在浏览器本地存储中

## 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！