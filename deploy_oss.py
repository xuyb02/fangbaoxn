#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import argparse
import subprocess

try:
    import oss2
except ImportError:
    print("[ERROR] oss2 SDK未安装，请执行: pip install oss2")
    sys.exit(1)

DEFAULT_CONFIG = {
    "bucket_name": "material-analysis",
    "region": "cn-hangzhou",
    "domain": "xyb-resume.xyz",
    "access_key_id": "",
    "access_key_secret": ""
}


class OSSDeployer:
    def __init__(self, config):
        self.bucket_name = config["bucket_name"]
        self.region = config["region"]
        self.domain = config["domain"]
        self.access_key_id = config["access_key_id"]
        self.access_key_secret = config["access_key_secret"]
        self.endpoint = f"oss-{self.region}.aliyuncs.com"
        self.website_endpoint = f"{self.bucket_name}.oss-{self.region}.aliyuncs.com"
        self.bucket = None

    def connect(self):
        print("[INFO] 连接阿里云OSS...")
        auth = oss2.Auth(self.access_key_id, self.access_key_secret)
        self.bucket = oss2.Bucket(auth, self.endpoint, self.bucket_name)

        try:
            self.bucket.get_bucket_info()
            print(f"[OK] 连接成功，Bucket: {self.bucket_name}")
            return True
        except oss2.exceptions.NoSuchBucket:
            print(f"[INFO] Bucket不存在，创建: {self.bucket_name}")
            self.bucket.create_bucket(oss2.BUCKET_ACL_PUBLIC_READ)
            print(f"[OK] Bucket创建成功")
            return True
        except Exception as e:
            print(f"[FAIL] 连接失败: {e}")
            return False

    def configure_website(self):
        print("[INFO] 配置静态网站托管...")
        try:
            self.bucket.put_bucket_website(oss2.models.PutBucketWebsiteRequest(
                index_file="index.html",
                error_file="index.html"
            ))
            print("[OK] 静态网站托管配置完成")
        except Exception as e:
            print(f"[WARN] 网站配置失败: {e}")

    def configure_cors(self):
        print("[INFO] 配置CORS...")
        cors_config = {
            "CORSRules": [{
                "AllowedOrigin": ["*"],
                "AllowedMethod": ["GET", "HEAD"],
                "AllowedHeader": ["*"],
                "ExposeHeader": ["ETag"],
                "MaxAgeSeconds": 3600
            }]
        }
        try:
            self.bucket.put_bucket_cors(json.dumps(cors_config))
            print("[OK] CORS配置完成")
        except Exception as e:
            print(f"[WARN] CORS配置失败: {e}")

    def configure_acl(self):
        print("[INFO] 设置Bucket ACL为公共读...")
        try:
            self.bucket.put_bucket_acl(oss2.BUCKET_ACL_PUBLIC_READ)
            print("[OK] ACL配置完成")
        except Exception as e:
            print(f"[WARN] ACL配置失败: {e}")

    def upload_file(self, local_path, remote_path, content_type=None):
        print(f"[INFO] 上传: {local_path} -> {remote_path}")

        if not os.path.exists(local_path):
            print(f"[WARN] 文件不存在: {local_path}")
            return False

        try:
            headers = {}
            if content_type:
                headers["Content-Type"] = content_type

            if content_type in ["text/html", "application/javascript", "text/css"]:
                headers["Cache-Control"] = "public, max-age=600"

            with open(local_path, "rb") as f:
                result = self.bucket.put_object(remote_path, f, headers=headers)

            if result.status == 200:
                print(f"[OK] 上传成功")
                return True
            else:
                print(f"[FAIL] 上传失败，状态码: {result.status}")
                return False
        except Exception as e:
            print(f"[FAIL] 上传失败: {e}")
            return False

    def upload_all_files(self):
        print("[INFO] 开始上传所有文件...")
        files_to_upload = [
            ("index.html", "index.html", "text/html"),
            ("css/style.css", "css/style.css", "text/css"),
            ("js/App.js", "js/App.js", "application/javascript"),
            ("js/SignalProcessor.js", "js/SignalProcessor.js", "application/javascript"),
            ("js/MaterialCalculator.js", "js/MaterialCalculator.js", "application/javascript"),
            ("js/BayesianOptimizer.js", "js/BayesianOptimizer.js", "application/javascript"),
            ("js/FileParser.js", "js/FileParser.js", "application/javascript"),
        ]

        success_count = 0
        fail_count = 0

        for local_path, remote_path, content_type in files_to_upload:
            if self.upload_file(local_path, remote_path, content_type):
                success_count += 1
            else:
                fail_count += 1

        print(f"\n[INFO] 上传完成: {success_count}成功, {fail_count}失败")
        return fail_count == 0

    def list_files(self):
        print("[INFO] 列出Bucket中的文件...")
        try:
            for obj in oss2.ObjectIterator(self.bucket):
                print(f"  {obj.key}")
            return True
        except Exception as e:
            print(f"[FAIL] 列出文件失败: {e}")
            return False

    def get_website_url(self):
        return f"http://{self.bucket_name}.oss-{self.region}.aliyuncs.com"

    def run_deployment(self):
        print("=" * 60)
        print("材料性能分析系统 - 阿里云OSS部署")
        print("=" * 60)
        print(f"Bucket: {self.bucket_name}")
        print(f"Region: {self.region}")
        print(f"Domain: {self.domain}")
        print("")

        if not self.connect():
            return False

        self.configure_acl()
        self.configure_website()
        self.configure_cors()

        if not self.upload_all_files():
            return False

        self.list_files()

        print("")
        print("=" * 60)
        print("部署完成!")
        print("=" * 60)
        print("")
        print(f"OSS访问地址: {self.get_website_url()}")
        print("")
        print("下一步配置:")
        print("")
        print("1. 配置自定义域名:")
        print("   - 打开: https://oss.console.aliyun.com")
        print("   - 进入Bucket -> 域名管理 -> 绑定自定义域名")
        print(f"   - 输入: {self.domain}")
        print("")
        print("2. 配置DNS解析:")
        print("   - 登录阿里云域名控制台: https://dc.console.aliyun.com")
        print("   - 添加CNAME记录:")
        print(f"     记录类型: CNAME")
        print(f"     记录值: {self.bucket_name}.oss-cn-{self.region}.aliyuncs.com")
        print("")
        print("3. 配置HTTPS:")
        print("   - 在域名管理中启用HTTPS")
        print("   - 使用阿里云免费SSL证书")
        print("")
        print("4. 验证部署:")
        print(f"   python verify_deployment.py https://{self.domain}")

        return True


