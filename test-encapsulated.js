// test-encapsulated.js
// 使用封装的FFI模块的测试文件
import {FFIModule} from './ffi-wrapper.js';
import * as ffi from 'ffi';
import * as std from 'std';
import * as os from 'os';

// 颜色输出支持
const Colors = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',

  // 前景色
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // 背景色
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m'
};

// 日志函数
function logInfo(msg) {
  console.log(`${Colors.BLUE}[INFO]${Colors.RESET} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${Colors.GREEN}[SUCCESS]${Colors.RESET} ${msg}`);
}

function logWarning(msg) {
  console.log(`${Colors.YELLOW}[WARNING]${Colors.RESET} ${msg}`);
}

function logError(msg) {
  console.log(`${Colors.RED}[ERROR]${Colors.RESET} ${msg}`);
}

function logDebug(msg) {
  console.log(`${Colors.DIM}[DEBUG]${Colors.RESET} ${msg}`);
}

function logTest(testName, status = 'RUNNING') {
  const statusColors = {
    'RUNNING': Colors.CYAN,
    'PASS': Colors.GREEN,
    'FAIL': Colors.RED,
    'SKIP': Colors.YELLOW
  };
  const color = statusColors[status] || Colors.RESET;
  console.log(`${color}[${status}]${Colors.RESET} ${testName}`);
}

console.log(`${Colors.BRIGHT}${Colors.MAGENTA}=== QuickJS FFI Demo (Encapsulated Version) ===${Colors.RESET}`);
logInfo(`Platform: ${Colors.CYAN}${os.platform}${Colors.RESET}`);

