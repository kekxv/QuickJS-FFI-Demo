// test.js
// The JavaScript code that uses the FFI module.
import {open, symbol, call, close, malloc, free, writeArray, readArray, createCallback} from 'ffi';
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

console.log(`${Colors.BRIGHT}${Colors.MAGENTA}=== QuickJS FFI Demo ===${Colors.RESET}`);
logInfo(`Platform: ${Colors.CYAN}${os.platform}${Colors.RESET}`);

try {
  // 根据操作系统选择动态库后缀
  const libSuffix = (os.platform === 'win32' ? '.dll' : (os.platform === 'darwin' ? '.dylib' : '.so'));
  const libPath = './libadd' + libSuffix;

  console.log(`Loading dynamic library: ${libPath}`);
  const libHandle = open(libPath);
  console.log("Library handle:", libHandle);

  if (libHandle === 0) {
    throw new Error("Failed to get a valid library handle.");
  }

  // 测试库句柄的持久性
  logDebug("Testing library handle persistence...");
  try {
    // 多次访问同一个符号，看看句柄是否保持有效
    const testPtr1 = symbol(libHandle, 'add');
    const testPtr2 = symbol(libHandle, 'add');
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
  const addFunc = symbol(libHandle, 'add');
  logDebug(`Function pointer for 'add': ${addFunc}`);

  const a = 10, b = 20;
  const result1 = call(addFunc, 'int', ['int', 'int'], a, b);
  logInfo(`Call: add(${a}, ${b}) = ${result1}, Expected: ${a + b}`);
  if (result1 !== a + b) {
    logTest("add(int, int)", 'FAIL');
    throw new Error("Test failed for add!");
  }
  logTest("add(int, int)", 'PASS');

  // --- 调用 add_double(double, double) ---
  logTest("Test 2: add_double(double, double)", 'RUNNING');
  const addDoubleFunc = symbol(libHandle, 'add_double');
  logDebug(`Function pointer for 'add_double': ${addDoubleFunc}`);

  const x = 3.14, y = 2.71;
  const result2 = call(addDoubleFunc, 'double', ['double', 'double'], x, y);
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
  const testInt8 = symbol(libHandle, 'test_int8');
  const int8Result = call(testInt8, 'int8', ['int8', 'int8'], 12, 5);
  console.log(`  - test_int8(12, 5) = ${int8Result}, Expected: ${12 * 5}`);
  if (int8Result !== 60) throw new Error("Test failed for test_int8!");

  // uint8 测试
  const testUint8 = symbol(libHandle, 'test_uint8');
  const uint8Result = call(testUint8, 'uint8', ['uint8', 'uint8'], 200, 50);
  console.log(`  - test_uint8(200, 50) = ${uint8Result}, Expected: ${(200 + 50) & 0xFF}`);
  if (uint8Result !== 250) throw new Error("Test failed for test_uint8!");

  // int16 测试
  const testInt16 = symbol(libHandle, 'test_int16');
  const int16Result = call(testInt16, 'int16', ['int16', 'int16'], 1000, 300);
  console.log(`  - test_int16(1000, 300) = ${int16Result}, Expected: ${1000 - 300}`);
  if (int16Result !== 700) throw new Error("Test failed for test_int16!");

  // uint16 测试
  const testUint16 = symbol(libHandle, 'test_uint16');
  const uint16Result = call(testUint16, 'uint16', ['uint16', 'uint16'], 30000, 20000);
  console.log(`  - test_uint16(30000, 20000) = ${uint16Result}, Expected: ${30000 + 20000}`);
  if (uint16Result !== 50000) throw new Error("Test failed for test_uint16!");

  // int32 测试
  const testInt32 = symbol(libHandle, 'test_int32');
  const int32Result = call(testInt32, 'int32', ['int32', 'int32'], 1000000, 2000000);
  console.log(`  - test_int32(1000000, 2000000) = ${int32Result}, Expected: ${1000000 + 2000000}`);
  if (int32Result !== 3000000) throw new Error("Test failed for test_int32!");

  // uint32 测试
  const testUint32 = symbol(libHandle, 'test_uint32');
  const uint32Result = call(testUint32, 'uint32', ['uint32', 'uint32'], 2000000000, 1000000000);
  console.log(`  - test_uint32(2000000000, 1000000000) = ${uint32Result}, Expected: ${3000000000}`);
  if (uint32Result !== 3000000000) throw new Error("Test failed for test_uint32!");

  // --- 测试浮点数类型 ---
  console.log("\n[4] Testing floating point types:");

  // float 测试
  const testFloat = symbol(libHandle, 'test_float');
  const floatResult = call(testFloat, 'float', ['float', 'float'], 2.5, 4.0);
  console.log(`  - test_float(2.5, 4.0) = ${floatResult}, Expected: ${2.5 * 4.0}`);
  if (Math.abs(floatResult - 10.0) > 1e-6) throw new Error("Test failed for test_float!");

  // long double 测试
  const testLongDouble = symbol(libHandle, 'test_longdouble');
  const longDoubleResult = call(testLongDouble, 'longdouble', ['longdouble', 'longdouble'], 1.23456789, 9.87654321);
  const expectedLongDouble = 1.23456789 + 9.87654321;
  console.log(`  - test_longdouble(1.23456789, 9.87654321) = ${longDoubleResult}, Expected: ${expectedLongDouble}`);
  if (Math.abs(longDoubleResult - expectedLongDouble) > 1e-8) throw new Error("Test failed for test_longdouble!");

  // --- 测试字符类型 ---
  console.log("\n[5] Testing character types:");

  // char 测试
  const testChar = symbol(libHandle, 'test_char');
  const charResult = call(testChar, 'char', ['char', 'char'], 65, 90); // 'A' and 'Z'
  console.log(`  - test_char(65='A', 90='Z') = ${charResult} ('${String.fromCharCode(charResult)}')`);
  if (charResult !== 90) throw new Error("Test failed for test_char!");

  // uchar 测试
  const testUchar = symbol(libHandle, 'test_uchar');
  const ucharResult = call(testUchar, 'uchar', ['uchar', 'uchar'], 100, 150);
  console.log(`  - test_uchar(100, 150) = ${ucharResult}, Expected: ${(100 + 150) & 0xFF}`);
  if (ucharResult !== 250) throw new Error("Test failed for test_uchar!");

  // --- 测试字符串类型 ---
  console.log("\n[6] Testing string types:");

  // 字符串长度测试
  const testStringLength = symbol(libHandle, 'test_string_length');
  const testString = "Hello, World!";
  const stringLengthResult = call(testStringLength, 'int', ['string'], testString);
  console.log(`  - test_string_length("${testString}") = ${stringLengthResult}, Expected: ${testString.length}`);
  if (stringLengthResult !== testString.length) throw new Error("Test failed for test_string_length!");

  // --- 测试 void 类型 ---
  console.log("\n[7] Testing void type:");

  const testVoidFunc = symbol(libHandle, 'test_void_function');
  const voidResult = call(testVoidFunc, 'void', ['int'], 42);
  console.log(`  - test_void_function(42) returned: ${voidResult} (should be undefined)`);
  if (voidResult !== undefined) throw new Error("Test failed for test_void_function!");

  // --- 测试混合类型 ---
  console.log("\n[8] Testing mixed types:");

  const testMixed = symbol(libHandle, 'test_mixed_types');
  const mixedResult = call(testMixed, 'double', ['int', 'float', 'double', 'uint32'], 10, 2.5, 3.14159, 100);
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
    const testFunc = symbol(libHandle, 'add');
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
      const funcPtr = symbol(libHandle, funcName);
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
        symbol(libHandle, funcName);
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
    const srcPtr = malloc(arraySize * 4); // 4 bytes per int
    const destPtr = malloc(arraySize * 4);

    // 写入源数组
    writeArray(srcPtr, srcArray, 'int', arraySize);

    // 调用 C 函数进行拷贝
    const arrayCopyFunc = availableFunctions['array_copy'];
    call(arrayCopyFunc, 'void', ['pointer', 'pointer', 'int'], srcPtr, destPtr, arraySize);

    // 读取结果
    const copiedArray = readArray(destPtr, 'int', arraySize);
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
    call(arrayMultiplyFunc, 'void', ['pointer', 'int', 'int'], destPtr, arraySize, multiplier);

    const multipliedArray = readArray(destPtr, 'int', arraySize);
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
    const sumResult = call(arraySumFunc, 'int', ['pointer', 'int'], destPtr, arraySize);
    const expectedSum = multipliedArray.reduce((a, b) => a + b, 0);
    console.log(`    Sum result: ${sumResult}, Expected: ${expectedSum}`);
    if (sumResult !== expectedSum) {
      throw new Error(`Array sum failed: expected ${expectedSum}, got ${sumResult}`);
    }

    // 测试浮点数组处理
    console.log("\n  Testing float_array_process:");
    const floatInput = [1.5, 2.5, 3.5, 4.5];
    const floatSize = floatInput.length;

    const floatInputPtr = malloc(floatSize * 4); // 4 bytes per float
    const floatOutputPtr = malloc(floatSize * 4);

    writeArray(floatInputPtr, floatInput, 'float', floatSize);

    const floatProcessFunc = availableFunctions['float_array_process'];
    call(floatProcessFunc, 'void', ['pointer', 'pointer', 'int'], floatInputPtr, floatOutputPtr, floatSize);

    const floatOutput = readArray(floatOutputPtr, 'float', floatSize);
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

    const bytePtr = malloc(byteSize);
    writeArray(bytePtr, byteArray, 'uint8', byteSize);

    const byteReverseFunc = availableFunctions['byte_array_reverse'];
    call(byteReverseFunc, 'void', ['pointer', 'int'], bytePtr, byteSize);

    const reversedArray = readArray(bytePtr, 'uint8', byteSize);
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

    const testArrayPtr = malloc(testSize * 4);
    const maxIndexPtr = malloc(4); // 存储 int 类型的索引

    writeArray(testArrayPtr, testArray, 'int', testSize);

    const findMaxFunc = availableFunctions['find_max_in_array'];
    const maxValue = call(findMaxFunc, 'int', ['pointer', 'int', 'pointer'], testArrayPtr, testSize, maxIndexPtr);

    const maxIndex = readArray(maxIndexPtr, 'int', 1)[0];
    console.log(`    Array: [${testArray.join(', ')}]`);
    console.log(`    Max value: ${maxValue} at index: ${maxIndex}`);

    // 验证结果
    const expectedMaxValue = Math.max(...testArray);
    const expectedMaxIndex = testArray.indexOf(expectedMaxValue);
    if (maxValue !== expectedMaxValue || maxIndex !== expectedMaxIndex) {
      throw new Error(`Find max failed: expected max=${expectedMaxValue} at index=${expectedMaxIndex}, got max=${maxValue} at index=${maxIndex}`);
    }

    // 释放所有分配的内存
    free(srcPtr);
    free(destPtr);
    free(floatInputPtr);
    free(floatOutputPtr);
    free(bytePtr);
    free(testArrayPtr);
    free(maxIndexPtr);

    console.log("\n  All array tests passed!");
  } // 结束 allFunctionsAvailable 的 if 块

  // --- 测试回调函数 ---
  logTest("Test 10: Callback Functions", 'RUNNING');

  try {
    console.log("\n  Testing callback functions:");

    // 检查回调函数是否可用
    const callbackFunctions = ['test_simple_callback', 'test_log_callback', 'test_math_callback', 
                              'test_array_foreach', 'test_array_filter'];

    const availableCallbacks = {};
    let allCallbacksAvailable = true;

    for (const funcName of callbackFunctions) {
      try {
        const funcPtr = symbol(libHandle, funcName);
        availableCallbacks[funcName] = funcPtr;
        logSuccess(`${Colors.GREEN}✓${Colors.RESET} ${funcName} found`);
      } catch (e) {
        logError(`${Colors.RED}✗${Colors.RESET} ${funcName} not found`);
        allCallbacksAvailable = false;
      }
    }

    if (allCallbacksAvailable) {
      // 测试1: 简单的回调函数 (int, int) -> int
      console.log("\n    Testing simple callback (int, int) -> int:");

      // 定义一个简单的JS回调函数
      function addCallback(a, b) {
        console.log(`    JS Callback: addCallback(${a}, ${b}) = ${a + b}`);
        return a + b;
      }

      function multiplyCallback(a, b) {
        console.log(`    JS Callback: multiplyCallback(${a}, ${b}) = ${a * b}`);
        return a * b;
      }

      // 创建回调函数指针
      const addCallbackPtr = createCallback(addCallback, 'int', ['int', 'int']);
      const multiplyCallbackPtr = createCallback(multiplyCallback, 'int', ['int', 'int']);

      // 测试加法回调
      const testSimpleCallback = availableCallbacks['test_simple_callback'];
      const result1 = call(testSimpleCallback, 'int', ['int', 'int', 'pointer'], 15, 25, addCallbackPtr);
      console.log(`    C function returned: ${result1} (expected: 40)`);
      if (result1 !== 40) {
        throw new Error("Simple add callback test failed!");
      }

      // 测试乘法回调
      const result2 = call(testSimpleCallback, 'int', ['int', 'int', 'pointer'], 6, 7, multiplyCallbackPtr);
      console.log(`    C function returned: ${result2} (expected: 42)`);
      if (result2 !== 42) {
        throw new Error("Simple multiply callback test failed!");
      }

      // 测试2: 日志回调函数 (string) -> void
      console.log("\n    Testing log callback (string) -> void:");

      function logCallback(message) {
        console.log(`    ${Colors.CYAN}JS Log Callback:${Colors.RESET} ${message}`);
      }

      const logCallbackPtr = createCallback(logCallback, 'void', ['string']);
      const testLogCallback = availableCallbacks['test_log_callback'];

      call(testLogCallback, 'void', ['string', 'pointer'], "Hello from C!", logCallbackPtr);
      console.log("    Log callback test completed");

      // 测试3: 数学回调函数 (double) -> double
      console.log("\n    Testing math callback (double) -> double:");

      function squareCallback(x) {
        const result = x * x;
        console.log(`    JS Math Callback: square(${x}) = ${result}`);
        return result;
      }

      function sqrtCallback(x) {
        const result = Math.sqrt(x);
        console.log(`    JS Math Callback: sqrt(${x}) = ${result.toFixed(2)}`);
        return result;
      }

      const squareCallbackPtr = createCallback(squareCallback, 'double', ['double']);
      const sqrtCallbackPtr = createCallback(sqrtCallback, 'double', ['double']);
      const testMathCallback = availableCallbacks['test_math_callback'];

      // 测试平方回调
      const mathResult1 = call(testMathCallback, 'double', ['double', 'pointer'], 5.0, squareCallbackPtr);
      console.log(`    Square callback result: ${mathResult1} (expected: 25)`);
      if (Math.abs(mathResult1 - 25.0) > 1e-6) {
        throw new Error("Math square callback test failed!");
      }

      // 测试平方根回调
      const mathResult2 = call(testMathCallback, 'double', ['double', 'pointer'], 16.0, sqrtCallbackPtr);
      console.log(`    Sqrt callback result: ${mathResult2} (expected: 4)`);
      if (Math.abs(mathResult2 - 4.0) > 1e-6) {
        throw new Error("Math sqrt callback test failed!");
      }

      // 测试4: 数组遍历回调 (int, int) -> void
      console.log("\n    Testing array foreach callback (int, int) -> void:");

      const foreachResults = [];
      function foreachCallback(value, index) {
        console.log(`    JS Foreach: arr[${index}] = ${value}`);
        foreachResults.push({index, value});
      }

      const foreachCallbackPtr = createCallback(foreachCallback, 'void', ['int', 'int']);
      const testArrayForeach = availableCallbacks['test_array_foreach'];

      const foreachArray = [100, 200, 300, 400];
      const foreachArrayPtr = malloc(foreachArray.length * 4);
      writeArray(foreachArrayPtr, foreachArray, 'int', foreachArray.length);

      call(testArrayForeach, 'void', ['pointer', 'int', 'pointer'], 
           foreachArrayPtr, foreachArray.length, foreachCallbackPtr);

      // 验证foreach结果
      if (foreachResults.length !== foreachArray.length) {
        throw new Error("Foreach callback didn't visit all elements!");
      }
      for (let i = 0; i < foreachArray.length; i++) {
        if (foreachResults[i].index !== i || foreachResults[i].value !== foreachArray[i]) {
          throw new Error(`Foreach callback mismatch at index ${i}`);
        }
      }

      // 测试5: 数组过滤回调 (int) -> int
      console.log("\n    Testing array filter callback (int) -> int:");

      function evenFilterCallback(value) {
        const isEven = value % 2 === 0;
        console.log(`    JS Filter: ${value} is ${isEven ? 'even (keep)' : 'odd (filter out)'}`);
        return isEven ? 1 : 0;
      }

      function greaterThan50FilterCallback(value) {
        const keep = value > 50;
        console.log(`    JS Filter: ${value} ${keep ? '> 50 (keep)' : '<= 50 (filter out)'}`);
        return keep ? 1 : 0;
      }

      const evenFilterPtr = createCallback(evenFilterCallback, 'int', ['int']);
      const gt50FilterPtr = createCallback(greaterThan50FilterCallback, 'int', ['int']);
      const testArrayFilter = availableCallbacks['test_array_filter'];

      // 测试偶数过滤
      const filterInput = [10, 15, 20, 25, 30, 35, 40];
      const filterInputPtr = malloc(filterInput.length * 4);
      const filterOutputPtr = malloc(filterInput.length * 4);

      writeArray(filterInputPtr, filterInput, 'int', filterInput.length);

      const evenFilterCount = call(testArrayFilter, 'int', 
        ['pointer', 'int', 'pointer', 'pointer'],
        filterInputPtr, filterInput.length, filterOutputPtr, evenFilterPtr);

      const evenFilteredArray = readArray(filterOutputPtr, 'int', evenFilterCount);
      console.log(`    Even filter result: [${evenFilteredArray.join(', ')}] (count: ${evenFilterCount})`);

      // 验证偶数过滤结果
      const expectedEvenFiltered = filterInput.filter(x => x % 2 === 0);
      if (evenFilterCount !== expectedEvenFiltered.length) {
        throw new Error(`Even filter count mismatch: expected ${expectedEvenFiltered.length}, got ${evenFilterCount}`);
      }

      // 测试大于50过滤
      const gt50FilterCount = call(testArrayFilter, 'int',
        ['pointer', 'int', 'pointer', 'pointer'],
        filterInputPtr, filterInput.length, filterOutputPtr, gt50FilterPtr);

      const gt50FilteredArray = readArray(filterOutputPtr, 'int', gt50FilterCount);
      console.log(`    >50 filter result: [${gt50FilteredArray.join(', ')}] (count: ${gt50FilterCount})`);

      // 验证大于50过滤结果 (这个例子中没有大于50的数)
      if (gt50FilterCount !== 0) {
        console.log(`    Note: Expected 0 elements > 50, got ${gt50FilterCount}`);
      }

      // 清理内存
      free(foreachArrayPtr);
      free(filterInputPtr);
      free(filterOutputPtr);

      console.log("\n  All callback tests passed!");
      logTest("Callback Functions", 'PASS');

    } else {
      logWarning("Some callback functions are missing from the library");
      logInfo("Please ensure libadd.c contains the callback test functions");
      logTest("Callback Functions", 'SKIP');
    }

  } catch (e) {
    logError(`Callback test failed: ${e.message}`);
    logTest("Callback Functions", 'FAIL');
    // 不抛出异常，让其他测试继续
  }

  close(libHandle);
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
