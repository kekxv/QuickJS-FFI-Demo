# CMakeLists.txt for QuickJS FFI Demo

# 1. 设置项目和 CMake 最低版本
cmake_minimum_required(VERSION 3.10)
project(QuickJS_FFI_Demo C)

# 2. 查找所需的库
# 查找 libffi
find_package(PkgConfig REQUIRED)
pkg_check_modules(FFI REQUIRED libffi)

add_definitions("-DCONFIG_VERSION=\"20250504\"")

# 3. 定义 QuickJS 静态库
# 从 quickjs 子目录中收集源文件
set(QUICKJS_SOURCES
    quickjs/quickjs.c
    quickjs/libregexp.c
    quickjs/libunicode.c
    quickjs/cutils.c
    quickjs/quickjs-libc.c
    quickjs/dtoa.c
)

# 添加为静态库
add_library(quickjs_static STATIC ${QUICKJS_SOURCES})

# 将 quickjs 目录添加到其公共 include 路径中
# 这样链接到它的目标就能自动找到头文件
target_include_directories(quickjs_static PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/quickjs)

# QuickJS 使用 C99 标准
set_target_properties(quickjs_static PROPERTIES C_STANDARD 99)

# 4. 编译 libadd 动态库
add_library(add SHARED libadd.c)
# 设置 -fPIC 标志，这是创建动态库所必需的
set_target_properties(add PROPERTIES POSITION_INDEPENDENT_CODE ON)

# 5. 编译主程序 qjs_ffi
add_executable(qjs_ffi
        qjs_ffi.h
        qjs_ffi.c
        main.c)

# 链接所有需要的库
target_link_libraries(qjs_ffi PRIVATE
    quickjs_static      # 我们自己编译的 QuickJS
    ${FFI_LIBRARIES}    # PkgConfig 找到的 libffi
    dl                  # 用于 dlopen, dlsym
    m                   # 数学库
    pthread             # 线程库
)

# 添加 libffi 的 include 目录
target_include_directories(qjs_ffi PRIVATE ${FFI_INCLUDE_DIRS})

# 6. 创建一个自定义目标来运行测试脚本
# 根据操作系统设置正确的库路径环境变量
if(APPLE)
    set(LIB_PATH_ENV_VAR "DYLD_LIBRARY_PATH")
else()
    set(LIB_PATH_ENV_VAR "LD_LIBRARY_PATH")
endif()

# 添加一个名为 'run_demo' 的目标
add_custom_target(run_demo
    # 命令：设置环境后，运行可执行文件并传入 JS 脚本路径
    COMMAND ${CMAKE_COMMAND} -E env "${LIB_PATH_ENV_VAR}=${CMAKE_CURRENT_BINARY_DIR}"
            $<TARGET_FILE:qjs_ffi> ${CMAKE_CURRENT_SOURCE_DIR}/test.js
    # 依赖项：确保在运行前已构建好可执行文件和动态库
    DEPENDS qjs_ffi add
    # 工作目录：在构建目录下运行，以便找到 libadd.so
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running demo: ./qjs_ffi test.js"
    # USES_TERMINAL 确保我们可以看到程序的实时输出
    USES_TERMINAL
)

# 打印构建和运行说明
message(STATUS "CMake configuration complete.")
message(STATUS "To build the project, run:")
message(STATUS "  mkdir build && cd build")
message(STATUS "  cmake ..")
message(STATUS "  make")
message(STATUS "To run the demo, after building, run:")
message(STATUS "  make run_demo")
