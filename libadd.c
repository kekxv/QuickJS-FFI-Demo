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


