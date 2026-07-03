<#
材料性能分析系统 - GitHub Pages部署脚本
#>

param(
    [string]$RepoName = "fbxineng",
    [string]$Username = "xuyb02"
)

$ErrorActionPreference = "Stop"

Write-Host "=" * 60
Write-Host "材料性能分析系统 - GitHub Pages部署脚本"
Write-Host "=" * 60
Write-Host "用户名: $Username"
Write-Host "仓库名: $RepoName"
Write-Host "目标URL: https://$Username.github.io/$RepoName"
Write-Host ""

# 步骤1: 检查环境
Write-Host "步骤1: 检查环境..."

try {
    $gitVersion = git --version
    Write-Host "[OK] Git已安装: $gitVersion"
} catch {
    Write-Host "[FAIL] Git未安装"
    Write-Host "请先安装Git: https://git-scm.com/download/win"
    exit 1
}

# 检查git配置
try {
    $gitName = git config --global user.name
    $gitEmail = git config --global user.email
    
    if ($gitName -and $gitEmail) {
        Write-Host "[OK] Git用户: $gitName"
        Write-Host "[OK] Git邮箱: $gitEmail"
    } else {
        Write-Host "[WARN] Git用户信息未配置"
        Write-Host "建议配置:"
        Write-Host "  git config --global user.name `"Your Name`""
        Write-Host "  git config --global user.email `"your.email@example.com`""
    }
} catch {
    Write-Host "[WARN] 无法检查Git配置"
}

# 步骤2: 进入frontend目录
Write-Host ""
Write-Host "步骤2: 准备部署文件..."

$currentDir = Get-Location
$frontendDir = Join-Path $currentDir "frontend"

if (-not (Test-Path $frontendDir)) {
    Write-Host "[FAIL] frontend目录不存在"
    exit 1
}

Set-Location $frontendDir

# 步骤3: 创建gh-pages分支
Write-Host ""
Write-Host "步骤3: 设置Git仓库..."

if (-not (Test-Path ".git")) {
    Write-Host "[INFO] 初始化Git仓库..."
    git init
    
    Write-Host "[INFO] 创建gh-pages分支..."
    git checkout -b gh-pages
} else {
    Write-Host "[INFO] Git仓库已存在"
    git checkout gh-pages -ErrorAction SilentlyContinue
}

$remoteUrl = "https://github.com/$Username/$RepoName.git"
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote -ne $remoteUrl) {
    Write-Host "[INFO] 添加远程仓库..."
    git remote add origin $remoteUrl 2>$null
    git remote set-url origin $remoteUrl
}

Write-Host "[OK] 远程仓库: $remoteUrl"

# 步骤4: 添加文件并提交
Write-Host ""
Write-Host "步骤4: 提交代码..."

git add .

$commitMsg = "Deploy to GitHub Pages - $RepoName"
git commit -m $commitMsg 2>$null

# 步骤5: 推送到GitHub
Write-Host ""
Write-Host "步骤5: 推送到GitHub..."

try {
    git push -u origin gh-pages
    Write-Host "[OK] 推送成功!"
} catch {
    Write-Host "[FAIL] 推送失败"
    Write-Host "错误信息: $_"
    Write-Host ""
    Write-Host "可能的解决方案:"
    Write-Host "1. 确保仓库已在GitHub创建: https://github.com/new"
    Write-Host "2. 确保有推送权限"
    Write-Host "3. 检查网络连接"
    exit 1
}

# 步骤6: 显示部署信息
Write-Host ""
Write-Host "=" * 60
Write-Host "部署完成!"
Write-Host "=" * 60
Write-Host ""
Write-Host "访问地址: https://$Username.github.io/$RepoName"
Write-Host ""
Write-Host "配置GitHub Pages:"
Write-Host "1. 打开: https://github.com/$Username/$RepoName/settings/pages"
Write-Host "2. 设置 Source: gh-pages 分支, / (root)"
Write-Host "3. 点击 Save"
Write-Host ""
Write-Host "注意: GitHub Pages部署可能需要1-10分钟生效"

Set-Location $currentDir