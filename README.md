# GTU PPS string operations tracer: length, reverse, palindrome, vowels, words and compare (plus C)

GTU Hero's PPS guide lists string programs among the ones to practise: palindrome, count vowels and consonants, compare two strings, and count words or characters, plus the difference between using standard string functions and doing it with loops. String daalo: this page prints length, the reversed string, whether it is a palindrome, the vowel/consonant/digit/space counts, the word count, and a compare against a second string. The repo also has strings.c, so you can check the same results with gcc. Practice strings are my own, not from a GTU paper.

Live page: https://princeadvant.github.io/gtu-pps-string-operations-tracer/

## Facts used

- A string in C is a character array ending with '\0'. Length does not count the null. Empty string: length 0.
- Reverse by swapping s[i] with s[n-1-i], or by filling a new array from the back. Palindrome means the string equals its reverse.
- Vowels here are a, e, i, o, u in both cases. Every other letter is a consonant. Digits and spaces are counted separately.
- Word count: a word is a run of non-space characters. 'GTU Hero' has 2 words. A string of only spaces has 0.
- strcmp returns 0 if equal, negative if the first is less, positive if the first is greater, in ASCII / dictionary order.

## Test

`node test.js` checks the calculations against hand-worked values and prints `All checks passed`.

`gcc -Wall -Wextra -o strings strings.c && ./strings` prints the same counts from real C and also prints `All checks passed`.

## Tips

- Indexes start at 0. If you use a loop to the null, the test is s[i] != '\0', not i <= length.
- gets() is unsafe and often disallowed. Use scanf with a width, or fgets, and say so in the viva if asked.
- If the question says 'without using string.h', write the loops. If it allows library functions, strlen, strcpy, strcmp and strcat are the usual four.
- Case matters for a palindrome unless the question says to ignore it. 'Level' is not a palindrome, 'level' is.

Most asked PPS programs, practical checklist and old papers: [https://gtuhero.com/blogs/gtu-pps-previous-year-paper](https://gtuhero.com/blogs/gtu-pps-previous-year-paper) (GTU Hero is my project).
