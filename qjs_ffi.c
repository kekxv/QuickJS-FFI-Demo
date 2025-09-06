// qjs_ffi.c
// QuickJS FFI C module.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dlfcn.h>
#include <ffi.h>

#include "quickjs/quickjs.h"
#include "quickjs/quickjs-libc.h"
#include "qjs_ffi.h"

#define countof(x) (sizeof(x) / sizeof((x)[0]))

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

    ffi_type **atypes = NULL;
    void **avalues = NULL;
    void *arg_storage = NULL;

    if (num_args > 0) {
        atypes = js_malloc(ctx, sizeof(ffi_type*) * num_args);
        avalues = js_malloc(ctx, sizeof(void*) * num_args);
        arg_storage = js_malloc(ctx, sizeof(long double) * num_args);

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
    }

    ffi_cif cif;
    if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, num_args, rtype, atypes) != FFI_OK) {
        if (num_args > 0) {
            js_free(ctx, atypes);
            js_free(ctx, avalues);
            js_free(ctx, arg_storage);
        }
        return JS_ThrowInternalError(ctx, "ffi_prep_cif failed");
    }

    long double rvalue_storage;
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

    if (num_args > 0) {
        js_free(ctx, atypes);
        js_free(ctx, avalues);
        js_free(ctx, arg_storage);
    }

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
    JS_CFUNC_DEF("call", 3, js_ffi_call),
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
