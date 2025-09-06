# QuickJS FFI Demo

## Description

本项目演示了如何为 QuickJS 引擎创建一个 C 模块，该模块使用 `libffi` 库来动态调用任意 C 动态库中的函数。这使得 JavaScript 代码可以在运行时决定要调用的 C 函数及其签名。

**核心功能:**
1.  **`libadd.c`**: 一个简单的 C 动态库，导出了 `add(int, int)` 和 `add_double(double, double)` 函数作为测试目标。
2.  **`main.c`**: QuickJS 的宿主程序。它实现了一个名为 `ffi` 的 C 模块，该模块提供了 `open`, `symbol`, `call`, `close` 等 JS 函数，底层封装了 `dlopen` 和 `libffi` 的功能。此程序会加载并执行一个指定的 JS 文件。
3.  **`test.js`**: 使用 `ffi` 模块来加载 `libadd.so`，获取函数指针，并动态调用 C 函数的 JavaScript 脚本。

**系统依赖:**
*   `gcc` (或 `clang`)
*   `git`
*   `make`
*   `libffi-dev` (Debian/Ubuntu) 或 `libffi-devel` (CentOS/Fedora)

---

### File: libadd.c

```c
// libadd.c
// 一个简单的动态库，用于被 JS 调用。
#include <stdio.h>

// __attribute__((visibility("default"))) 确保函数被导出
__attribute__((visibility("default")))
int add(int a, int b) {
    printf("C [add]: called with %d and %d\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
double add_double(double a, double b) {
    printf("C [add_double]: called with %f and %f\n", a, b);
    return a + b;
}
```

---

### File: main.c

