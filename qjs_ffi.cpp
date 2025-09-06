// qjs_ffi.cpp
// QuickJS FFI C++ module.
#include <iostream>
#include <memory>
#include <cstring>
#include <dlfcn.h>
#include <ffi.h>

#include "quickjs/quickjs.h"
#include "quickjs/quickjs-libc.h"
#include "qjs_ffi.h"

#define countof(x) (sizeof(x) / sizeof((x)[0]))

// 将 JS 传入的类型字符串转换为 ffi_type
static ffi_type* string_to_ffi_type(const char* type_str)
{
  // 基本整数类型
  if (strcmp(type_str, "int") == 0) return &ffi_type_sint;
  if (strcmp(type_str, "uint") == 0) return &ffi_type_uint;
  if (strcmp(type_str, "int8") == 0) return &ffi_type_sint8;
  if (strcmp(type_str, "uint8") == 0) return &ffi_type_uint8;
  if (strcmp(type_str, "int16") == 0) return &ffi_type_sint16;
  if (strcmp(type_str, "uint16") == 0) return &ffi_type_uint16;
  if (strcmp(type_str, "int32") == 0) return &ffi_type_sint32;
  if (strcmp(type_str, "uint32") == 0) return &ffi_type_uint32;
  if (strcmp(type_str, "int64") == 0) return &ffi_type_sint64;
  if (strcmp(type_str, "uint64") == 0) return &ffi_type_uint64;

  // 浮点数类型
  if (strcmp(type_str, "float") == 0) return &ffi_type_float;
  if (strcmp(type_str, "double") == 0) return &ffi_type_double;
  if (strcmp(type_str, "longdouble") == 0) return &ffi_type_longdouble;

  // 字符类型
  if (strcmp(type_str, "char") == 0) return &ffi_type_schar;
  if (strcmp(type_str, "uchar") == 0) return &ffi_type_uchar;

  // 指针和字符串类型
  if (strcmp(type_str, "pointer") == 0) return &ffi_type_pointer;
  if (strcmp(type_str, "string") == 0) return &ffi_type_pointer;  // 字符串作为 char* 处理

  // 特殊类型
  if (strcmp(type_str, "void") == 0) return &ffi_type_void;

  // 平台相关类型别名
  if (strcmp(type_str, "size_t") == 0) return &ffi_type_uint64;  // 假设 64 位平台
  if (strcmp(type_str, "ssize_t") == 0) return &ffi_type_sint64;
  if (strcmp(type_str, "long") == 0) return &ffi_type_slong;
  if (strcmp(type_str, "ulong") == 0) return &ffi_type_ulong;

  return nullptr;
}

// JS: FFI.open(path)
static JSValue js_ffi_open(JSContext* ctx, JSValueConst this_val, int argc, JSValueConst* argv)
{
  const char* path = JS_ToCString(ctx, argv[0]);
  if (!path) return JS_EXCEPTION;

  // 直接使用 dlopen，不要在局部作用域中自动关闭
  void* handle = dlopen(path, RTLD_LAZY);
  JS_FreeCString(ctx, path);

  if (!handle)
  {
    return JS_ThrowTypeError(ctx, "Failed to open library: %s", dlerror());
  }

  // 返回句柄值供后续使用
  return JS_NewInt64(ctx, (int64_t)(uintptr_t)handle);
}

// JS: FFI.symbol(handle, name)
static JSValue js_ffi_symbol(JSContext* ctx, JSValueConst this_val, int argc, JSValueConst* argv)
{
  int64_t handle_val;
  const char* name = JS_ToCString(ctx, argv[1]);
  if (JS_ToInt64(ctx, &handle_val, argv[0]) || !name)
  {
    JS_FreeCString(ctx, name);
    return JS_EXCEPTION;
  }
  void* handle = (void*)(uintptr_t)handle_val;
  void* symbol = dlsym(handle, name);
  JS_FreeCString(ctx, name);
  if (!symbol) return JS_ThrowTypeError(ctx, "Failed to find symbol: %s", dlerror());
  return JS_NewInt64(ctx, (int64_t)(uintptr_t)symbol);
}

