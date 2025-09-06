# QuickJS FFI Demo

一个基于 QuickJS 的完整 FFI（外部函数接口）演示项目，展示了如何在 JavaScript 中调用 C/C++ 动态库函数，包括基本类型、数组操作和回调函数的完整实现。

## 🚀 项目特性

- **完整类型支持**：整数、浮点数、字符、字符串、指针等基本类型
- **内存管理**：动态内存分配、数组读写操作
- **回调函数**：JavaScript 函数作为回调传递给 C 函数
- **错误处理**：完善的错误检测和诊断信息
- **跨平台**：支持 Linux、macOS、Windows
- **彩色输出**：美观的测试结果显示
- **易扩展**：便于添加新类型、新函数和高阶特性

## 📁 项目结构

```
.
├── CMakeLists.txt         # CMake 构建配置
├── main.cpp               # QuickJS 主程序入口
├── qjs_ffi.cpp            # FFI 模块实现
├── qjs_ffi.h              # FFI 模块头文件
├── libadd.c               # 示例 C 动态库
├── test.js                # 功能测试脚本
├── ffi-wrapper.js         # FFI 封装模块
├── quickjs/               # QuickJS 源码子模块
└── README.md              # 项目说明文档
```

## 🛠️ 构建说明

### 系统要求

- CMake 3.10 或更高版本
- 支持 C++14 的编译器
- libffi 库

### macOS 安装依赖

```bash
# 使用 Homebrew 安装 libffi
brew install libffi

# 或使用 MacPorts
sudo port install libffi
```

### Linux 安装依赖 (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install cmake build-essential libffi-dev
```

### 构建项目

```bash
# 克隆项目及子模块
git clone --recursive https://github.com/your-username/quickjs-ffi.git
cd quickjs-ffi

# 创建构建目录
mkdir build
cd build

# 配置并构建项目
cmake ..
make

# 运行测试
make run_demo
```

## 🧪 功能展示

### 基本类型支持

项目支持完整的 C 类型系统，包括：
- 整数类型：`int8`, `uint8`, `int16`, `uint16`, `int32`, `uint32`, `int64`, `uint64`
- 浮点数类型：`float`, `double`, `longdouble`
- 字符类型：`char`, `uchar`
- 指针类型：`pointer`
- 字符串类型：`string`
- 回调类型：`callback`
- 特殊类型：`void`

### 数组操作

支持在 JavaScript 和 C 之间传递数组：
- 内存分配和释放
- 数组写入和读取
- 各种数据类型支持

### 回调函数

JavaScript 函数可以作为回调函数传递给 C 代码：
- 支持多种参数类型
- 支持返回值
- 自动内存管理

## 📖 使用示例

### 基本用法

```javascript
import {open, symbol, call, close} from 'ffi';

// 打开动态库
const lib = open('./libadd.so');  // Linux
// const lib = open('./libadd.dylib');  // macOS
// const lib = open('./libadd.dll');  // Windows

// 获取函数符号
const addFunc = symbol(lib, 'add');

// 调用函数
const result = call(addFunc, 'int', ['int', 'int'], 10, 20);
console.log(result); // 输出: 30

// 关闭库
close(lib);
```

### 数组操作示例

```javascript
import {open, symbol, call, malloc, free, writeArray, readArray} from 'ffi';

const lib = open('./libadd.so');
const arraySumFunc = symbol(lib, 'array_sum');

// 创建数组
const arr = [1, 2, 3, 4, 5];
const size = arr.length;

// 分配内存
const ptr = malloc(size * 4); // 4 bytes per int

// 写入数组到内存
writeArray(ptr, arr, 'int', size);

// 调用 C 函数
const sum = call(arraySumFunc, 'int', ['pointer', 'int'], ptr, size);
console.log(sum); // 输出: 15

// 释放内存
free(ptr);
close(lib);
```

### 回调函数示例

```javascript
import {open, symbol, call, createCallback} from 'ffi';

const lib = open('./libadd.so');
const testCallbackFunc = symbol(lib, 'test_simple_callback');

// 定义 JavaScript 回调函数
function jsCallback(a, b) {
    console.log(`JS Callback called with: ${a}, ${b}`);
    return a + b;
}

// 创建回调函数指针
const callbackPtr = createCallback(jsCallback, 'int', ['int', 'int']);

// 调用 C 函数并传入回调
const result = call(testCallbackFunc, 'int', ['int', 'int', 'pointer'], 15, 25, callbackPtr);
console.log(result); // 输出: 40

close(lib);
```

## 🧰 API 参考

### FFI 模块函数

| 函数 | 描述 |
|------|------|
| `open(path)` | 打开动态库，返回库句柄 |
| `symbol(handle, name)` | 获取函数符号地址 |
| `call(func_ptr, ret_type, arg_types, ...args)` | 调用 C 函数 |
| `close(handle)` | 关闭动态库 |
| `malloc(size)` | 分配内存 |
| `free(ptr)` | 释放内存 |
| `writeArray(ptr, array, type, count)` | 将 JavaScript 数组写入内存 |
| `readArray(ptr, type, count)` | 从内存读取数组到 JavaScript |
| `createCallback(js_function, return_type, param_types)` | 创建回调函数 |

### 支持的类型

| JavaScript 类型 | C 类型 |
|----------------|--------|
| `int` | `int32_t` |
| `uint` | `uint32_t` |
| `int8` | `int8_t` |
| `uint8` | `uint8_t` |
| `int16` | `int16_t` |
| `uint16` | `uint16_t` |
| `int32` | `int32_t` |
| `uint32` | `uint32_t` |
| `int64` | `int64_t` |
| `uint64` | `uint64_t` |
| `float` | `float` |
| `double` | `double` |
| `longdouble` | `long double` |
| `char` | `char` |
| `uchar` | `unsigned char` |
| `pointer` | `void*` |
| `string` | `const char*` |
| `callback` | 函数指针 |
| `void` | `void` |

## 🐛 故障排除

### 常见问题

1. **找不到 libffi 库**
   - 确保已正确安装 libffi 开发包
   - 在 macOS 上，可能需要设置 PKG_CONFIG_PATH：
     ```bash
     export PKG_CONFIG_PATH="/usr/local/opt/libffi/lib/pkgconfig"
     ```

2. **动态库加载失败**
   - 检查动态库文件是否存在
   - 确认动态库架构与系统匹配
   - 在 Linux 上检查 LD_LIBRARY_PATH 设置

3. **符号未找到**
   - 确认函数名拼写正确
   - 检查函数是否已导出（使用 `nm` 或 `objdump` 命令）

### 调试技巧

- 使用 `console.log` 输出调试信息
- 在 C 代码中添加 `printf` 调试语句
- 使用系统工具检查动态库：
  ```bash
  # macOS
  nm -gU libadd.dylib
  
  # Linux
  nm -D libadd.so
  ```

## 📄 许可证

本项目基于 MIT 许可证发布。有关详细信息，请参阅 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request