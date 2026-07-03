#!/usr/bin/env python3
"""
材料性能分析系统 - 部署后验证脚本
验证系统在目标环境中的稳定性和性能
"""

import sys
import json
import urllib.request
import urllib.error
import time


class DeploymentVerifier:
    """部署验证器"""
    
    def __init__(self, base_url):
        self.base_url = base_url
        self.results = []
    
    def verify(self):
        """执行完整验证"""
        print("=" * 60)
        print("材料性能分析系统 - 部署后验证")
        print("=" * 60)
        print(f"验证目标: {self.base_url}")
        print()
        
        self.verify_accessibility()
        self.verify_performance()
        self.verify_functionality()
        
        self.generate_report()
    
    def verify_accessibility(self):
        """验证可访问性"""
        print("1. 验证可访问性...")
        
        urls = [
            ("主页面", self.base_url),
            ("样式文件", f"{self.base_url}/css/style.css"),
            ("主脚本", f"{self.base_url}/js/App.js"),
            ("信号处理模块", f"{self.base_url}/js/SignalProcessor.js"),
            ("材料计算模块", f"{self.base_url}/js/MaterialCalculator.js"),
            ("贝叶斯优化模块", f"{self.base_url}/js/BayesianOptimizer.js"),
            ("文件解析模块", f"{self.base_url}/js/FileParser.js")
        ]
        
        all_accessible = True
        for name, url in urls:
            try:
                start = time.time()
                response = urllib.request.urlopen(url, timeout=10)
                latency = (time.time() - start) * 1000
                
                if response.getcode() == 200:
                    status = "OK"
                    color = "[OK]"
                else:
                    status = f"HTTP {response.getcode()}"
                    color = "[FAIL]"
                    all_accessible = False
                    
            except Exception as e:
                status = str(e)
                color = "[FAIL]"
                latency = -1
                all_accessible = False
            
            result = {
                "type": "accessibility",
                "name": name,
                "url": url,
                "status": "pass" if "OK" in status else "fail",
                "latency_ms": latency,
                "message": status
            }
            self.results.append(result)
            
            latency_str = f"{latency:.2f}ms" if latency > 0 else "N/A"
            print(f"   {color} {name}: {latency_str}")
        
        if all_accessible:
            print("   [OK] 所有资源可访问")
        else:
            print("   [FAIL] 部分资源不可访问")
    
    def verify_performance(self):
        """验证性能"""
        print("\n2. 验证性能...")
        
        measurements = []
        for i in range(3):
            try:
                start = time.time()
                response = urllib.request.urlopen(self.base_url, timeout=10)
                response.read()
                latency = (time.time() - start) * 1000
                measurements.append(latency)
            except Exception as e:
                measurements.append(-1)
        
        valid_measurements = [m for m in measurements if m > 0]
        
        if valid_measurements:
            avg_latency = sum(valid_measurements) / len(valid_measurements)
            min_latency = min(valid_measurements)
            max_latency = max(valid_measurements)
            
            result = {
                "type": "performance",
                "name": "页面加载性能",
                "average_latency_ms": avg_latency,
                "min_latency_ms": min_latency,
                "max_latency_ms": max_latency,
                "status": "pass" if avg_latency < 3000 else "warning" if avg_latency < 5000 else "fail",
                "message": f"平均延迟: {avg_latency:.2f}ms"
            }
            self.results.append(result)
            
            print(f"   [INFO] 平均延迟: {avg_latency:.2f}ms")
            print(f"   [INFO] 最小延迟: {min_latency:.2f}ms")
            print(f"   [INFO] 最大延迟: {max_latency:.2f}ms")
            
            if avg_latency < 3000:
                print("   [OK] 性能优秀")
            elif avg_latency < 5000:
                print("   [WARN] 性能一般")
            else:
                print("   [FAIL] 性能较差")
        else:
            print("   [FAIL] 无法测量性能")
    
    def verify_functionality(self):
        """验证功能完整性"""
        print("\n3. 验证功能完整性...")
        
        features = [
            {"name": "霍普金森分析", "element": "hopkinson-panel", "required": True},
            {"name": "配比优化", "element": "optimize-panel", "required": True},
            {"name": "形貌分析", "element": "morphology-panel", "required": True},
            {"name": "数字孪生", "element": "simulation-panel", "required": True},
            {"name": "批量分析", "element": "batch-panel", "required": True},
            {"name": "生成报告", "element": "report-panel", "required": True},
            {"name": "波形图表", "element": "waveform-chart", "required": True},
            {"name": "应力应变图表", "element": "stress-strain-chart", "required": True},
            {"name": "Chart.js", "check": "chart.js", "required": True},
            {"name": "SheetJS", "check": "xlsx", "required": True},
            {"name": "Marked", "check": "marked", "required": True}
        ]
        
        try:
            response = urllib.request.urlopen(self.base_url, timeout=10)
            content = response.read().decode('utf-8')
            
            for feature in features:
                found = False
                
                if "element" in feature:
                    found = f'id="{feature["element"]}"' in content
                elif "check" in feature:
                    found = feature["check"] in content.lower()
                
                status = "pass" if found else "fail"
                result = {
                    "type": "functionality",
                    "name": feature["name"],
                    "required": feature["required"],
                    "status": status,
                    "message": "存在" if found else "缺失"
                }
                self.results.append(result)
                
                color = "[OK]" if found else "[FAIL]"
                print(f"   {color} {feature['name']}")
            
            print("   [OK] 功能验证完成")
            
        except Exception as e:
            print(f"   [FAIL] 功能验证失败: {e}")
    
    def generate_report(self):
        """生成验证报告"""
        print("\n" + "=" * 60)
        print("验证报告")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r.get("status") == "pass")
        failed = sum(1 for r in self.results if r.get("status") == "fail")
        warnings = sum(1 for r in self.results if r.get("status") == "warning")
        
        print(f"\n验证项: {len(self.results)}")
        print(f"通过: {passed}")
        print(f"失败: {failed}")
        print(f"警告: {warnings}")
        
        overall_status = "success" if failed == 0 else "partial" if warnings > 0 else "failed"
        
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "base_url": self.base_url,
            "overall_status": overall_status,
            "summary": {
                "total": len(self.results),
                "passed": passed,
                "failed": failed,
                "warnings": warnings
            },
            "details": self.results
        }
        
        report_file = "deployment_verification_report.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n验证报告已保存到: {report_file}")
        
        if overall_status == "success":
            print("\n[PASS] 部署验证通过，系统运行正常")
        elif overall_status == "partial":
            print("\n[WARN] 部分验证项有警告，建议检查")
        else:
            print("\n[FAIL] 部署验证失败，需要修复")
        
        return overall_status


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python verify_deployment.py <目标URL>")
        print("示例: python verify_deployment.py https://xyb-resume.xyz")
        sys.exit(1)
    
    base_url = sys.argv[1]
    
    verifier = DeploymentVerifier(base_url)
    result = verifier.verify()
    
    sys.exit(0 if result == "success" else 1)


if __name__ == "__main__":
    main()