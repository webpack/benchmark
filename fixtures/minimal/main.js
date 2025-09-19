// Top-level variable
const message = "Hello, bundler!";

// Arrow function
const greet = (name = "World") => `Hello, ${name}`;

// Named function
function add(a, b) {
  return a + b;
}

// Object using functions
const data = {
  value: 42,
  greet,
  sum: add(10, 32),
};

// Immediately use default-like function
function main() {
  console.log(greet());
  console.log(`Sum of 2 and 3 is ${add(2, 3)}`);
  const cnt = new Counter();
  cnt.increment();
  console.log(`Counter after increment: ${cnt.count}`);
  console.log(`Array length: ${arr.length}`);
  console.log(`First: ${first}, Rest: ${rest}`);
  console.log(`Optional chaining: ${arr?.length}`);
  console.log(`Nullish coalescing: ${foo}`);
  wait(10).then(() => console.log("Waited 10ms"));
}
main();

// Class with static and instance methods
class Counter {
  static start = 0;
  count = Counter.start;
  increment() {
    this.count++;
  }
}

// Destructuring + spread
const arr = [1, 2, 3];
const [first, ...rest] = arr;

// Optional chaining
const length = arr?.length;

// Nullish coalescing
const foo = null ?? "fallback";

// Promise
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Export everything used
module.exports = {
  message,
  greet,
  add,
  data,
  Counter,
  arr,
  first,
  rest,
  length,
  foo,
  wait,
  main,
};