```c
// main.c
// QuickJS 宿主程序，集成了 FFI C 模块。
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dlfcn.h>
#include <ffi.h>

#include "quickjs/quickjs.h"
#include "quickjs/quickjs-libc.h"

// 将 JS 传入的类型字符串转换为 ffi_type
static ffi_type* string_to_ffi_type(const char* type_str) {
    if (strcmp(type_str, "int") == 0) return &ffi_type_sint;
    if (strcmp(type_str, "void") == 0) return &ffi_type_void;
    if (strcmp(type_str, "double") == 0) return &ffi_type_double;
    if (strcmp(type_str, "pointer") == 0) return &ffi_type_pointer;
    // ... 可添加更多类型
    return NULL;
}

// JS: FFI.open(path)
static JSValue js_ffi_open(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    const char *path = JS_ToCString(ctx, argv[0]);
    if (!path) return JS_EXCEPTION;
    void *handle = dlopen(path, RTLD_LAZY);
    JS_FreeCString(ctx, path);
    if (!handle) return JS_ThrowTypeError(ctx, "Failed to open library: %s", dlerror());
    return JS_NewInt64(ctx, (int64_t)(uintptr_t)handle);
}

// JS: FFI.symbol(handle, name)
static JSValue js_ffi_symbol(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    int64_t handle_val;
    const char *name = JS_ToCString(ctx, argv[1]);
    if (JS_ToInt64(ctx, &handle_val, argv[0]) || !name) {
        JS_FreeCString(ctx, name);
        return JS_EXCEPTION;
    }
    void *handle = (void*)(uintptr_t)handle_val;
    void *symbol = dlsym(handle, name);
    JS_FreeCString(ctx, name);
    if (!symbol) return JS_ThrowTypeError(ctx, "Failed to find symbol: %s", dlerror());
    return JS_NewInt64(ctx, (int64_t)(uintptr_t)symbol);
}

// JS: FFI.call(func_ptr, ret_type_str, [arg_types_str...], ...args)
static JSValue js_ffi_call(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 3) return JS_ThrowTypeError(ctx, "FFI.call requires at least 3 arguments");

    int64_t func_ptr_val;
    if (JS_ToInt64(ctx, &func_ptr_val, argv[0])) return JS_EXCEPTION;
    void (*func_ptr)(void) = (void (*)(void))(uintptr_t)func_ptr_val;

    const char *ret_type_str = JS_ToCString(ctx, argv[1]);
    ffi_type *rtype = string_to_ffi_type(ret_type_str);
    JS_FreeCString(ctx, ret_type_str);
    if (!rtype) return JS_ThrowTypeError(ctx, "Invalid return type");

    JSValueConst arg_types_js = argv[2];
    if (!JS_IsArray(ctx, arg_types_js)) return JS_ThrowTypeError(ctx, "Argument types must be an array");
    
    JSValue len_val = JS_GetPropertyStr(ctx, arg_types_js, "length");
    uint32_t num_args;
    JS_ToUint32(ctx, &num_args, len_val);
    JS_FreeValue(ctx, len_val);
    
    if ((argc - 3) != num_args) {
        return JS_ThrowTypeError(ctx, "Incorrect number of arguments. Expected %d, got %d", num_args, argc - 3);
    }

    ffi_type **atypes = malloc(sizeof(ffi_type*) * num_args);
    void **avalues = malloc(sizeof(void*) * num_args);
    void *arg_storage = malloc(sizeof(long double) * num_args); // Use large enough storage for any basic type

    for (int i = 0; i < num_args; i++) {
        JSValue type_val = JS_GetPropertyUint32(ctx, arg_types_js, i);
        const char *type_str = JS_ToCString(ctx, type_val);
        atypes[i] = string_to_ffi_type(type_str);
        if (!atypes[i]) { /* ... proper error handling ... */ }

        char* current_arg_ptr = (char*)arg_storage + i * sizeof(long double);
        if (strcmp(type_str, "int") == 0) {
            JS_ToInt32(ctx, (int32_t*)current_arg_ptr, argv[3 + i]);
        } else if (strcmp(type_str, "double") == 0) {
            JS_ToFloat64(ctx, (double*)current_arg_ptr, argv[3 + i]);
        }
        avalues[i] = current_arg_ptr;
        
        JS_FreeCString(ctx, type_str);
        JS_FreeValue(ctx, type_val);
    }

    ffi_cif cif;
    if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, num_args, rtype, atypes) != FFI_OK) {
        free(atypes); free(avalues); free(arg_storage);
        return JS_ThrowInternalError(ctx, "ffi_prep_cif failed");
    }

    long double rvalue_storage; // Sufficiently large for return values
    ffi_call(&cif, func_ptr, &rvalue_storage, avalues);
    
    JSValue js_ret;
    if (rtype == &ffi_type_sint) {
        js_ret = JS_NewInt32(ctx, *(int*)&rvalue_storage);
    } else if (rtype == &ffi_type_double) {
        js_ret = JS_NewFloat64(ctx, *(double*)&rvalue_storage);
    } else if (rtype == &ffi_type_void) {
        js_ret = JS_UNDEFINED;
    } else {
        js_ret = JS_UNDEFINED;
    }

    free(atypes);
    free(avalues);
    free(arg_storage);

    return js_ret;
}

// JS: FFI.close(handle)
static JSValue js_ffi_close(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    int64_t handle_val;
    if (JS_ToInt64(ctx, &handle_val, argv[0])) return JS_EXCEPTION;
    dlclose((void*)(uintptr_t)handle_val);
    return JS_UNDEFINED;
}

static const JSCFunctionListEntry js_ffi_funcs[] = {
    JS_CFUNC_DEF("open", 1, js_ffi_open),
    JS_CFUNC_DEF("symbol", 2, js_ffi_symbol),
    JS_CFUNC_VARARGS_DEF("call", 3, js_ffi_call),
    JS_CFUNC_DEF("close", 1, js_ffi_close),
};

static int js_ffi_init(JSContext *ctx, JSModuleDef *m) {
    return JS_SetModuleExportList(ctx, m, js_ffi_funcs, countof(js_ffi_funcs));
}

JSModuleDef *js_init_module_ffi(JSContext *ctx, const char *module_name) {
    JSModuleDef *m = JS_NewCModule(ctx, module_name, js_ffi_init);
    if (!m) return NULL;
    JS_AddModuleExportList(ctx, m, js_ffi_funcs, countof(js_ffi_funcs));
    return m;
}

// Function to read a file into a string buffer
static char* read_file(const char* filename, size_t* len) {
    FILE *f = fopen(filename, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    *len = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = malloc(*len + 1);
    if (buf) {
        if (fread(buf, 1, *len, f) != *len) {
            free(buf);
            buf = NULL;
        } else {
           buf[*len] = '\0';
        }
    }
    fclose(f);
    return buf;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <script.js>\n", argv[0]);
        return 1;
    }
    const char* script_path = argv[1];
    
    JSRuntime *rt = JS_NewRuntime();
    JSContext *ctx = JS_NewContext(rt);
    js_std_add_helpers(ctx, argc, argv);

    // Load our custom C module
    js_init_module_ffi(ctx, "ffi");

    size_t script_len;
    char *script_buf = read_file(script_path, &script_len);
    if (!script_buf) {
        fprintf(stderr, "Could not read file: %s\n", script_path);
        return 1;
    }

    JSValue val = JS_Eval(ctx, script_buf, script_len, script_path, JS_EVAL_TYPE_MODULE);
    free(script_buf);

    if (JS_IsException(val)) {
        js_std_dump_error(ctx);
        JS_FreeValue(ctx, val);
        JS_FreeContext(ctx);
        JS_FreeRuntime(rt);
        return 1;
    }

    js_std_loop(ctx); // Process pending jobs (e.g., promises)

    JS_FreeValue(ctx, val);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return 0;
}
```

