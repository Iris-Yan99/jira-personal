# Newman 最佳实践参考文档

## 1. Collection 组织结构

### 基本原则
- **按功能模块分组**：将相关的 API 请求组织在同一文件夹下
- **清晰的命名规范**：使用英文描述性名称，避免特殊字符
- **层级结构合理**：不超过 3-4 层嵌套

### 推荐结构
```
Collection/
├── Authentication/          # 认证相关
│   ├── Login/
│   ├── Refresh Token/
│   └── Logout/
├── Users/                  # 用户管理
│   ├── User CRUD/
│   └── User Roles/
├── Products/               # 产品管理
│   ├── Product CRUD/
│   └── Product Categories/
├── Orders/                 # 订单管理
│   ├── Order Creation/
│   ├── Order Status/
│   └── Order History/
└── Reports/                # 报表统计
    ├── Sales Reports/
    └── Analytics/
```

### 命名约定
- 使用 PascalCase 命名文件夹和请求
- 请求描述使用动词开头（Create User, Get Product List）
- 保持一致的命名风格

## 2. 变量管理

### 变量优先级（从高到低）
1. **环境变量** - Environment-specific values
2. **集合变量** - Collection-wide values
3. **全局变量** - Global values across all collections
4. **数据文件变量** - Test data iteration values

### 变量使用场景

| 变量类型 | 适用场景 | 生命周期 | 优先级 |
|---------|---------|---------|-------|
| Environment | 不同环境配置（dev/staging/prod） | 持久化 | 最高 |
| Collection | 公共参数、API endpoints | 持久化 | 高 |
| Global | 公共认证 token、时间戳 | 持久化 | 中 |
| Data | 测试数据集 | 运行时动态 | 低 |

### 变量示例

**Environment Variables:**
```json
{
  "base_url": "https://api.example.com",
  "api_version": "v1",
  "timeout": 5000
}
```

**Collection Variables:**
```json
{
  "default_timeout": 30000,
  "retry_count": 3,
  "user_id_prefix": "usr_"
}
```

## 3. 脚本执行流程

### 执行顺序
```
请求开始
├── 解析变量
│   ├── Environment Variables
│   ├── Collection Variables
│   ├── Global Variables
│   └── Data Variables
├── Pre-request Scripts
│   ├── 按请求顺序执行
│   ├── 可以修改变量
│   └── 可以发送其他请求
├── 发送 HTTP 请求
├── 接收响应
└── Tests Scripts
    ├── 按请求顺序执行
    ├── 可以使用 response 对象
    └── 可以修改变量
```

### Pre-request Script 示例

```javascript
// 生成当前时间戳
pm.globals.set("timestamp", Date.now());

// 生成随机字符串
pm.globals.set("random_string", Math.random().toString(36).substring(2, 8));

// 设置请求头
pm.request.headers.add({
    key: 'X-Request-ID',
    value: pm.variables.get("timestamp")
});

// 从上一个请求获取 token
const loginResponse = pm.environment.get("loginResponse");
if (loginResponse) {
    pm.request.headers.add({
        key: 'Authorization',
        value: `Bearer ${loginResponse.token}`
    });
}

// 动态设置 URL
const userId = pm.variables.get("user_id");
pm.request.url = pm.request.url + "/" + userId;
```

### Tests Script 示例

```javascript
// 基础断言
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// 响应时间断言
pm.test("Response time is less than 1000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});

// JSON 数据断言
const responseJson = pm.response.json();
pm.test("User email is correct", function () {
    pm.expect(responseJson.email).to.equal("test@example.com");
});

// 响应头断言
pm.test("Content-Type is application/json", function () {
    pm.response.to.have.header("Content-Type", "application/json");
});

// 复杂数据验证
pm.test("Array has expected length", function () {
    const products = pm.response.json().products;
    pm.expect(products).to.be.an('array');
    pm.expect(products).to.have.length.above(0);

    // 验证每个产品都有必需字段
    products.forEach((product, index) => {
        pm.expect(product).to.have.property('id');
        pm.expect(product).to.have.property('name');
        pm.expect(product).to.have.property('price');
    });
});

// 存储变量供后续使用
const newUserId = pm.response.json().id;
pm.environment.set("new_user_id", newUserId);
```

