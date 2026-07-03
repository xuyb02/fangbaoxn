# GitHub Pages部署指南

## 问题说明

阿里云账号当前处于禁用状态（UserDisable），无法使用阿里云OSS进行部署。建议使用GitHub Pages作为替代方案。

## 部署步骤

### 步骤1：创建GitHub仓库

1. 登录GitHub：https://github.com
2. 点击"New repository"创建新仓库
3. 仓库名称建议：`material-analysis` 或 `fbxineng`
4. 设置为**Public**（公开）
5. 勾选"Initialize this repository with a README"
6. 点击"Create repository"

### 步骤2：上传代码到GitHub

```bash
# 进入项目目录
cd d:\桌面\MLP\专业化模型\frontend

# 初始化git仓库
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: Material Analysis System"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/material-analysis.git

# 推送到GitHub
git push -u origin main
```

### 步骤3：配置GitHub Pages

1. 进入仓库主页
2. 点击"Settings"（设置）
3. 在左侧菜单点击"Pages"
4. 在"Source"部分：
   - 选择分支：`main`
   - 选择目录：`/root`
   - 点击"Save"

### 步骤4：等待部署完成

GitHub Pages部署需要1-5分钟，部署完成后会显示：
- 访问地址：`https://你的用户名.github.io/material-analysis`
- 状态：✅ Your site is live at ...

### 步骤5：验证部署

```bash
# 运行验证脚本
python verify_deployment.py https://你的用户名.github.io/material-analysis
```

## 配置自定义域名（可选）

如果希望使用 `xyb-resume.xyz` 域名：

### 方法1：阿里云DNS配置

1. 登录阿里云域名控制台：https://dc.console.aliyun.com
2. 进入域名 `xyb-resume.xyz` 的DNS解析设置
3. 添加CNAME记录：
   - 主机记录：`@` 或 `www`
   - 记录类型：`CNAME`
   - 记录值：`你的用户名.github.io`
   - TTL：默认即可

### 方法2：GitHub仓库配置

1. 在GitHub仓库的Settings -> Pages中
2. 在"Custom domain"输入框中输入：`xyb-resume.xyz`
3. 点击"Save"
4. 启用"Enforce HTTPS"

## 部署脚本

也可以使用PowerShell一键部署脚本：

```powershell
# deploy_github.ps1
$repoName = "material-analysis"
$username = "你的GitHub用户名"

Write-Host "=== GitHub Pages部署 ==="
Write-Host "仓库: $repoName"
Write-Host "用户名: $username"

cd d:\桌面\MLP\专业化模型\frontend

git add .
git commit -m "Deploy to GitHub Pages"
git push origin main

Write-Host ""
Write-Host "部署完成!"
Write-Host "访问地址: https://$username.github.io/$repoName"
```

## 验证命令

```bash
# 本地测试
python -m http.server 8082

# 部署后验证
python verify_deployment.py https://你的用户名.github.io/material-analysis
```

## 注意事项

1. GitHub Pages只支持静态网站，不支持后端代码
2. 我们的项目是纯前端应用，完全兼容GitHub Pages
3. DNS解析可能需要10-30分钟生效
4. HTTPS证书由GitHub自动配置，无需手动申请