try {
  // 初始化库
  const libSuffix = (os.platform === 'win32' ? '.dll' : (os.platform === 'darwin' ? '.dylib' : '.so'));
  const libPath = './libadd' + libSuffix;

  console.log(`Loading dynamic library: ${libPath}`);
  const libHandle = FFIModule.init(ffi, libPath);
  console.log("Library handle:", libHandle);

  if (libHandle === 0) {
    throw new Error("Failed to get a valid library handle.");
  }

  // 测试库句柄的持久性
  logDebug("Testing library handle persistence...");
  try {
    // 多次访问同一个符号，看看句柄是否保持有效
    const testPtr1 = FFIModule.getSymbol(ffi, 'add');
    const testPtr2 = FFIModule.getSymbol(ffi, 'add');
    if (testPtr1 === testPtr2) {
      logDebug("Library handle persistence: OK");
    } else {
      logWarning(`Handle persistence issue: ${testPtr1} vs ${testPtr2}`);
    }
  } catch (e) {
    logError("Library handle became invalid immediately after loading!");
    logError("This confirms the FFI module bug - please recompile the FFI module");
    throw e;
  }

  // --- 调用 add(int, int) ---
  logTest("Test 1: add(int, int)", 'RUNNING');
  const addFunc = FFIModule.getSymbol(ffi, 'add');
  logDebug(`Function pointer for 'add': ${addFunc}`);

  const a = 10, b = 20;
  const result1 = FFIModule.callFunction(ffi, addFunc, 'int', ['int', 'int'], a, b);
  logInfo(`Call: add(${a}, ${b}) = ${result1}, Expected: ${a + b}`);
  if (result1 !== a + b) {
    logTest("add(int, int)", 'FAIL');
    throw new Error("Test failed for add!");
  }
  logTest("add(int, int)", 'PASS');

  // --- 调用 add_double(double, double) ---
  logTest("Test 2: add_double(double, double)", 'RUNNING');
  const addDoubleFunc = FFIModule.getSymbol(ffi, 'add_double');
  logDebug(`Function pointer for 'add_double': ${addDoubleFunc}`);

  const x = 3.14, y = 2.71;
  const result2 = FFIModule.callFunction(ffi, addDoubleFunc, 'double', ['double', 'double'], x, y);
  logInfo(`Call: add_double(${x}, ${y}) = ${result2}, Expected: ${x + y}`);
  // 浮点数比较
  if (Math.abs(result2 - (x + y)) > 1e-9) {
    logTest("add_double(double, double)", 'FAIL');
    throw new Error("Test failed for add_double!");
  }
  logTest("add_double(double, double)", 'PASS');

  // --- 测试整数类型 ---
  console.log("\n[3] Testing integer types:");

  // int8 测试
  const testInt8 = FFIModule.getSymbol(ffi, 'test_int8');
  const int8Result = FFIModule.callFunction(ffi, testInt8, 'int8', ['int8', 'int8'], 12, 5);
  console.log(`  - test_int8(12, 5) = ${int8Result}, Expected: ${12 * 5}`);
  if (int8Result !== 60) throw new Error("Test failed for test_int8!");

  // uint8 测试
  const testUint8 = FFIModule.getSymbol(ffi, 'test_uint8');
  const uint8Result = FFIModule.callFunction(ffi, testUint8, 'uint8', ['uint8', 'uint8'], 200, 50);
  console.log(`  - test_uint8(200, 50) = ${uint8Result}, Expected: ${(200 + 50) & 0xFF}`);
  if (uint8Result !== 250) throw new Error("Test failed for test_uint8!");

  // int16 测试
  const testInt16 = FFIModule.getSymbol(ffi, 'test_int16');
  const int16Result = FFIModule.callFunction(ffi, testInt16, 'int16', ['int16', 'int16'], 1000, 300);
  console.log(`  - test_int16(1000, 300) = ${int16Result}, Expected: ${1000 - 300}`);
  if (int16Result !== 700) throw new Error("Test failed for test_int16!");

  // uint16 测试
  const testUint16 = FFIModule.getSymbol(ffi, 'test_uint16');
  const uint16Result = FFIModule.callFunction(ffi, testUint16, 'uint16', ['uint16', 'uint16'], 30000, 20000);
  console.log(`  - test_uint16(30000, 20000) = ${uint16Result}, Expected: ${30000 + 20000}`);
  if (uint16Result !== 50000) throw new Error("Test failed for test_uint16!");

  // int32 测试
  const testInt32 = FFIModule.getSymbol(ffi, 'test_int32');
  const int32Result = FFIModule.callFunction(ffi, testInt32, 'int32', ['int32', 'int32'], 1000000, 2000000);
  console.log(`  - test_int32(1000000, 2000000) = ${int32Result}, Expected: ${1000000 + 2000000}`);
  if (int32Result !== 3000000) throw new Error("Test failed for test_int32!");

  // uint32 测试
  const testUint32 = FFIModule.getSymbol(ffi, 'test_uint32');
  const uint32Result = FFIModule.callFunction(ffi, testUint32, 'uint32', ['uint32', 'uint32'], 2000000000, 1000000000);
  console.log(`  - test_uint32(2000000000, 1000000000) = ${uint32Result}, Expected: ${3000000000}`);
  if (uint32Result !== 3000000000) throw new Error("Test failed for test_uint32!");

  // --- 测试浮点数类型 ---
  console.log("\n[4] Testing floating point types:");

  // float 测试
  const testFloat = FFIModule.getSymbol(ffi, 'test_float');
  const floatResult = FFIModule.callFunction(ffi, testFloat, 'float', ['float', 'float'], 2.5, 4.0);
  console.log(`  - test_float(2.5, 4.0) = ${floatResult}, Expected: ${2.5 * 4.0}`);
  if (Math.abs(floatResult - 10.0) > 1e-6) throw new Error("Test failed for test_float!");

  // long double 测试
  const testLongDouble = FFIModule.getSymbol(ffi, 'test_longdouble');
  const longDoubleResult = FFIModule.callFunction(ffi, testLongDouble, 'longdouble', ['longdouble', 'longdouble'], 1.23456789, 9.87654321);
  const expectedLongDouble = 1.23456789 + 9.87654321;
  console.log(`  - test_longdouble(1.23456789, 9.87654321) = ${longDoubleResult}, Expected: ${expectedLongDouble}`);
  if (Math.abs(longDoubleResult - expectedLongDouble) > 1e-8) throw new Error("Test failed for test_longdouble!");

  // --- 测试字符类型 ---
  console.log("\n[5] Testing character types:");

  // char 测试
  const testChar = FFIModule.getSymbol(ffi, 'test_char');
  const charResult = FFIModule.callFunction(ffi, testChar, 'char', ['char', 'char'], 65, 90); // 'A' and 'Z'
  console.log(`  - test_char(65='A', 90='Z') = ${charResult} ('${String.fromCharCode(charResult)}')`);
  if (charResult !== 90) throw new Error("Test failed for test_char!");

  // uchar 测试
  const testUchar = FFIModule.getSymbol(ffi, 'test_uchar');
  const ucharResult = FFIModule.callFunction(ffi, testUchar, 'uchar', ['uchar', 'uchar'], 100, 150);
  console.log(`  - test_uchar(100, 150) = ${ucharResult}, Expected: ${(100 + 150) & 0xFF}`);
  if (ucharResult !== 250) throw new Error("Test failed for test_uchar!");

  // --- 测试字符串类型 ---
  console.log("\n[6] Testing string types:");

  // 字符串长度测试
  const testStringLength = FFIModule.getSymbol(ffi, 'test_string_length');
  const testString = "Hello, World!";
  const stringLengthResult = FFIModule.callFunction(ffi, testStringLength, 'int', ['string'], testString);
  console.log(`  - test_string_length("${testString}") = ${stringLengthResult}, Expected: ${testString.length}`);
  if (stringLengthResult !== testString.length) throw new Error("Test failed for test_string_length!");

  // --- 测试 void 类型 ---
  console.log("\n[7] Testing void type:");

  const testVoidFunc = FFIModule.getSymbol(ffi, 'test_void_function');
  const voidResult = FFIModule.callFunction(ffi, testVoidFunc, 'void', ['int'], 42);
  console.log(`  - test_void_function(42) returned: ${voidResult} (should be undefined)`);
  if (voidResult !== undefined) throw new Error("Test failed for test_void_function!");

  // --- 测试混合类型 ---
  console.log("\n[8] Testing mixed types:");

  const testMixed = FFIModule.getSymbol(ffi, 'test_mixed_types');
  const mixedResult = FFIModule.callFunction(ffi, testMixed, 'double', ['int', 'float', 'double', 'uint32'], 10, 2.5, 3.14159, 100);
  const expectedMixed = 10 + 2.5 + 3.14159 + 100;
  console.log(`  - test_mixed_types(10, 2.5, 3.14159, 100) = ${mixedResult}, Expected: ${expectedMixed}`);
  if (Math.abs(mixedResult - expectedMixed) > 1e-5) throw new Error("Test failed for test_mixed_types!");

  // --- 测试数组操作 ---
  logTest("Test 9: Array Operations", 'RUNNING');

  // 首先检查所需的符号是否存在
  logInfo("Checking array function availability...");
  logDebug(`Library handle: ${libHandle} (should be the same as earlier)`);

  // 先测试一个已知工作的函数来验证句柄
  try {
    const testFunc = FFIModule.getSymbol(ffi, 'add');
    logDebug(`Verification: 'add' function still accessible: ${testFunc}`);
  } catch (e) {
    logError("Library handle has become invalid!");
    logError(`Handle verification failed: ${e.message}`);
    throw new Error("Library handle is no longer valid. This indicates the FFI module needs to be recompiled.");
  }

  const arrayFunctions = ['array_copy', 'array_multiply', 'array_sum', 'float_array_process',
    'byte_array_reverse', 'find_max_in_array'];

  const availableFunctions = {};
  let allFunctionsAvailable = true;

  for (const funcName of arrayFunctions) {
    try {
      const funcPtr = FFIModule.getSymbol(ffi, funcName);
      availableFunctions[funcName] = funcPtr;
      logSuccess(`${Colors.GREEN}✓${Colors.RESET} ${funcName} found (ptr: ${funcPtr})`);
    } catch (e) {
      logError(`${Colors.RED}✗${Colors.RESET} ${funcName} not found`);
      logDebug(`  Error: ${e.message}`);

      // 检查是否是 "invalid handle" 错误
      if (e.message.includes("invalid handle")) {
        logError("Invalid handle error detected!");
        logWarning("This means the FFI module's js_ffi_open function has a bug");
        logInfo("The library handle was closed prematurely due to smart pointer auto-destruction");
        logInfo("Please ensure the FFI module has been recompiled with the fixed js_ffi_open function");
        break; // 不需要继续测试其他函数
      }

      allFunctionsAvailable = false;
    }
  }

  if (!allFunctionsAvailable) {
    logWarning("Some array functions are missing from the dynamic library");

    // 尝试检查当前库中存在哪些符号
    logInfo("Analyzing current library...");
    const basicFunctions = ['add', 'add_double', 'test_int8', 'test_uint8', 'test_float'];
    let basicFunctionsWorking = 0;

    for (const funcName of basicFunctions) {
      try {
        FFIModule.getSymbol(ffi, funcName);
        basicFunctionsWorking++;
      } catch (e) {
        // 忽略错误
      }
    }

    console.log(`  ${Colors.CYAN}•${Colors.RESET} Basic functions working: ${basicFunctionsWorking}/${basicFunctions.length}`);

    if (basicFunctionsWorking > 0) {
      logInfo("Library handle is valid, but array functions are missing");
      console.log(`  ${Colors.YELLOW}→${Colors.RESET} This indicates libadd.c was not updated with array functions`);
    }

    logInfo("Step-by-step fix:");
    console.log(`  ${Colors.CYAN}1.${Colors.RESET} Check if libadd.c contains array functions:`);
    console.log(`     ${Colors.BRIGHT}grep -n "array_copy\\|array_multiply" libadd.c${Colors.RESET}`);
    console.log(`  ${Colors.CYAN}2.${Colors.RESET} If functions are missing, ensure libadd.c contains:`);
    console.log(`     ${Colors.DIM}void array_copy(const int* src, int* dest, int size);${Colors.RESET}`);
    console.log(`     ${Colors.DIM}void array_multiply(int* arr, int size, int multiplier);${Colors.RESET}`);
    console.log(`     ${Colors.DIM}int array_sum(const int* arr, int size);${Colors.RESET}`);
    console.log(`     ${Colors.DIM}... and other array functions${Colors.RESET}`);
    console.log(`  ${Colors.CYAN}3.${Colors.RESET} Recompile the library:`);
    console.log(`     ${Colors.BRIGHT}gcc -dynamiclib -o libadd.dylib libadd.c${Colors.RESET}`);
    console.log(`  ${Colors.CYAN}4.${Colors.RESET} Verify symbols are exported:`);
    console.log(`     ${Colors.BRIGHT}nm -gU libadd.dylib | grep -E "(array|test)"${Colors.RESET}`);
    console.log(`  ${Colors.CYAN}5.${Colors.RESET} Expected output should include:`);
    console.log(`     ${Colors.DIM}T _array_copy${Colors.RESET}`);
    console.log(`     ${Colors.DIM}T _array_multiply${Colors.RESET}`);
    console.log(`     ${Colors.DIM}T _array_sum${Colors.RESET}`);

    // 提供完整的数组函数代码示例
    logWarning("If array functions are missing from libadd.c, add this code:");
    console.log(`${Colors.DIM}
    // Array operation functions - add these to libadd.c:

    __attribute__((visibility("default")))
    void array_copy(const int* src, int* dest, int size) {
      for (int i = 0; i < size; i++) {
          dest[i] = src[i];
      }
    }

    __attribute__((visibility("default")))
    void array_multiply(int* arr, int size, int multiplier) {
      for (int i = 0; i < size; i++) {
          arr[i] *= multiplier;
      }
    }

    __attribute__((visibility("default")))
    int array_sum(const int* arr, int size) {
      int sum = 0;
      for (int i = 0; i < size; i++) {
          sum += arr[i];
      }
      return sum;
    }
    ${Colors.RESET}`);

    logTest("Array Operations", 'SKIP');
    logWarning("Continuing with available tests only...");
  } else {
    // 测试数组拷贝
    console.log("\n  Testing array_copy:");
    const srcArray = [10, 20, 30, 40, 50];
    const arraySize = srcArray.length;

    // 分配内存
    const srcPtr = FFIModule.allocateMemory(ffi, arraySize * 4); // 4 bytes per int
    const destPtr = FFIModule.allocateMemory(ffi, arraySize * 4);

    // 写入源数组
    FFIModule.writeArrayToMemory(ffi, srcPtr, srcArray, 'int', arraySize);

    // 调用 C 函数进行拷贝
    const arrayCopyFunc = availableFunctions['array_copy'];
    FFIModule.callFunction(ffi, arrayCopyFunc, 'void', ['pointer', 'pointer', 'int'], srcPtr, destPtr, arraySize);

    // 读取结果
    const copiedArray = FFIModule.readArrayFromMemory(ffi, destPtr, 'int', arraySize);
    console.log(`    Original: [${srcArray.join(', ')}]`);
    console.log(`    Copied:   [${copiedArray.join(', ')}]`);

    // 验证结果
    for (let i = 0; i < arraySize; i++) {
      if (copiedArray[i] !== srcArray[i]) {
        throw new Error(`Array copy failed at index ${i}: expected ${srcArray[i]}, got ${copiedArray[i]}`);
      }
    }

    // 测试数组乘法（修改原数组）
    console.log("\n  Testing array_multiply:");
    const multiplier = 3;
    const arrayMultiplyFunc = availableFunctions['array_multiply'];
    FFIModule.callFunction(ffi, arrayMultiplyFunc, 'void', ['pointer', 'int', 'int'], destPtr, arraySize, multiplier);

    const multipliedArray = FFIModule.readArrayFromMemory(ffi, destPtr, 'int', arraySize);
    console.log(`    After multiply by ${multiplier}: [${multipliedArray.join(', ')}]`);

    // 验证结果
    for (let i = 0; i < arraySize; i++) {
      const expected = srcArray[i] * multiplier;
      if (multipliedArray[i] !== expected) {
        throw new Error(`Array multiply failed at index ${i}: expected ${expected}, got ${multipliedArray[i]}`);
      }
    }

    // 测试数组求和
    console.log("\n  Testing array_sum:");
    const arraySumFunc = availableFunctions['array_sum'];
    const sumResult = FFIModule.callFunction(ffi, arraySumFunc, 'int', ['pointer', 'int'], destPtr, arraySize);
    const expectedSum = multipliedArray.reduce((a, b) => a + b, 0);
    console.log(`    Sum result: ${sumResult}, Expected: ${expectedSum}`);
    if (sumResult !== expectedSum) {
      throw new Error(`Array sum failed: expected ${expectedSum}, got ${sumResult}`);
    }

    // 测试浮点数组处理
    console.log("\n  Testing float_array_process:");
    const floatInput = [1.5, 2.5, 3.5, 4.5];
    const floatSize = floatInput.length;

    const floatInputPtr = FFIModule.allocateMemory(ffi, floatSize * 4); // 4 bytes per float
    const floatOutputPtr = FFIModule.allocateMemory(ffi, floatSize * 4);

    FFIModule.writeArrayToMemory(ffi, floatInputPtr, floatInput, 'float', floatSize);

    const floatProcessFunc = availableFunctions['float_array_process'];
    FFIModule.callFunction(ffi, floatProcessFunc, 'void', ['pointer', 'pointer', 'int'], floatInputPtr, floatOutputPtr, floatSize);

    const floatOutput = FFIModule.readArrayFromMemory(ffi, floatOutputPtr, 'float', floatSize);
    console.log(`    Input:  [${floatInput.join(', ')}]`);
    console.log(`    Output: [${floatOutput.map(f => f.toFixed(1)).join(', ')}]`);

    // 验证结果 (output[i] = input[i] * 2 + 1)
    for (let i = 0; i < floatSize; i++) {
      const expected = floatInput[i] * 2.0 + 1.0;
      if (Math.abs(floatOutput[i] - expected) > 1e-6) {
        throw new Error(`Float array process failed at index ${i}: expected ${expected}, got ${floatOutput[i]}`);
      }
    }

    // 测试字节数组反转
    console.log("\n  Testing byte_array_reverse:");
    const byteArray = [1, 2, 3, 4, 5, 6];
    const byteSize = byteArray.length;

    const bytePtr = FFIModule.allocateMemory(ffi, byteSize);
    FFIModule.writeArrayToMemory(ffi, bytePtr, byteArray, 'uint8', byteSize);

    const byteReverseFunc = availableFunctions['byte_array_reverse'];
    FFIModule.callFunction(ffi, byteReverseFunc, 'void', ['pointer', 'int'], bytePtr, byteSize);

    const reversedArray = FFIModule.readArrayFromMemory(ffi, bytePtr, 'uint8', byteSize);
    console.log(`    Original: [${byteArray.join(', ')}]`);
    console.log(`    Reversed: [${reversedArray.join(', ')}]`);

    // 验证结果
    for (let i = 0; i < byteSize; i++) {
      if (reversedArray[i] !== byteArray[byteSize - 1 - i]) {
        throw new Error(`Byte array reverse failed at index ${i}`);
      }
    }

    // 测试输出参数（找到最大值和索引）
    console.log("\n  Testing find_max_in_array with output parameter:");
    const testArray = [15, 3, 42, 7, 28, 9];
    const testSize = testArray.length;

    const testArrayPtr = FFIModule.allocateMemory(ffi, testSize * 4);
    const maxIndexPtr = FFIModule.allocateMemory(ffi, 4); // 存储 int 类型的索引

    FFIModule.writeArrayToMemory(ffi, testArrayPtr, testArray, 'int', testSize);

    const findMaxFunc = availableFunctions['find_max_in_array'];
    const maxValue = FFIModule.callFunction(ffi, findMaxFunc, 'int', ['pointer', 'int', 'pointer'], testArrayPtr, testSize, maxIndexPtr);

    const maxIndex = FFIModule.readArrayFromMemory(ffi, maxIndexPtr, 'int', 1)[0];
    console.log(`    Array: [${testArray.join(', ')}]`);
    console.log(`    Max value: ${maxValue} at index: ${maxIndex}`);

    // 验证结果
    const expectedMaxValue = Math.max(...testArray);
    const expectedMaxIndex = testArray.indexOf(expectedMaxValue);
    if (maxValue !== expectedMaxValue || maxIndex !== expectedMaxIndex) {
      throw new Error(`Find max failed: expected max=${expectedMaxValue} at index=${expectedMaxIndex}, got max=${maxValue} at index=${maxIndex}`);
    }

    // 释放所有分配的内存
    FFIModule.freeMemory(ffi, srcPtr);
    FFIModule.freeMemory(ffi, destPtr);
    FFIModule.freeMemory(ffi, floatInputPtr);
    FFIModule.freeMemory(ffi, floatOutputPtr);
    FFIModule.freeMemory(ffi, bytePtr);
    FFIModule.freeMemory(ffi, testArrayPtr);
    FFIModule.freeMemory(ffi, maxIndexPtr);

    console.log("\n  All array tests passed!");
  } // 结束 allFunctionsAvailable 的 if 块

  FFIModule.close(ffi);
  logSuccess("Library closed successfully");

  // 如果有跳过的测试，提供额外的帮助信息
  if (!allFunctionsAvailable) {
    console.log(`\n${Colors.BRIGHT}${Colors.YELLOW}=== Tests Completed with Skipped Items ===${Colors.RESET}`);
    logWarning("Some tests were skipped due to missing array functions");
    console.log(`\n${Colors.BRIGHT}Quick Fix Commands:${Colors.RESET}`);
    console.log(`${Colors.GREEN}# Check current directory${Colors.RESET}`);
    console.log(`ls -la *.c *.dylib`);
    console.log(`\n${Colors.GREEN}# Verify libadd.c content${Colors.RESET}`);
    console.log(`wc -l libadd.c && grep -c "array_" libadd.c`);
    console.log(`\n${Colors.GREEN}# Recompile if needed${Colors.RESET}`);
    console.log(`gcc -dynamiclib -o libadd.dylib libadd.c`);
    console.log(`\n${Colors.GREEN}# Verify symbols${Colors.RESET}`);
    console.log(`nm -gU libadd.dylib | grep array`);
  } else {
    console.log(`\n${Colors.BRIGHT}${Colors.GREEN}=== All Tests Passed Successfully ===${Colors.RESET}`);
  }
} catch (e) {
  console.log(`\n${Colors.BRIGHT}${Colors.RED}=== Demo Failed ===${Colors.RESET}`);
  logError(`${e.message}`);
  if (e.stack) {
    logDebug("Stack trace:");
    console.log(`${Colors.DIM}${e.stack}${Colors.RESET}`);
  }

  // 添加一些诊断信息
  logInfo("Diagnostic Information:");
  console.log(`  ${Colors.CYAN}•${Colors.RESET} Current working directory: ${os.getcwd()}`);
  console.log(`  ${Colors.CYAN}•${Colors.RESET} Platform: ${os.platform}`);

  // 检查文件是否存在
  try {
    const libSuffix = (os.platform === 'win32' ? '.dll' : (os.platform === 'darwin' ? '.dylib' : '.so'));
    const libPath = './libadd' + libSuffix;
    const stat = os.stat(libPath);
    console.log(`  ${Colors.CYAN}•${Colors.RESET} Library file: ${libPath} (${stat.size} bytes)`);
  } catch (fileErr) {
    console.log(`  ${Colors.CYAN}•${Colors.RESET} Library file: ${Colors.RED}NOT FOUND${Colors.RESET}`);
  }

  std.exit(1);
}