## 4. 请求链接与数据驱动

### 请求链接示例

```javascript
// 在 Test Script 中存储 token
pm.environment.set("auth_token", pm.response.json().access_token);

// 在下一个请求的 Authorization 头中使用
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get("auth_token")
});
```

### 数据驱动测试

**CSV 数据文件格式:**
```csv
username,password,expected_status
admin,password123,200
user,user123,200
invalid_user,invalid,401
```

**Pre-request Script 使用数据:**
```javascript
// 获取数据文件中的值
const username = pm.iterationData.get("username");
const password = pm.iterationData.get("password");

// 设置请求体
pm.request.body = {
    mode: 'raw',
    raw: JSON.stringify({
        username: username,
        password: password
    })
};
```

**Test Script 验证数据:**
```javascript
pm.test(`Login for ${username} should return ${pm.iterationData.get("expected_status")}`, function () {
    pm.expect(pm.response.code).to.equal(parseInt(pm.iterationData.get("expected_status")));
});
```

### 链式请求示例

```javascript
// 第一个请求创建用户
pm.sendRequest({
    url: pm.environment.get("base_url") + "/users",
    method: "POST",
    body: {
        name: pm.variables.get("random_string"),
        email: pm.variables.get("random_string") + "@example.com"
    }
}).then(response => {
    const userId = response.json().id;
    pm.environment.set("new_user_id", userId);

    // 第二个请求使用新创建的用户ID
    return pm.sendRequest({
        url: pm.environment.get("base_url") + "/users/" + userId + "/profile",
        method: "GET"
    });
}).then(response => {
    // 验证第二个请求
    pm.test("User profile retrieved successfully", function () {
        pm.expect(response.json()).to.have.property('user_id');
    });
});
```

## 5. JSON Schema 验证

### 安装 Ajv
```bash
npm install -g ajv-cli
```

### JSON Schema 示例

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "pattern": "^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$"
        },
        "email": {
            "type": "string",
            "format": "email"
        },
        "age": {
            "type": "integer",
            "minimum": 0,
            "maximum": 150
        },
        "active": {
            "type": "boolean"
        },
        "tags": {
            "type": "array",
            "items": {
                "type": "string"
            }
        }
    },
    "required": ["id", "email"]
}
```

### 使用 Ajv 验证

**在 Postman 中添加 Tests Script:**
```javascript
// 加载 JSON Schema
const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "id": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "age": { "type": "integer", "minimum": 0 }
    },
    "required": ["id", "email"]
};

// 使用 Ajv 验证
const Ajv = require('ajv');
const ajv = new Ajv();
const validate = ajv.compile(schema);
const valid = validate(pm.response.json());

pm.test("Response matches JSON Schema", function () {
    pm.expect(valid, `Schema validation failed: ${JSON.stringify(validate.errors)}`).to.be.true;
});

// 详细错误信息
if (!valid) {
    console.log("Validation errors:", validate.errors);
}
```

**使用 Newman CLI 验证:**
```bash
newman run collection.json -e environment.json \
  --reporters cli,junit \
  --reporter-junit-export junit-report.xml \
  --script test-script.js
```

## 6. Newman CLI 完整命令

### 基本命令
```bash
# 运行集合
newman run <collection-file-or-url>

# 使用环境文件
newman run collection.json -e environment.json

# 指定变量
newman run collection.json --env-var key=value

# 运行迭代
newman run collection.json -d data.csv

# 生成报告
newman run collection.json --reporters cli,json,html \
  --reporter-json-export report.json \
  --reporter-html-export report.html
```

### 高级选项
```bash
# 超时设置
newman run collection.json --timeout-request 10000 \
  --timeout-script 5000 \
  --timeout-global 30000

# 重试策略
newman run collection.json --iteration-count 5 \
  --delay-request 1000 \
  --delay-global 2000

# 导出导入
newman run collection.json --export-environment exported-env.json

