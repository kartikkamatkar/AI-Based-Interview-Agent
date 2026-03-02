export const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
};

export const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
  java: "Java",
  go: "Go",
};

export const MONACO_LANGUAGE_MAP = {
  javascript: "javascript",
  python: "python",
  cpp: "cpp",
  java: "java",
  go: "go",
};

export const problems = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
        explanation: "",
      },
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists.",
    ],
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
      { input: "[3,3]\n6", expectedOutput: "[0,1]" },
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your solution here
};

// Read input
const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
const nums = JSON.parse(lines[0]);
const target = parseInt(lines[1]);
console.log(JSON.stringify(twoSum(nums, target)));`,

      python: `import sys
import json

def twoSum(nums, target):
    # Your solution here
    pass

lines = sys.stdin.read().strip().split('\\n')
nums = json.loads(lines[0])
target = int(lines[1])
print(json.dumps(twoSum(nums, target)))`,

      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}

int main() {
    // Input parsing
    string line;
    getline(cin, line);
    // Parse nums from JSON-like string
    vector<int> nums;
    stringstream ss(line.substr(1, line.size()-2));
    string token;
    while(getline(ss, token, ',')) nums.push_back(stoi(token));
    int target;
    cin >> target;
    
    auto res = twoSum(nums, target);
    cout << "[" << res[0] << "," << res[1] << "]" << endl;
    return 0;
}`,

      java: `import java.util.*;
import java.io.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        // Your solution here
        return new int[]{};
    }
    
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        String line = sc.nextLine().trim();
        line = line.substring(1, line.length()-1);
        String[] parts = line.split(",");
        int[] nums = new int[parts.length];
        for(int i=0; i<parts.length; i++) nums[i] = Integer.parseInt(parts[i].trim());
        int target = sc.nextInt();
        int[] res = twoSum(nums, target);
        System.out.println("[" + res[0] + "," + res[1] + "]");
    }
}`,

      go: `package main

import (
    "bufio"
    "encoding/json"
    "fmt"
    "os"
    "strconv"
    "strings"
)

func twoSum(nums []int, target int) []int {
    // Your solution here
    return nil
}

func main() {
    reader := bufio.NewReader(os.Stdin)
    line1, _ := reader.ReadString('\\n')
    line1 = strings.TrimSpace(line1)
    var nums []int
    json.Unmarshal([]byte(line1), &nums)
    line2, _ := reader.ReadString('\\n')
    target, _ := strconv.Atoi(strings.TrimSpace(line2))
    res := twoSum(nums, target)
    fmt.Printf("[%d,%d]\\n", res[0], res[1])
}`,
    },
  },
  {
    id: 2,
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is **valid**.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: "true", explanation: "" },
      { input: 's = "()[]{}"', output: "true", explanation: "" },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "",
      },
    ],
    constraints: [
      "1 ≤ s.length ≤ 10⁴",
      "s consists of parentheses only '()[]{}'",
    ],
    testCases: [
      { input: "()", expectedOutput: "true" },
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" },
    ],
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function(s) {
    // Your solution here
};

const s = require('fs').readFileSync('/dev/stdin','utf8').trim();
console.log(String(isValid(s)));`,

      python: `import sys

def isValid(s: str) -> bool:
    # Your solution here
    pass

s = sys.stdin.read().strip()
print(str(isValid(s)).lower())`,

      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isValid(string s) {
    // Your solution here
    return false;
}

int main() {
    string s;
    cin >> s;
    cout << (isValid(s) ? "true" : "false") << endl;
    return 0;
}`,

      java: `import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        // Your solution here
        return false;
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine().trim();
        System.out.println(isValid(s) ? "true" : "false");
    }
}`,

      go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func isValid(s string) bool {
    // Your solution here
    return false
}

func main() {
    reader := bufio.NewReader(os.Stdin)
    s, _ := reader.ReadString('\\n')
    s = strings.TrimSpace(s)
    if isValid(s) {
        fmt.Println("true")
    } else {
        fmt.Println("false")
    }
}`,
    },
  },
  {
    id: 3,
    title: "Palindrome Number",
    difficulty: "Easy",
    tags: ["Math"],
    description: `Given an integer \`x\`, return \`true\` if \`x\` is a **palindrome**, and \`false\` otherwise.

A palindrome is a number that reads the same forward and backward. For example, \`121\` is a palindrome while \`123\` is not.`,
    examples: [
      { input: "x = 121", output: "true", explanation: "121 reads as 121 from left to right and from right to left." },
      { input: "x = -121", output: "false", explanation: "From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome." },
      { input: "x = 10", output: "false", explanation: "Reads 01 from right to left. Therefore it is not a palindrome." },
    ],
    constraints: ["-2³¹ ≤ x ≤ 2³¹ - 1"],
    testCases: [
      { input: "121", expectedOutput: "true" },
      { input: "-121", expectedOutput: "false" },
      { input: "10", expectedOutput: "false" },
    ],
    starterCode: {
      javascript: `/**
 * @param {number} x
 * @return {boolean}
 */
var isPalindrome = function(x) {
    // Your solution here
};

const x = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());
console.log(String(isPalindrome(x)));`,

      python: `import sys

def isPalindrome(x: int) -> bool:
    # Your solution here
    pass

x = int(sys.stdin.read().strip())
print(str(isPalindrome(x)).lower())`,

      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isPalindrome(int x) {
    // Your solution here
    return false;
}

int main() {
    int x;
    cin >> x;
    cout << (isPalindrome(x) ? "true" : "false") << endl;
    return 0;
}`,

      java: `import java.util.*;

public class Main {
    public static boolean isPalindrome(int x) {
        // Your solution here
        return false;
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x = sc.nextInt();
        System.out.println(isPalindrome(x) ? "true" : "false");
    }
}`,

      go: `package main

import (
    "fmt"
)

func isPalindrome(x int) bool {
    // Your solution here
    return false
}

func main() {
    var x int
    fmt.Scan(&x)
    if isPalindrome(x) {
        fmt.Println("true")
    } else {
        fmt.Println("false")
    }
}`,
    },
  },
];
