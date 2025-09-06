// main.c
// QuickJS FFI demo host program.
#include <stdio.h>
#include <stdlib.h>

#include "quickjs/quickjs.h"
#include "quickjs/quickjs-libc.h"
#include "qjs_ffi.h"

// Function to read a file into a string buffer
static char* read_file(const char* filename, size_t* len)
{
  FILE* f = fopen(filename, "rb");
  if (!f) return NULL;
  fseek(f, 0, SEEK_END);
  *len = ftell(f);
  fseek(f, 0, SEEK_SET);
  char* buf = malloc(*len + 1);
  if (buf)
  {
    if (fread(buf, 1, *len, f) != *len)
    {
      free(buf);
      buf = NULL;
    }
    else
    {
      buf[*len] = '\0';
    }
  }
  fclose(f);
  return buf;
}

int main(int argc, char** argv)
{
  if (argc < 2)
  {
    fprintf(stderr, "Usage: %s <script.js>\n", argv[0]);
    return 1;
  }
  const char* script_path = argv[1];

  JSRuntime* rt = JS_NewRuntime();
  JSContext* ctx = JS_NewContext(rt);
  js_std_init_handlers(rt);

  // Load the standard and ffi modules
  js_init_module_std(ctx, "std");
  js_init_module_ffi(ctx, "ffi");

  size_t script_len;
  char* script_buf = read_file(script_path, &script_len);
  if (!script_buf)
  {
    fprintf(stderr, "Could not read file: %s\n", script_path);
    return 1;
  }

  JSValue val = JS_Eval(ctx, script_buf, script_len, script_path, JS_EVAL_TYPE_MODULE);
  free(script_buf);

  if (JS_IsException(val))
  {
    js_std_dump_error(ctx);
    JS_FreeValue(ctx, val);

    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return 1;
  }
  js_std_loop(ctx);

  JS_FreeValue(ctx, val);
  js_std_free_handlers(rt);

  JS_FreeContext(ctx);
  JS_FreeRuntime(rt);
  return 0;
}