newman run collection.json --import-environment imported-env.json

# 调试选项
newman run collection.json --verbose \
  --silent \
  --color on \
  --no-color \
  --ignore-redirects

# 环境和变量
newman run collection.json --environment environment.json \
  --env-var host=https://staging.example.com \
  --global-var token=12345

# 报告选项
newman run collection.json \
  --reporters cli,html,json,junit \
  --reporter-html-export html-report.html \
  --reporter-json-export json-report.json \
  --reporter-junit-export junit-report.xml

# 平台选项
newman run collection.json --insecure \
  --ssl-client-key client.key \
  --ssl-client-cert client.crt

# 持久化数据
newman run collection.json --export-global global.json \
  --export-collection exported-collection.json

# 网络选项
newman run collection.json --proxy http://proxy.example.com:8080 \
  --proxy-auth username:password \
  --cookie-jar cookies.json
```

### 完整命令示例
```bash
newman run "https://api.getpostman.com/collections/123456" \
  -e ./environments/development.json \
  -d ./test-data/users.csv \
  --env-var api_version=v2 \
  --global-var test_run_id=$(uuidgen) \
  --timeout-request 15000 \
  --timeout-script 10000 \
  --iteration-count 10 \
  --delay-request 500 \
  --reporters cli,html,json,junit \
  --reporter-html-export ./reports/$(date +%Y%m%d_%H%M%S)_report.html \
  --reporter-json-export ./reports/$(date +%Y%m%d_%H%M%S)_report.json \
  --reporter-junit-export ./reports/$(date +%Y%m%d_%H%M%S)_junit.xml \
  --export-global ./reports/$(date +%Y%m%d_%H%M%S)_global.json \
  --export-environment ./reports/$(date +%Y%m%d_%H%M%S)_env.json \
  --verbose
```

## 7. Newman 的局限性

### 功能限制
1. **异步处理**：不支持真正的异步请求，需要使用回调或 Promise
2. **环境隔离**：所有运行在同一个 Node.js 进程中
3. **内存使用**：大数据集可能导致内存溢出
4. **并发控制**：有限的并发执行能力
5. **调试能力**：错误堆栈信息有限
6. **第三方库**：需要手动安装和配置

### 替代方案

| 场景 | Newman | 替代方案 |
|------|--------|---------|
| 复杂测试逻辑 | 有限支持 | Jest, Mocha |
| 并发执行 | 有限支持 | TestCafe, Cypress |
| 性能测试 | 不适合 | JMeter, K6 |
| 可视化报告 | 基础 | Postman UI, Allure |
| 持续集成 | 手动配置 | GitHub Actions, Jenkins |
| API 监控 | 不支持 | Datadog, New Relic |

### 克服限制的方法

1. **模块化测试**：将复杂逻辑拆分为多个测试
2. **使用外部脚本**：通过 `child_process` 调用其他工具
3. **数据分片**：分批处理大数据集
4. **缓存机制**：避免重复请求相同资源
5. **错误处理**：完善的 try-catch 和错误恢复机制

## 8. 分层执行策略

### 分层测试架构

| 层级 | 测试类型 | 工具 | 执行频率 | 重点关注 |
|------|---------|------|---------|---------|
| Unit | 单元测试 | Jest/Mocha | 每次提交 | 代码逻辑 |
| Integration | 集成测试 | Newman + 环境隔离 | 每次构建 | 接口交互 |
| End-to-End | 端到端测试 | TestCafe/Cypress | 每日/每次发布 | 用户流程 |
| Performance | 性能测试 | K6/JMeter | 每周/每月 | 响应时间 |
| Security | 安全测试 | OWASP ZAP | 定期 | 安全漏洞 |

### Newman 执行策略

#### 策略 1: 快速回归测试
```bash
# 仅运行核心 API
newman run collection.json --folder "Authentication,Users,Products" \
  --env-var env=staging \
  --iteration-count 1

# 期望执行时间: < 5 分钟
# 覆盖率: 60-70%
```

#### 策略 2: 完整回归测试
```bash
# 运行所有 API，使用测试数据
newman run collection.json -e full_test_env.json -d test_data.csv \
  --iteration-count 5

