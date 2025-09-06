// main.cpp
// QuickJS FFI demo host program.
#include <iostream>
#include <memory>
#include <fstream>
#include <vector>

#include "quickjs/quickjs.h"
#include "quickjs/quickjs-libc.h"
#include "qjs_ffi.h"

// Custom deleter for JSRuntime
struct JSRuntimeDeleter
{
  void operator()(JSRuntime* rt) const
  {
    if (rt)
    {
      js_std_free_handlers(rt);
      JS_FreeRuntime(rt);
    }
  }
};

// Custom deleter for JSContext
struct JSContextDeleter
{
  void operator()(JSContext* ctx) const
  {
    if (ctx)
    {
      JS_FreeContext(ctx);
    }
  }
};

// RAII wrapper for JSValue
class JSValueGuard
{
  JSContext* ctx_;
  JSValue val_;

public:
  JSValueGuard(JSContext* ctx, JSValue val) : ctx_(ctx), val_(val) {}

  ~JSValueGuard()
  {
    if (ctx_)
    {
      JS_FreeValue(ctx_, val_);
    }
  }

  // Non-copyable, movable
  JSValueGuard(const JSValueGuard&) = delete;
  JSValueGuard& operator=(const JSValueGuard&) = delete;

  JSValueGuard(JSValueGuard&& other) noexcept 
    : ctx_(other.ctx_), val_(other.val_)
  {
    other.ctx_ = nullptr;
  }

  JSValueGuard& operator=(JSValueGuard&& other) noexcept
  {
    if (this != &other)
    {
      if (ctx_)
      {
        JS_FreeValue(ctx_, val_);
      }
      ctx_ = other.ctx_;
      val_ = other.val_;
      other.ctx_ = nullptr;
    }
    return *this;
  }

  JSValue get() const { return val_; }
  operator JSValue() const { return val_; }
};

// Type aliases for smart pointers
using JSRuntimePtr = std::unique_ptr<JSRuntime, JSRuntimeDeleter>;
using JSContextPtr = std::unique_ptr<JSContext, JSContextDeleter>;

// Function to read a file into a string
static std::string read_file(const char* filename)
{
  std::ifstream file(filename, std::ios::binary);
  if (!file)
  {
    return {};
  }

  return std::string(std::istreambuf_iterator<char>(file),
                     std::istreambuf_iterator<char>());
}

int main(int argc, char** argv)
{
  if (argc < 2)
  {
    std::cerr << "Usage: " << argv[0] << " <script.js>" << std::endl;
    return 1;
  }

  try
  {
    const char* script_path = argv[1];

    // Create runtime with automatic cleanup
    JSRuntimePtr rt(JS_NewRuntime());
    if (!rt)
    {
      std::cerr << "Error: Could not create QuickJS runtime" << std::endl;
      return 1;
    }

    // Create context with automatic cleanup
    JSContextPtr ctx(JS_NewContext(rt.get()));
    if (!ctx)
    {
      std::cerr << "Error: Could not create QuickJS context" << std::endl;
      return 1;
    }

    js_std_init_handlers(rt.get());

    // Set up module loader for ES6 import/export support
    JS_SetModuleLoaderFunc2(rt.get(), NULL, js_module_loader, js_module_check_attributes, NULL);

    // Load the standard, os and ffi modules
    js_init_module_std(ctx.get(), "std");
    js_init_module_os(ctx.get(), "os");
    js_init_module_ffi(ctx.get(), "ffi");

    // Add standard helpers (console.log, print, etc.)
    js_std_add_helpers(ctx.get(), argc, argv);

    // Read script file
    std::string script_content = read_file(script_path);
    if (script_content.empty())
    {
      std::cerr << "Error: Could not read file: " << script_path << std::endl;
      return 1;
    }

    // Evaluate script with automatic JSValue cleanup
    // Use JS_EVAL_TYPE_MODULE for ES6 modules with import/export syntax
    JSValue val = JS_Eval(ctx.get(), script_content.c_str(), script_content.length(), 
                          script_path, JS_EVAL_TYPE_MODULE);
    JSValueGuard val_guard(ctx.get(), val);

    if (JS_IsException(val))
    {
      std::cerr << "Error: Script execution failed:" << std::endl;
      js_std_dump_error(ctx.get());
      return 1;
    }

    // Run event loop
    js_std_loop(ctx.get());

    return 0;
  }
  catch (const std::exception& e)
  {
    std::cerr << "Error: Exception caught: " << e.what() << std::endl;
    return 1;
  }
  catch (...)
  {
    std::cerr << "Error: Unknown exception caught" << std::endl;
    return 1;
  }
}