// JS: FFI.call(func_ptr, ret_type_str, [arg_types_str...], ...args)
static JSValue js_ffi_call(JSContext* ctx, JSValueConst this_val, int argc, JSValueConst* argv)
{
  if (argc < 3) return JS_ThrowTypeError(ctx, "FFI.call requires at least 3 arguments");

  int64_t func_ptr_val;
  if (JS_ToInt64(ctx, &func_ptr_val, argv[0])) return JS_EXCEPTION;
  void (*func_ptr)(void) = (void (*)(void))(uintptr_t)func_ptr_val;

  const char* ret_type_str = JS_ToCString(ctx, argv[1]);
  ffi_type* rtype = string_to_ffi_type(ret_type_str);
  JS_FreeCString(ctx, ret_type_str);
  if (!rtype) return JS_ThrowTypeError(ctx, "Invalid return type");

  JSValueConst arg_types_js = argv[2];
  if (!JS_IsArray(ctx, arg_types_js)) return JS_ThrowTypeError(ctx, "Argument types must be an array");

  JSValue len_val = JS_GetPropertyStr(ctx, arg_types_js, "length");
  uint32_t num_args;
  JS_ToUint32(ctx, &num_args, len_val);
  JS_FreeValue(ctx, len_val);

  if ((argc - 3) != num_args)
  {
    return JS_ThrowTypeError(ctx, "Incorrect number of arguments. Expected %d, got %d", num_args, argc - 3);
  }

  // 使用智能指针管理内存
  std::unique_ptr<ffi_type*[]> atypes;
  std::unique_ptr<void*[]> avalues;
  std::unique_ptr<char[]> arg_storage;

  if (num_args > 0)
  {
    atypes = std::make_unique<ffi_type*[]>(num_args);
    avalues = std::make_unique<void*[]>(num_args);
    arg_storage = std::make_unique<char[]>(sizeof(long double) * num_args);

    for (uint32_t i = 0; i < num_args; i++)
    {
      JSValue type_val = JS_GetPropertyUint32(ctx, arg_types_js, i);
      const char* type_str = JS_ToCString(ctx, type_val);
      atypes[i] = string_to_ffi_type(type_str);
      if (!atypes[i])
      {
        JS_FreeCString(ctx, type_str);
        JS_FreeValue(ctx, type_val);
        return JS_ThrowTypeError(ctx, "Invalid argument type");
      }

      char* current_arg_ptr = arg_storage.get() + i * sizeof(long double);

      // 整数类型
      if (strcmp(type_str, "int") == 0 || strcmp(type_str, "int32") == 0)
      {
        JS_ToInt32(ctx, (int32_t*)current_arg_ptr, argv[3 + i]);
      }
      else if (strcmp(type_str, "uint") == 0 || strcmp(type_str, "uint32") == 0)
      {
        JS_ToUint32(ctx, (uint32_t*)current_arg_ptr, argv[3 + i]);
      }
      else if (strcmp(type_str, "int8") == 0 || strcmp(type_str, "char") == 0)
      {
        int32_t val;
        JS_ToInt32(ctx, &val, argv[3 + i]);
        *(int8_t*)current_arg_ptr = (int8_t)val;
      }
      else if (strcmp(type_str, "uint8") == 0 || strcmp(type_str, "uchar") == 0)
      {
        uint32_t val;
        JS_ToUint32(ctx, &val, argv[3 + i]);
        *(uint8_t*)current_arg_ptr = (uint8_t)val;
      }
      else if (strcmp(type_str, "int16") == 0)
      {
        int32_t val;
        JS_ToInt32(ctx, &val, argv[3 + i]);
        *(int16_t*)current_arg_ptr = (int16_t)val;
      }
      else if (strcmp(type_str, "uint16") == 0)
      {
        uint32_t val;
        JS_ToUint32(ctx, &val, argv[3 + i]);
        *(uint16_t*)current_arg_ptr = (uint16_t)val;
      }
      else if (strcmp(type_str, "int64") == 0 || strcmp(type_str, "ssize_t") == 0 || strcmp(type_str, "long") == 0)
      {
        JS_ToInt64(ctx, (int64_t*)current_arg_ptr, argv[3 + i]);
      }
      else if (strcmp(type_str, "uint64") == 0 || strcmp(type_str, "size_t") == 0 || strcmp(type_str, "ulong") == 0)
      {
        int64_t val;
        JS_ToInt64(ctx, &val, argv[3 + i]);
        *(uint64_t*)current_arg_ptr = (uint64_t)val;
      }
      // 浮点数类型
      else if (strcmp(type_str, "float") == 0)
      {
        double val;
        JS_ToFloat64(ctx, &val, argv[3 + i]);
        *(float*)current_arg_ptr = (float)val;
      }
      else if (strcmp(type_str, "double") == 0)
      {
        JS_ToFloat64(ctx, (double*)current_arg_ptr, argv[3 + i]);
      }
      else if (strcmp(type_str, "longdouble") == 0)
      {
        double val;
        JS_ToFloat64(ctx, &val, argv[3 + i]);
        *(long double*)current_arg_ptr = (long double)val;
      }
      // 指针和字符串类型
      else if (strcmp(type_str, "pointer") == 0)
      {
        if (JS_IsString(argv[3 + i])) 
        {
          // 如果传入的是字符串，转换为字符指针
          const char* str = JS_ToCString(ctx, argv[3 + i]);
          *(const char**)current_arg_ptr = str;
          // 注意：这里的字符串指针会在函数结束后失效，实际应用中需要管理生命周期
        }
        else
        {
          int64_t ptr_val;
          JS_ToInt64(ctx, &ptr_val, argv[3 + i]);
          *(void**)current_arg_ptr = (void*)(uintptr_t)ptr_val;
        }
      }
      else if (strcmp(type_str, "string") == 0)
      {
        const char* str = JS_ToCString(ctx, argv[3 + i]);
        *(const char**)current_arg_ptr = str;
      }

      avalues[i] = current_arg_ptr;

      JS_FreeCString(ctx, type_str);
      JS_FreeValue(ctx, type_val);
    }
  }

  ffi_cif cif;
  if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, num_args, rtype, atypes.get()) != FFI_OK)
  {
    return JS_ThrowInternalError(ctx, "ffi_prep_cif failed");
  }

  long double rvalue_storage;
  ffi_call(&cif, func_ptr, &rvalue_storage, avalues.get());

  JSValue js_ret;

  // 整数类型返回值
  if (rtype == &ffi_type_sint || rtype == &ffi_type_sint32)
  {
    js_ret = JS_NewInt32(ctx, *(int32_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_uint || rtype == &ffi_type_uint32)
  {
    js_ret = JS_NewUint32(ctx, *(uint32_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_sint8 || rtype == &ffi_type_schar)
  {
    js_ret = JS_NewInt32(ctx, *(int8_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_uint8 || rtype == &ffi_type_uchar)
  {
    js_ret = JS_NewUint32(ctx, *(uint8_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_sint16)
  {
    js_ret = JS_NewInt32(ctx, *(int16_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_uint16)
  {
    js_ret = JS_NewUint32(ctx, *(uint16_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_sint64 || rtype == &ffi_type_slong)
  {
    js_ret = JS_NewInt64(ctx, *(int64_t*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_uint64 || rtype == &ffi_type_ulong)
  {
    js_ret = JS_NewBigUint64(ctx, *(uint64_t*)&rvalue_storage);
  }
  // 浮点数类型返回值
  else if (rtype == &ffi_type_float)
  {
    js_ret = JS_NewFloat64(ctx, *(float*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_double)
  {
    js_ret = JS_NewFloat64(ctx, *(double*)&rvalue_storage);
  }
  else if (rtype == &ffi_type_longdouble)
  {
    js_ret = JS_NewFloat64(ctx, (double)*(long double*)&rvalue_storage);
  }
  // 指针类型返回值
  else if (rtype == &ffi_type_pointer)
  {
    void* ptr = *(void**)&rvalue_storage;
    if (ptr == nullptr)
    {
      js_ret = JS_NULL;
    }
    else
    {
      js_ret = JS_NewInt64(ctx, (int64_t)(uintptr_t)ptr);
    }
  }
  // void 类型
  else if (rtype == &ffi_type_void)
  {
    js_ret = JS_UNDEFINED;
  }
  else
  {
    // 未知类型，返回 undefined
    js_ret = JS_UNDEFINED;
  }

  return js_ret;
}

// JS: FFI.close(handle)
static JSValue js_ffi_close(JSContext* ctx, JSValueConst this_val, int argc, JSValueConst* argv)
{
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

static int js_ffi_init(JSContext* ctx, JSModuleDef* m)
{
  return JS_SetModuleExportList(ctx, m, js_ffi_funcs, countof(js_ffi_funcs));
}

JSModuleDef* js_init_module_ffi(JSContext* ctx, const char* module_name)
{
  JSModuleDef* m = JS_NewCModule(ctx, module_name, js_ffi_init);
  if (!m) return nullptr;
  JS_AddModuleExportList(ctx, m, js_ffi_funcs, countof(js_ffi_funcs));
  return m;
}
