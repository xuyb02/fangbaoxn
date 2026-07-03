# 材料性能分析系统 - 部署指南

## 部署前检查

### 功能测试结果

```
测试总数: 23
通过: 22
失败: 0
警告: 1 (CORS - 纯静态网站正常)
```

所有功能模块完整，可以进行部署。

---

## 部署方案

### 方案一：阿里云OSS静态网站（推荐）

#### 1. 创建OSS Bucket

1. 登录阿里云控制台：https://oss.console.aliyun.com
2. 创建Bucket：
   - Bucket名称：`material-analysis`
   - 地域：`cn-hangzhou`（或就近选择）
   - 读写权限：`公共读`

#### 2. 配置静态网站

1. 在Bucket管理页面，点击 **基础设置** → **静态网站托管**
2. 启用静态网站托管：
   - 索引文档：`index.html`
   - 错误文档：`index.html`（SPA路由支持）

#### 3. 配置CORS

1. 点击 **权限管理** → **跨域设置**
2. 添加规则：
   - 来源：`*`
   - 允许Methods：`GET, HEAD`
   - 允许Headers：`*`
   - 暴露Headers：`ETag`
   - 过期时间：`3600`

#### 4. 上传文件

```powershell
# 安装阿里云CLI
pip install aliyuncli

# 配置阿里云CLI
aliyun configure

# 上传文件
aliyun oss cp . oss://material-analysis --recursive
```

#### 5. 配置自定义域名

1. 点击 **域名管理** → **绑定自定义域名**
2. 输入域名：`xyb-resume.xyz`
3. 配置CNAME解析：
   - 记录类型：`CNAME`
   - 记录值：`material-analysis.oss-cn-hangzhou.aliyuncs.com`

#### 6. 配置HTTPS

1. 申请SSL证书（阿里云免费证书）
2. 在域名管理中启用HTTPS

---

### 方案二：阿里云ECS + Nginx

#### 1. 连接ECS

```bash
ssh root@your-ecs-ip
```

#### 2. 安装Nginx

```bash
# CentOS/RHEL
yum install nginx -y
systemctl start nginx
systemctl enable nginx

# Ubuntu/Debian
apt update
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

#### 3. 创建网站目录

```bash
mkdir -p /var/www/material-analysis
```

#### 4. 上传文件

```powershell
# 在本地执行
scp -r frontend/* root@your-ecs-ip:/var/www/material-analysis/
```

#### 5. 配置Nginx

```bash
# 复制配置文件
scp nginx.conf root@your-ecs-ip:/etc/nginx/conf.d/material-analysis.conf
```

**配置文件路径**: `nginx.conf`

#### 6. 申请SSL证书

```bash
# 使用Let's Encrypt
apt install certbot python3-certbot-nginx -y
certbot --nginx -d xyb-resume.xyz -d www.xyb-resume.xyz
```

#### 7. 重启Nginx

```bash
systemctl restart nginx
```

---

### 方案三：GitHub Pages

#### 1. 创建仓库

1. 登录GitHub：https://github.com
2. 创建公开仓库：`fbxineng`

#### 2. 部署

```powershell
cd frontend

git init
git checkout -b gh-pages
git remote add origin https://github.com/xuyb02/fbxineng.git

git add .
git commit -m "Deploy to GitHub Pages"
git push -u origin gh-pages
```

#### 3. 配置Pages

1. 打开仓库设置：`https://github.com/xuyb02/fbxineng/settings/pages`
2. 设置Source：`gh-pages` 分支, `/ (root)`
3. 点击Save

#### 4. 访问

```
https://xuyb02.github.io/fbxineng/
```

---

## 部署后验证

### 运行验证脚本

```powershell
python verify_deployment.py https://xyb-resume.xyz
```

### 手动验证清单

| 验证项 | 方法 |
|--------|------|
| 页面加载 | 访问 https://xyb-resume.xyz |
| 样式加载 | 检查页面样式是否正常显示 |
| 脚本加载 | 打开浏览器开发者工具检查控制台 |
| 霍普金森分析 | 输入参数，点击计算 |
| 配比优化 | 输入目标参数，执行优化 |
| 数字孪生 | 拖动滑块，运行模拟 |
| 图表显示 | 检查Chart.js图表是否渲染 |
| 文件上传 | 上传CSV文件测试 |
| 报告生成 | 完成分析后生成报告 |

### 性能指标

| 指标 | 目标值 |
|------|--------|
| 页面加载时间 | < 3秒 |
| 资源加载时间 | < 1秒 |
| 功能响应时间 | < 2秒 |
| 可用性 | 99.9% |

---

## 故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 404错误 | 路径配置错误 | 检查Nginx/OSS配置 |
| CSS样式不显示 | 文件路径错误 | 检查相对路径 |
| JavaScript错误 | 脚本加载顺序 | 检查script标签顺序 |
| 图表不渲染 | Chart.js未加载 | 检查CDN链接 |
| 文件上传失败 | CORS配置 | 检查跨域设置 |

### 日志查看

```bash
# Nginx日志
tail -f /var/log/nginx/material-analysis.error.log

# OSS访问日志
在阿里云OSS控制台查看
```

---

## 监控与维护

### 监控建议

1. **阿里云云监控**：配置站点可用性监控
2. **CDN监控**：配置CDN访问监控
3. **浏览器监控**：使用Google Analytics

### 维护计划

- 定期更新依赖库版本
- 定期备份配置文件
- 定期检查安全漏洞
- 定期优化页面性能

---

## 回滚方案

### OSS部署

```bash
# 备份当前版本
aliyun oss cp oss://material-analysis oss://material-analysis-backup --recursive

# 回滚到备份
aliyun oss cp oss://material-analysis-backup oss://material-analysis --recursive
```

### ECS部署

```bash
# 备份当前版本
tar -czf /var/www/material-analysis-backup.tar.gz /var/www/material-analysis

# 回滚
tar -xzf /var/www/material-analysis-backup.tar.gz -C /
systemctl restart nginx
```

---

## 部署清单

- [ ] 创建OSS Bucket或ECS实例
- [ ] 配置静态网站托管
- [ ] 配置CORS
- [ ] 上传网站文件
- [ ] 配置自定义域名
- [ ] 配置HTTPS
- [ ] 运行部署验证脚本
- [ ] 手动验证所有功能
- [ ] 配置监控告警