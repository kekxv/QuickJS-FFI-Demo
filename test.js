// test.js
// The JavaScript code that uses the FFI module.
import { open, symbol, call, close } from 'ffi';
import * as std from 'std';

console.log("--- QuickJS FFI Demo ---");

try {
    // 根据操作系统选择动态库后缀
    const libSuffix = (std.os === 'win' ? '.dll' : (std.os === 'mac' ? '.dylib' : '.so'));
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
    if (Math.abs(result2 - (x+y)) > 1e-9) throw new Error("Test failed for add_double!");

    

    close(libHandle);
    console.log("\nLibrary closed successfully.");
    console.log("--- Demo Finished Successfully ---");

} catch (e) {
    console.log('\n--- Demo Failed ---');
    console.log('Error:', e.message);
    if (e.stack) {
        console.log(e.stack);
    }
    std.exit(1);
}