# 期望执行时间: 10-30 分钟
# 覆盖率: 90-95%
```

#### 策略 3: 性能基准测试
```bash
# 并发执行多个请求
newman run collection.json --delay-request 0 \
  --timeout-request 5000 \
  --reporters cli,html,json \
  --reporter-json-export performance.json

# 分析响应时间和成功率
```

#### 策略 4: 数据验证测试
```bash
# 仅验证数据一致性和完整性
newman run collection.json --folder "Data Validation" \
  --global-var test_mode=data_integrity \
  --export-data ./exported_data/

# 验证数据库一致性
```

### 执行脚本示例

**run-tests.sh:**
```bash
#!/bin/bash

ENV=${1:-staging}
ITERATION=${2:-1}

echo "Running API tests with environment: $ENV, iterations: $ITERATION"

# 清理之前的报告
mkdir -p reports
rm -f reports/*

# 执行测试
newman run "./collections/api-tests.json" \
  -e "./environments/$ENV.json" \
  -d "./test-data/test-$ITERATION.csv" \
  --iteration-count $ITERATION \
  --delay-request 500 \
  --timeout-request 10000 \
  --timeout-script 5000 \
  --reporters cli,html,json,junit \
  --reporter-html-export "reports/report-$ENV-$ITERATION.html" \
  --reporter-json-export "reports/report-$ENV-$ITERATION.json" \
  --reporter-junit-export "reports/junit-$ENV-$ITERATION.xml" \
  --export-global "reports/global-$ITERATION.json" \
  --verbose

# 检查结果
if [ $? -eq 0 ]; then
    echo "✅ Tests passed successfully"
    # 可以在这里添加成功后的处理，如发送通知等
else
    echo "❌ Tests failed"
    # 发送失败通知
    curl -X POST -H "Content-Type: application/json" \
      -d '{"text": "API tests failed! See: http://jenkins.example.com"}' \
      $SLACK_WEBHOOK
fi
```

## 9. 常见问题

### 问题 1: 环境变量不生效
**症状**: 变量在测试中显示为 `undefined`

**解决方案**:
```javascript
// 检查变量是否设置
console.log(pm.variables.get("variable_name"));
console.log(pm.environment.get("variable_name"));

// 使用 try-catch
try {
    const value = pm.variables.get("variable_name");
    if (!value) {
        throw new Error("Variable is undefined");
    }
    // 使用变量
} catch (error) {
    console.log("Variable error:", error.message);
}
```

### 问题 2: 请求超时
**症状**: 请求长时间无响应，测试失败

**解决方案**:
```javascript
// 在 Test Script 中设置更长超时
pm.test("Request should not timeout", function () {
    pm.expect(pm.response.responseTime).to.be.below(30000);
});

// 增加全局超时
newman run collection.json --timeout-request 30000

// 实现重试机制
const retry = (fn, maxRetries = 3) => {
    return new Promise((resolve, reject) => {
        const attempt = (retryCount) => {
            fn().then(resolve).catch((error) => {
                if (retryCount < maxRetries) {
                    console.log(`Retry ${retryCount + 1}/${maxRetries}`);
                    setTimeout(() => attempt(retryCount + 1), 1000);
                } else {
                    reject(error);
                }
            });
        };
        attempt(0);
    });
};

// 使用重试
retry(() => pm.sendRequest(request))
    .then(response => {
        pm.test("Request succeeded after retries", () => {
            pm.expect(response.code).to.equal(200);
        });
    })
    .catch(error => {
        pm.test("Request failed after retries", () => {
            pm.expect.fail(error.message);
        });
    });
```

### 问题 3: 数据驱动测试失败
**症状**: CSV 文件中的数据无法正确读取

**解决方案**:
```javascript
// 检查迭代数据
console.log("Iteration data:", pm.iterationData.getNames());
console.log("Current iteration:", pm.iterationData.get("username"));

// 处理缺失字段
const username = pm.iterationData.get("username") || "default_user";
const password = pm.iterationData.get("password") || "default_password";

// 验证数据格式
pm.test("Username is valid", () => {
    const username = pm.iterationData.get("username");
    pm.expect(username).to.be.a("string");
    pm.expect(username.length).to.be.at.least(3);
});

// 处理空值
const optionalValue = pm.iterationData.get("optional_field") || "default_value";
```

### 问题 4: 认证 token 过期
**症状**: 401 Unauthorized 错误

**解决方案**:
```javascript
// 自动刷新 token
const refreshToken = async () => {
    try {
        const response = await pm.sendRequest({
            url: pm.environment.get("base_url") + "/refresh",
            method: "POST",
            body: {
                refresh_token: pm.environment.get("refresh_token")
            }
        });

        const newToken = response.json().access_token;
        pm.environment.set("access_token", newToken);
        pm.environment.set("refresh_token", response.json().refresh_token);

        return newToken;
    } catch (error) {
        console.log("Failed to refresh token:", error);
        throw new Error("Authentication failed");
    }
};

// 使用请求拦截器
const originalSendRequest = pm.sendRequest;
pm.sendRequest = async (request) => {
    // 检查是否需要认证
    const needsAuth = request.url.includes("/protected");

    if (needsAuth) {
        // 检查 token 是否存在
        let token = pm.environment.get("access_token");

        // 验证 token 有效性（简单检查）
        if (!token || token.includes("expired")) {
            await refreshToken();
            token = pm.environment.get("access_token");
        }

        // 添加认证头
        request.headers.add({
            key: "Authorization",
            value: `Bearer ${token}`
        });
    }

    return originalSendRequest(request);
};
```

### 问题 5: 并发请求冲突
**症状**: 请求间相互干扰，数据不一致

**解决方案**:
```javascript
// 使用唯一标识符
const uniqueId = pm.variables.get("unique_id") || Date.now();
pm.environment.set("test_run_id", uniqueId);

// 确保请求独立性
pm.test("Response is unique", () => {
    const responseId = pm.response.json().id;
    pm.expect(responseId).to.include(uniqueId);
});

// 使用隔离的测试数据
const testData = {
    name: `User_${uniqueId}`,
    email: `user_${uniqueId}@example.com`,
    id: `usr_${uniqueId}`
};

pm.request.body = {
    mode: "raw",
    raw: JSON.stringify(testData)
};
```

### 问题 6: 内存溢出
**症状**: 大数据集测试时内存不足

**解决方案**:
```bash
# 分批执行
for i in {1..10}; do
    newman run collection.json -d "batch_$i.csv" \
      --iteration-count 100 \
      --export-global "batch_$i_global.json"
done

# 使用流式处理
newman run collection.json -d large_dataset.csv \
  --delay-request 1000 \
  --timeout-request 5000
```

### 问题 7: 报告生成失败
**症状**: 报告文件生成失败或损坏

**解决方案**:
```javascript
// 确保目录存在
const fs = require('fs');
const path = './reports';
if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
}

// 正确的导出路径
const reportPath = path + '/report-' + Date.now() + '.json';

// 处理报告生成错误
try {
    // 生成报告代码
} catch (error) {
    console.log("Report generation failed:", error);
    pm.test("Failed to generate report", () => {
        pm.expect.fail("Report generation failed");
    });
}
```

## 最佳实践总结

1. **保持测试独立性**：每个测试都应该可以独立运行
2. **使用唯一测试数据**：避免测试间的数据冲突
3. **完善的错误处理**：优雅地处理各种异常情况
4. **自动化报告生成**：标准化测试报告格式
5. **版本控制管理**：跟踪集合和环境的变化
6. **定期维护**：更新过时的 API 和测试数据
7. **性能监控**：跟踪测试执行时间和资源使用
8. **团队协作**：建立统一的测试标准和流程

## 参考资料

- [Postman 官方文档](https://learning.postman.com/docs/)
- [Newman CLI 文档](https://github.com/postmanlabs/newman)
- [Ajv JSON Schema 验证器](https://ajv.js.org/)
- [JSON Schema 规范](https://json-schema.org/)