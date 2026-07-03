<#
材料性能分析系统 - 阿里云OSS部署脚本
目标域名: xyb-resume.xyz
#>

param(
    [string]$BucketName = "material-analysis",
    [string]$Region = "cn-hangzhou",
    [string]$Domain = "xyb-resume.xyz",
    [string]$AccessKeyId,
    [string]$AccessKeySecret
)

$ErrorActionPreference = "Stop"

Write-Host "=" * 60
Write-Host "材料性能分析系统 - 阿里云OSS部署脚本"
Write-Host "=" * 60
Write-Host "Bucket名称: $BucketName"
Write-Host "地域: $Region"
Write-Host "目标域名: $Domain"
Write-Host ""

# 步骤1: 检查阿里云CLI
Write-Host "步骤1: 检查阿里云CLI..."

try {
    $version = aliyun --version 2>$null
    if ($version) {
        Write-Host "[OK] 阿里云CLI已安装"
    } else {
        Write-Host "[INFO] 阿里云CLI未安装，正在安装..."
        pip install aliyuncli aliyun-python-sdk-core-v3 2>$null
        
        $version = aliyun --version 2>$null
        if ($version) {
            Write-Host "[OK] 阿里云CLI安装成功"
        } else {
            Write-Host "[FAIL] 阿里云CLI安装失败"
            Write-Host "请手动安装: pip install aliyuncli aliyun-python-sdk-core-v3"
            exit 1
        }
    }
} catch {
    Write-Host "[FAIL] 检查阿里云CLI失败: $_"
    exit 1
}

# 步骤2: 配置阿里云CLI
Write-Host ""
Write-Host "步骤2: 配置阿里云CLI..."

if ($AccessKeyId -and $AccessKeySecret) {
    Write-Host "[INFO] 使用提供的AccessKey配置..."
    $env:ALIBABA_CLOUD_ACCESS_KEY_ID = $AccessKeyId
    $env:ALIBABA_CLOUD_ACCESS_KEY_SECRET = $AccessKeySecret
} else {
    Write-Host "[INFO] 检查已有配置..."
    $config = aliyun configure get 2>$null
    if (-not $config) {
        Write-Host "[INFO] 需要配置阿里云CLI"
        Write-Host "请执行: aliyun configure"
        Write-Host "或提供参数: -AccessKeyId xxx -AccessKeySecret xxx"
        exit 1
    }
}

# 步骤3: 创建Bucket（如不存在）
Write-Host ""
Write-Host "步骤3: 检查Bucket..."

try {
    $bucketInfo = aliyun oss ls oss://$BucketName 2>$null
    if ($bucketInfo) {
        Write-Host "[OK] Bucket已存在: $BucketName"
    } else {
        Write-Host "[INFO] 创建Bucket: $BucketName"
        aliyun oss mb oss://$BucketName --region $Region
        
        Write-Host "[INFO] 设置Bucket为公共读"
        aliyun oss bucket-acl set oss://$BucketName --acl public-read
    }
} catch {
    Write-Host "[FAIL] Bucket操作失败: $_"
    exit 1
}

# 步骤4: 配置静态网站托管
Write-Host ""
Write-Host "步骤4: 配置静态网站托管..."

try {
    aliyun oss website set oss://$BucketName --index index.html --error index.html
    Write-Host "[OK] 静态网站托管配置完成"
} catch {
    Write-Host "[FAIL] 静态网站配置失败: $_"
}

# 步骤5: 配置CORS
Write-Host ""
Write-Host "步骤5: 配置CORS..."

try {
    $corsConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3600</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>
"@
    
    $corsFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $corsFile -Value $corsConfig -Encoding UTF8
    
    aliyun oss cors put oss://$BucketName --cors-file "$corsFile"
    Remove-Item $corsFile -Force
    
    Write-Host "[OK] CORS配置完成"
} catch {
    Write-Host "[FAIL] CORS配置失败: $_"
}

# 步骤6: 上传文件
Write-Host ""
Write-Host "步骤6: 上传文件到OSS..."

try {
    $currentDir = Get-Location
    Set-Location $PSScriptRoot
    
    Write-Host "[INFO] 上传index.html..."
    aliyun oss cp index.html oss://$BucketName/index.html --content-type "text/html" --cache-control "public, max-age=600"
    
    Write-Host "[INFO] 上传css/style.css..."
    aliyun oss cp css/style.css oss://$BucketName/css/style.css --content-type "text/css" --cache-control "public, max-age=31536000"
    
    Write-Host "[INFO] 上传js/App.js..."
    aliyun oss cp js/App.js oss://$BucketName/js/App.js --content-type "application/javascript" --cache-control "public, max-age=31536000"
    
    Write-Host "[INFO] 上传js/SignalProcessor.js..."
    aliyun oss cp js/SignalProcessor.js oss://$BucketName/js/SignalProcessor.js --content-type "application/javascript" --cache-control "public, max-age=31536000"
    
    Write-Host "[INFO] 上传js/MaterialCalculator.js..."
    aliyun oss cp js/MaterialCalculator.js oss://$BucketName/js/MaterialCalculator.js --content-type "application/javascript" --cache-control "public, max-age=31536000"
    
    Write-Host "[INFO] 上传js/BayesianOptimizer.js..."
    aliyun oss cp js/BayesianOptimizer.js oss://$BucketName/js/BayesianOptimizer.js --content-type "application/javascript" --cache-control "public, max-age=31536000"
    
    Write-Host "[INFO] 上传js/FileParser.js..."
    aliyun oss cp js/FileParser.js oss://$BucketName/js/FileParser.js --content-type "application/javascript" --cache-control "public, max-age=31536000"
    
    Set-Location $currentDir
    
    Write-Host "[OK] 文件上传完成"
} catch {
    Write-Host "[FAIL] 文件上传失败: $_"
    exit 1
}

# 步骤7: 验证上传
Write-Host ""
Write-Host "步骤7: 验证上传..."

try {
    $files = aliyun oss ls oss://$BucketName -r
    Write-Host "[OK] Bucket文件列表:"
    Write-Host $files
} catch {
    Write-Host "[FAIL] 验证失败: $_"
}

# 步骤8: 显示配置信息
Write-Host ""
Write-Host "=" * 60
Write-Host "部署完成!"
Write-Host "=" * 60
Write-Host ""
Write-Host "OSS访问地址: http://$BucketName.$Region.oss-website.$Region.aliyuncs.com"
Write-Host ""
Write-Host "下一步配置:"
Write-Host ""
Write-Host "1. 配置自定义域名:"
Write-Host "   - 打开: https://oss.console.aliyun.com"
Write-Host "   - 进入Bucket -> 域名管理 -> 绑定自定义域名"
Write-Host "   - 输入: $Domain"
Write-Host ""
Write-Host "2. 配置DNS解析:"
Write-Host "   - 登录阿里云域名控制台: https://dc.console.aliyun.com"
Write-Host "   - 添加CNAME记录:"
Write-Host "     记录类型: CNAME"
Write-Host "     记录值: $BucketName.$Region.oss-website.$Region.aliyuncs.com"
Write-Host ""
Write-Host "3. 配置HTTPS:"
Write-Host "   - 在域名管理中启用HTTPS"
Write-Host "   - 使用阿里云免费SSL证书"
Write-Host ""
Write-Host "4. 验证部署:"
Write-Host "   python verify_deployment.py https://$Domain"