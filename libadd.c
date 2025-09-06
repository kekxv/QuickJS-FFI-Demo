// libadd.c
// 一个简单的动态库，用于被 JS 调用。
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>

// __attribute__((visibility("default"))) 确保函数被导出
__attribute__((visibility("default")))
int add(int a, int b) {
    printf("C [add]: called with %d and %d\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
double add_double(double a, double b) {
    printf("C [add_double]: called with %.2f and %.2f\n", a, b);
    return a + b;
}

// 整数类型测试
__attribute__((visibility("default")))
int8_t test_int8(int8_t a, int8_t b) {
    printf("C [test_int8]: called with %d and %d\n", a, b);
    return a * b;
}

__attribute__((visibility("default")))
uint8_t test_uint8(uint8_t a, uint8_t b) {
    printf("C [test_uint8]: called with %u and %u\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
int16_t test_int16(int16_t a, int16_t b) {
    printf("C [test_int16]: called with %d and %d\n", a, b);
    return a - b;
}

__attribute__((visibility("default")))
uint16_t test_uint16(uint16_t a, uint16_t b) {
    printf("C [test_uint16]: called with %u and %u\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
int32_t test_int32(int32_t a, int32_t b) {
    printf("C [test_int32]: called with %d and %d\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
uint32_t test_uint32(uint32_t a, uint32_t b) {
    printf("C [test_uint32]: called with %u and %u\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
int64_t test_int64(int64_t a, int64_t b) {
    printf("C [test_int64]: called with %lld and %lld\n", a, b);
    return a + b;
}

__attribute__((visibility("default")))
uint64_t test_uint64(uint64_t a, uint64_t b) {
    printf("C [test_uint64]: called with %llu and %llu\n", a, b);
    return a + b;
}

// 浮点数类型测试
__attribute__((visibility("default")))
float test_float(float a, float b) {
    printf("C [test_float]: called with %.2f and %.2f\n", a, b);
    return a * b;
}

__attribute__((visibility("default")))
long double test_longdouble(long double a, long double b) {
    printf("C [test_longdouble]: called with %.2Lf and %.2Lf\n", a, b);
    return a + b;
}

// 字符类型测试
__attribute__((visibility("default")))
char test_char(char a, char b) {
    printf("C [test_char]: called with '%c' and '%c'\n", a, b);
    return a > b ? a : b; // 返回较大的字符
}

__attribute__((visibility("default")))
unsigned char test_uchar(unsigned char a, unsigned char b) {
    printf("C [test_uchar]: called with %u and %u\n", a, b);
    return a + b;
}

// 字符串类型测试
__attribute__((visibility("default")))
int test_string_length(const char* str) {
    printf("C [test_string_length]: called with '%s'\n", str ? str : "(null)");
    return str ? strlen(str) : -1;
}

__attribute__((visibility("default")))
const char* test_string_concat(const char* a, const char* b) {
    static char buffer[256];
    printf("C [test_string_concat]: called with '%s' and '%s'\n", 
           a ? a : "(null)", b ? b : "(null)");

    if (a && b) {
        snprintf(buffer, sizeof(buffer), "%s%s", a, b);
        return buffer;
    }
    return "error";
}

// 指针类型测试
__attribute__((visibility("default")))
void* test_pointer_identity(void* ptr) {
    printf("C [test_pointer_identity]: called with pointer %p\n", ptr);
    return ptr; // 返回相同的指针
}

__attribute__((visibility("default")))
int* test_int_pointer(int* ptr, int offset) {
    printf("C [test_int_pointer]: called with pointer %p, offset %d\n", ptr, offset);
    if (ptr) {
        printf("C [test_int_pointer]: value at pointer: %d\n", *ptr);
        *ptr += offset; // 修改指针指向的值
    }
    return ptr;
}

// 混合类型测试
__attribute__((visibility("default")))
double test_mixed_types(int a, float b, double c, uint32_t d) {
    printf("C [test_mixed_types]: called with int=%d, float=%.2f, double=%.2f, uint32=%u\n", 
           a, b, c, d);
    return a + b + c + d;
}

// void 类型测试
__attribute__((visibility("default")))
void test_void_function(int value) {
    printf("C [test_void_function]: called with %d, no return value\n", value);
}

// 边界值测试
__attribute__((visibility("default")))
int test_large_numbers(int64_t big_num, uint64_t huge_num) {
    printf("C [test_large_numbers]: called with %lld and %llu\n", big_num, huge_num);
    return (big_num > 0 && huge_num > 0) ? 1 : 0;
}

// 数组操作测试
__attribute__((visibility("default")))
void array_copy(const int* src, int* dest, int size) {
    printf("C [array_copy]: copying %d integers\n", size);
    for (int i = 0; i < size; i++) {
        dest[i] = src[i];
        printf("  dest[%d] = %d\n", i, dest[i]);
    }
}

__attribute__((visibility("default")))
void array_multiply(int* arr, int size, int multiplier) {
    printf("C [array_multiply]: multiplying %d integers by %d\n", size, multiplier);
    for (int i = 0; i < size; i++) {
        arr[i] *= multiplier;
        printf("  arr[%d] = %d\n", i, arr[i]);
    }
}

__attribute__((visibility("default")))
int array_sum(const int* arr, int size) {
    printf("C [array_sum]: summing %d integers\n", size);
    int sum = 0;
    for (int i = 0; i < size; i++) {
        sum += arr[i];
        printf("  adding arr[%d] = %d, sum = %d\n", i, arr[i], sum);
    }
    return sum;
}

__attribute__((visibility("default")))
void float_array_process(const float* input, float* output, int size) {
    printf("C [float_array_process]: processing %d floats\n", size);
    for (int i = 0; i < size; i++) {
        output[i] = input[i] * 2.0f + 1.0f;
        printf("  output[%d] = %.2f (from %.2f)\n", i, output[i], input[i]);
    }
}

__attribute__((visibility("default")))
void byte_array_reverse(uint8_t* arr, int size) {
    printf("C [byte_array_reverse]: reversing %d bytes\n", size);
    for (int i = 0; i < size / 2; i++) {
        uint8_t temp = arr[i];
        arr[i] = arr[size - 1 - i];
        arr[size - 1 - i] = temp;
    }

    printf("  result: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
}

__attribute__((visibility("default")))
int find_max_in_array(const int* arr, int size, int* max_index) {
    if (size <= 0) return -1;

    int max_val = arr[0];
    *max_index = 0;

    printf("C [find_max_in_array]: finding max in %d integers\n", size);
    for (int i = 1; i < size; i++) {
        if (arr[i] > max_val) {
            max_val = arr[i];
            *max_index = i;
        }
    }

    printf("  max value: %d at index %d\n", max_val, *max_index);
    return max_val;
}

// 回调函数测试
typedef int (*SimpleCallback)(int a, int b);
typedef void (*LogCallback)(const char* message);
typedef double (*MathCallback)(double x);

__attribute__((visibility("default")))
int test_simple_callback(int x, int y, SimpleCallback callback) {
    printf("C [test_simple_callback]: called with x=%d, y=%d\n", x, y);
    if (callback) {
        int result = callback(x, y);
        printf("C [test_simple_callback]: callback returned %d\n", result);
        return result;
    }
    return -1;
}

__attribute__((visibility("default")))
void test_log_callback(const char* message, LogCallback callback) {
    printf("C [test_log_callback]: called with message='%s'\n", message);
    if (callback) {
        callback(message);
    }
}

__attribute__((visibility("default")))
double test_math_callback(double input, MathCallback callback) {
    printf("C [test_math_callback]: called with input=%.2f\n", input);
    if (callback) {
        double result = callback(input);
        printf("C [test_math_callback]: callback returned %.2f\n", result);
        return result;
    }
    return 0.0;
}

__attribute__((visibility("default")))
void test_array_foreach(const int* arr, int size, void (*callback)(int value, int index)) {
    printf("C [test_array_foreach]: iterating %d elements\n", size);
    for (int i = 0; i < size; i++) {
        if (callback) {
            callback(arr[i], i);
        }
    }
}

__attribute__((visibility("default")))
int test_array_filter(const int* input, int input_size, int* output, 
                     int (*filter_callback)(int value)) {
    printf("C [test_array_filter]: filtering %d elements\n", input_size);
    int output_count = 0;

    for (int i = 0; i < input_size; i++) {
        if (filter_callback && filter_callback(input[i])) {
            output[output_count] = input[i];
            printf("  kept: %d at output[%d]\n", input[i], output_count);
            output_count++;
        } else {
            printf("  filtered out: %d\n", input[i]);
        }
    }

    return output_count;
}


