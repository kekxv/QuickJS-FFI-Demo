// ffi-wrapper.js
// 将FFI操作封装在闭包中的模块

// 创建一个FFI包装器的工厂函数
export function createFFIWrapper(ffiModule) {
  const {open, symbol, call, close, malloc, free, writeArray, readArray} = ffiModule;
  
  // 返回包装器对象
  return {
    // 打开库文件
    openLibrary: (libPath) => {
      return open(libPath);
    },
    
    // 获取函数符号
    getSymbol: (libHandle, funcName) => {
      return symbol(libHandle, funcName);
    },
    
    // 调用函数
    callFunction: (funcPtr, returnType, argTypes, ...args) => {
      return call(funcPtr, returnType, argTypes, ...args);
    },
    
    // 分配内存
    allocateMemory: (size) => {
      return malloc(size);
    },
    
    // 释放内存
    freeMemory: (ptr) => {
      free(ptr);
    },
    
    // 写入数组到内存
    writeArrayToMemory: (ptr, array, type, length) => {
      writeArray(ptr, array, type, length);
    },
    
    // 从内存读取数组
    readArrayFromMemory: (ptr, type, length) => {
      return readArray(ptr, type, length);
    },
    
    // 关闭库
    closeLibrary: (libHandle) => {
      close(libHandle);
    }
  };
}

// 使用闭包封装的FFI操作模块
export const FFIModule = (() => {
  // 私有变量用于存储库句柄
  let _libHandle = null;
  
  // 返回公共接口
  return {
    // 初始化库
    init: (ffiModule, libPath) => {
      const {open} = ffiModule;
      _libHandle = open(libPath);
      return _libHandle;
    },
    
    // 获取函数符号
    getSymbol: (ffiModule, funcName) => {
      if (!_libHandle) {
        throw new Error("Library not initialized");
      }
      const {symbol} = ffiModule;
      return symbol(_libHandle, funcName);
    },
    
    // 调用函数
    callFunction: (ffiModule, funcPtr, returnType, argTypes, ...args) => {
      if (!_libHandle) {
        throw new Error("Library not initialized");
      }
      const {call} = ffiModule;
      return call(funcPtr, returnType, argTypes, ...args);
    },
    
    // 分配内存
    allocateMemory: (ffiModule, size) => {
      const {malloc} = ffiModule;
      return malloc(size);
    },
    
    // 释放内存
    freeMemory: (ffiModule, ptr) => {
      const {free} = ffiModule;
      free(ptr);
    },
    
    // 写入数组到内存
    writeArrayToMemory: (ffiModule, ptr, array, type, length) => {
      const {writeArray} = ffiModule;
      writeArray(ptr, array, type, length);
    },
    
    // 从内存读取数组
    readArrayFromMemory: (ffiModule, ptr, type, length) => {
      const {readArray} = ffiModule;
      return readArray(ptr, type, length);
    },
    
    // 关闭库
    close: (ffiModule) => {
      if (_libHandle) {
        const {close} = ffiModule;
        close(_libHandle);
        _libHandle = null;
      }
    },
    
    // 检查库是否已初始化
    isInitialized: () => {
      return _libHandle !== null;
    }
  };
})();