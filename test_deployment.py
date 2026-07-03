#!/usr/bin/env python3
"""
材料性能分析系统 - 部署前功能测试脚本
验证所有模块的功能完整性和稳定性
"""

import sys
import os
import json
import urllib.request
import urllib.error


class DeploymentTester:
    """部署测试器"""
    
    def __init__(self, base_url):
        self.base_url = base_url
        self.results = {
            "summary": {},
            "tests": []
        }
    
    def add_test(self, name, status, message, details=None):
        """添加测试结果"""
        self.results["tests"].append({
            "name": name,
            "status": status,
            "message": message,
            "details": details
        })
    
    def test_http_access(self):
        """测试HTTP访问"""
        print("1. 测试HTTP访问...")
        
        try:
            response = urllib.request.urlopen(self.base_url, timeout=10)
            status_code = response.getcode()
            content_length = len(response.read())
            
            if status_code == 200:
                self.add_test("HTTP访问", "pass", f"HTTP {status_code}, 内容长度: {content_length} 字节")
                print(f"   [OK] HTTP访问正常")
            else:
                self.add_test("HTTP访问", "fail", f"HTTP {status_code}")
                print(f"   [FAIL] HTTP状态码异常: {status_code}")
                
        except urllib.error.HTTPError as e:
            self.add_test("HTTP访问", "fail", f"HTTP错误: {e.code}")
            print(f"   [FAIL] HTTP错误: {e.code}")
        except Exception as e:
            self.add_test("HTTP访问", "fail", str(e))
            print(f"   [FAIL] 访问失败: {e}")
    
    def test_resource_load(self):
        """测试资源文件加载"""
        print("\n2. 测试资源文件加载...")
        
        resources = [
            "css/style.css",
            "js/App.js",
            "js/SignalProcessor.js",
            "js/MaterialCalculator.js",
            "js/BayesianOptimizer.js",
            "js/FileParser.js"
        ]
        
        success_count = 0
        total_count = len(resources)
        
        for resource in resources:
            url = f"{self.base_url}/{resource}"
            try:
                response = urllib.request.urlopen(url, timeout=5)
                if response.getcode() == 200:
                    success_count += 1
                    self.add_test(f"资源加载: {resource}", "pass", "加载成功")
                    print(f"   [OK] {resource}")
                else:
                    self.add_test(f"资源加载: {resource}", "fail", f"HTTP {response.getcode()}")
                    print(f"   [FAIL] {resource} - HTTP {response.getcode()}")
            except Exception as e:
                self.add_test(f"资源加载: {resource}", "fail", str(e))
                print(f"   [FAIL] {resource} - {e}")
        
        self.add_test("资源加载汇总", "pass" if success_count == total_count else "partial",
                      f"{success_count}/{total_count} 资源加载成功")
    
    def test_html_structure(self):
        """测试HTML结构"""
        print("\n3. 测试HTML结构...")
        
        try:
            response = urllib.request.urlopen(self.base_url, timeout=10)
            content = response.read().decode('utf-8')
            
            checks = [
                ("页面标题", "<title>" in content),
                ("主容器", '<div class="app-container"' in content),
                ("头部", '<header class="app-header"' in content),
                ("导航", '<nav class="tab-navigation"' in content),
                ("主内容", '<main class="main-content"' in content),
                ("霍普金森面板", 'id="hopkinson-panel"' in content),
                ("优化面板", 'id="optimize-panel"' in content),
                ("形貌面板", 'id="morphology-panel"' in content),
                ("模拟面板", 'id="simulation-panel"' in content),
                ("批量面板", 'id="batch-panel"' in content),
                ("报告面板", 'id="report-panel"' in content),
                ("Chart.js", "chart.js" in content.lower()),
                ("App.js", '<script src="./js/App.js"' in content)
            ]
            
            all_passed = True
            for name, passed in checks:
                if passed:
                    self.add_test(f"HTML结构: {name}", "pass", "存在")
                    print(f"   [OK] {name}")
                else:
                    self.add_test(f"HTML结构: {name}", "fail", "缺失")
                    print(f"   [FAIL] {name}")
                    all_passed = False
            
            if all_passed:
                self.add_test("HTML结构汇总", "pass", "所有关键元素存在")
            
        except Exception as e:
            self.add_test("HTML结构", "fail", str(e))
            print(f"   [FAIL] 解析失败: {e}")
    
    def test_cross_origin(self):
        """测试跨域配置"""
        print("\n4. 测试跨域配置...")
        
        try:
            req = urllib.request.Request(self.base_url, method='OPTIONS')
            response = urllib.request.urlopen(req, timeout=10)
            
            headers = dict(response.headers)
            cors_headers = [k for k in headers if k.lower().startswith('access-control')]
            
            if cors_headers:
                self.add_test("CORS配置", "pass", f"检测到CORS头: {', '.join(cors_headers)}")
                print(f"   [OK] CORS配置正常: {', '.join(cors_headers)}")
            else:
                self.add_test("CORS配置", "warning", "未检测到CORS头（纯静态网站可能不需要）")
                print(f"   [WARN] 未检测到CORS头（纯静态网站可能不需要）")
                
        except Exception as e:
            self.add_test("CORS配置", "warning", str(e))
            print(f"   [WARN] 跨域测试失败: {e}")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("=" * 60)
        print("材料性能分析系统 - 部署前功能测试")
        print("=" * 60)
        print(f"测试目标: {self.base_url}")
        print()
        
        self.test_http_access()
        self.test_resource_load()
        self.test_html_structure()
        self.test_cross_origin()
        
        # 生成汇总
        self.generate_summary()
    
    def generate_summary(self):
        """生成测试汇总"""
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        
        pass_count = sum(1 for t in self.results["tests"] if t["status"] == "pass")
        fail_count = sum(1 for t in self.results["tests"] if t["status"] == "fail")
        warning_count = sum(1 for t in self.results["tests"] if t["status"] == "warning")
        total_count = len(self.results["tests"])
        
        print(f"\n测试总数: {total_count}")
        print(f"通过: {pass_count}")
        print(f"失败: {fail_count}")
        print(f"警告: {warning_count}")
        
        self.results["summary"] = {
            "total": total_count,
            "passed": pass_count,
            "failed": fail_count,
            "warnings": warning_count,
            "overall": "success" if fail_count == 0 else "partial" if warning_count > 0 else "failed"
        }
        
        if fail_count == 0:
            print("\n[PASS] 所有测试通过，可以进行部署")
        else:
            print(f"\n[WARN] {fail_count} 项测试失败，建议修复后再部署")
            
            print("\n失败项详情:")
            for test in self.results["tests"]:
                if test["status"] == "fail":
                    print(f"  - {test['name']}: {test['message']}")
        
        # 保存测试结果
        result_file = "deployment_test_results.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        print(f"\n测试结果已保存到: {result_file}")
        
        return self.results["summary"]["overall"]


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python test_deployment.py <测试URL>")
        print("示例: python test_deployment.py http://localhost:8082")
        sys.exit(1)
    
    base_url = sys.argv[1]
    
    tester = DeploymentTester(base_url)
    result = tester.run_all_tests()
    
    sys.exit(0 if result == "success" else 1)


if __name__ == "__main__":
    main()