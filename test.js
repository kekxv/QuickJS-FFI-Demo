// test.js
// The JavaScript code that uses the FFI module.
import {open, symbol, call, close} from 'ffi';
import * as std from 'std';
import * as os from 'os';

console.log("--- QuickJS FFI Demo ---");
console.log("--- platform:" + os.platform + " ---");

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

  // --- 调用 add(int, int) ---
  console.log("\n[1] Calling C function: add(int, int)");
  const addFunc = symbol(libHandle, 'add');
  console.log("  - Function pointer for 'add':", addFunc);

  const a = 10, b = 20;
  const result1 = call(addFunc, 'int', ['int', 'int'], a, b);
  console.log(`  - JS call: add(${a}, ${b})`);
  console.log(`  - JS result: ${result1}, Expected: ${a + b}`);
  if (result1 !== a + b) throw new Error("Test failed for add!");

  // --- 调用 add_double(double, double) ---
  console.log("\n[2] Calling C function: add_double(double, double)");
  const addDoubleFunc = symbol(libHandle, 'add_double');
  console.log("  - Function pointer for 'add_double':", addDoubleFunc);

  const x = 3.14, y = 2.71;
  const result2 = call(addDoubleFunc, 'double', ['double', 'double'], x, y);
  console.log(`  - JS call: add_double(${x}, ${y})`);
  console.log(`  - JS result: ${result2}, Expected: ${x + y}`);
  // 浮点数比较
  if (Math.abs(result2 - (x + y)) > 1e-9) throw new Error("Test failed for add_double!");

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

  close(libHandle);
  console.log("\nLibrary closed successfully.");
  console.log("--- All Tests Passed Successfully ---");

} catch (e) {
  console.log('\n--- Demo Failed ---');
  console.log('Error:', e.message);
  if (e.stack) {
    console.log(e.stack);
  }
  std.exit(1);
}
