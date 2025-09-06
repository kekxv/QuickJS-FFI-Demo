#ifndef QJS_FFI_H
#define QJS_FFI_H

#include "quickjs/quickjs.h"

#ifdef __cplusplus
extern "C" {
#endif

JSModuleDef *js_init_module_ffi(JSContext *ctx, const char *module_name);

#ifdef __cplusplus
}
#endif

#endif /* QJS_FFI_H */