---

### File: test.js

```javascript
// test.js
// The JavaScript code that uses the FFI module.
import { open, symbol, call, close } from 'ffi';
import * as std from 'std';

console.log("--- QuickJS FFI Demo ---");

try {
    // 根据操作系统选择动态库后缀
    const libSuffix = (std.os === 'win' ? '.dll' : (std.os === 'mac' ? '.dylib' : '.so'));
    const libPath = './libadd' + libSuffix;
    
    console.log(`Loading dynamic library: ${libPath}`);
    const libHandle = open(libPath);
    console.log("Library handle:", libHandle);

    if (libHandle === 0) {
        throw new Error("Failed to get a valid library handle.");
    }

    // --- 调用 add(int, int) ---
    console.log("\n[1] Calling C function: add(int, int)");
    const addFunc = symbol(libHandle, 'add');
    console.log("  - Function pointer for 'add':", addFunc);
    
    const a = 10, b = 20;
    const result1 = call(addFunc, 'int', ['int', 'int'], a, b);
    console.log(`  - JS call: add(${a}, ${b})`);
    console.log(`  - JS result: ${result1}, Expected: ${a + b}`);
    if (result1 !== a + b) throw new Error("Test failed for add!");

    // --- 调用 add_double(double, double) ---
    console.log("\n[2] Calling C function: add_double(double, double)");
    const addDoubleFunc = symbol(libHandle, 'add_double');
    console.log("  - Function pointer for 'add_double':", addDoubleFunc);
    
    const x = 3.14, y = 2.71;
    const result2 = call(addDoubleFunc, 'double', ['double', 'double'], x, y);
    console.log(`  - JS call: add_double(${x}, ${y})`);
    console.log(`  - JS result: ${result2}, Expected: ${x + y}`);
    // 浮点数比较
    if (Math.abs(result2 - (x+y)) > 1e-9) throw new Error("Test failed for add_double!");

    close(libHandle);
    console.log("\nLibrary closed successfully.");
    console.log("--- Demo Finished Successfully ---");

} catch (e) {
    console.log('\n--- Demo Failed ---');
    console.log('Error:', e.message);
    if (e.stack) {
        console.log(e.stack);
    }
    std.exit(1);
}
```

---

### Shell Commands

```bash
#!/bin/bash
set -e

echo "===== QuickJS FFI Demo Builder ====="

echo
echo "--> Step 1: Checking prerequisites..."
if ! command -v gcc &> /dev/null || ! command -v git &> /dev/null || ! command -v make &> /dev/null; then
    echo "Error: gcc, git, and make are required. Please install them."
    exit 1
fi
if ! pkg-config --cflags libffi &> /dev/null; then
    echo "Error: libffi is not found. Please install libffi-dev (Debian/Ubuntu) or libffi-devel (Fedora/CentOS)."
    exit 1
fi
echo "Prerequisites OK."

echo
echo "--> Step 2: Cloning QuickJS repository (if not present)..."
if [ ! -d "quickjs" ]; then
    git clone https://github.com/bellard/quickjs.git
    cd quickjs
    # 切换到一个稳定的版本
    git checkout 2021-03-27
    cd ..
fi
echo "QuickJS source is ready."

echo
echo "--> Step 3: Building QuickJS library (libquickjs.a)..."
make -C quickjs libquickjs.a
echo "libquickjs.a built successfully."

echo
echo "--> Step 4: Compiling the sample dynamic library (libadd.so)..."
gcc -shared -fPIC -o libadd.so libadd.c
echo "libadd.so built successfully."

echo
echo "--> Step 5: Compiling the main application (qjs_ffi)..."
# 使用 pkg-config 获取 libffi 的编译和链接标志
FFI_CFLAGS=$(pkg-config --cflags libffi)
FFI_LIBS=$(pkg-config --libs libffi)
gcc main.c -o qjs_ffi -I./quickjs -L./quickjs -lquickjs -ldl -lm -lpthread $FFI_CFLAGS $FFI_LIBS
echo "qjs_ffi built successfully."

echo
echo "--> Step 6: Running the demo..."
echo "========================================"
# 使用 LD_LIBRARY_PATH (或 DYLD_LIBRARY_PATH for macOS) 确保能找到 libadd.so
export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH
./qjs_ffi test.js
echo "========================================"
echo
echo "===== Build and Test Complete ====="
```