def load_config(config_file="oss_config.json"):
    if os.path.exists(config_file):
        with open(config_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_CONFIG


def save_config(config, config_file="oss_config.json"):
    with open(config_file, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="阿里云OSS部署脚本")
    parser.add_argument("--bucket", help="Bucket名称")
    parser.add_argument("--region", help="地域")
    parser.add_argument("--domain", help="自定义域名")
    parser.add_argument("--access-key-id", help="AccessKey ID")
    parser.add_argument("--access-key-secret", help="AccessKey Secret")
    parser.add_argument("--config", default="oss_config.json", help="配置文件路径")

    args = parser.parse_args()

    config = load_config(args.config)

    if args.bucket:
        config["bucket_name"] = args.bucket
    if args.region:
        config["region"] = args.region
    if args.domain:
        config["domain"] = args.domain
    if args.access_key_id:
        config["access_key_id"] = args.access_key_id
    if args.access_key_secret:
        config["access_key_secret"] = args.access_key_secret

    if not config["access_key_id"] or not config["access_key_secret"]:
        print("[ERROR] 请提供阿里云AccessKey")
        print("使用方式:")
        print("  python deploy_oss.py --access-key-id YOUR_KEY --access-key-secret YOUR_SECRET")
        print("或编辑 oss_config.json 文件")
        sys.exit(1)

    save_config(config, args.config)

    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    deployer = OSSDeployer(config)
    success = deployer.run_deployment()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()