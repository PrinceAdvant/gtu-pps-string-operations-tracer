/* GTU PPS string operations in C: length, reverse, palindrome, vowels,
   consonants, digits, words, and compare. Own practice strings, not
   from a GTU paper. Compile: gcc -Wall -Wextra -o strings strings.c && ./strings
*/
#include <stdio.h>
#include <string.h>
#include <ctype.h>

static int is_vowel(char ch) {
    return ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u'
        || ch == 'A' || ch == 'E' || ch == 'I' || ch == 'O' || ch == 'U';
}

struct stats {
    int length, vowels, consonants, digits, spaces, others, words;
    int palindrome;
    char reverse[128];
};

static void analyse(const char *s, struct stats *st) {
    int i, n = (int)strlen(s), in_word = 0;
    st->length = n;
    st->vowels = st->consonants = st->digits = st->spaces = st->others = st->words = 0;
    for (i = 0; i < n; i++) st->reverse[i] = s[n - 1 - i];
    st->reverse[n] = '\0';
    st->palindrome = strcmp(s, st->reverse) == 0;
    for (i = 0; i < n; i++) {
        unsigned char ch = (unsigned char)s[i];
        if (is_vowel((char)ch)) st->vowels++;
        else if (isalpha(ch)) st->consonants++;
        else if (isdigit(ch)) st->digits++;
        else if (ch == ' ') st->spaces++;
        else st->others++;
        if (ch != ' ' && !in_word) { st->words++; in_word = 1; }
        else if (ch == ' ') in_word = 0;
    }
}

static int failed = 0;
static void expect_int(const char *name, int got, int want) {
    if (got != want) {
        printf("FAIL %s: got %d, want %d\n", name, got, want);
        failed++;
    }
}
static void expect_str(const char *name, const char *got, const char *want) {
    if (strcmp(got, want) != 0) {
        printf("FAIL %s: got \"%s\", want \"%s\"\n", name, got, want);
        failed++;
    }
}

int main(void) {
    struct stats st;
    const char *a, *b;

    a = "GTU Hero";
    analyse(a, &st);
    printf("\"%s\"\n", a);
    printf("  length %d, reverse \"%s\", palindrome %s\n", st.length, st.reverse, st.palindrome ? "yes" : "no");
    printf("  vowels %d, consonants %d, digits %d, spaces %d, words %d\n",
           st.vowels, st.consonants, st.digits, st.spaces, st.words);
    expect_int("len GTU Hero", st.length, 8);
    expect_str("rev GTU Hero", st.reverse, "oreH UTG");
    expect_int("pal GTU Hero", st.palindrome, 0);
    expect_int("vow GTU Hero", st.vowels, 3);
    expect_int("cons GTU Hero", st.consonants, 4);
    expect_int("spc GTU Hero", st.spaces, 1);
    expect_int("wrd GTU Hero", st.words, 2);

    a = "level";
    analyse(a, &st);
    printf("\"%s\" is %s (reverse \"%s\")\n", a, st.palindrome ? "a palindrome" : "not a palindrome", st.reverse);
    expect_int("pal level", st.palindrome, 1);
    expect_int("vow level", st.vowels, 2);
    expect_int("cons level", st.consonants, 3);

    a = "A1 b2";
    analyse(a, &st);
    printf("\"%s\": digits %d, spaces %d, vowels %d, consonants %d\n", a, st.digits, st.spaces, st.vowels, st.consonants);
    expect_int("dig A1 b2", st.digits, 2);
    expect_int("spc A1 b2", st.spaces, 1);
    expect_int("vow A1 b2", st.vowels, 1);
    expect_int("cons A1 b2", st.consonants, 1);

    a = "   ";
    analyse(a, &st);
    expect_int("wrd spaces", st.words, 0);
    expect_int("spc spaces", st.spaces, 3);
    expect_int("len spaces", st.length, 3);

    a = "Programming";
    analyse(a, &st);
    printf("\"%s\": length %d, vowels %d, consonants %d\n", a, st.length, st.vowels, st.consonants);
    expect_int("len Programming", st.length, 11);
    expect_int("vow Programming", st.vowels, 3);
    expect_int("cons Programming", st.consonants, 8);

    a = "cat"; b = "dog";
    printf("compare \"%s\" vs \"%s\": %d\n", a, b, strcmp(a, b));
    if (!(strcmp(a, b) < 0)) { printf("FAIL strcmp cat dog\n"); failed++; }
    if (strcmp("GTU", "GTU") != 0) { printf("FAIL strcmp GTU\n"); failed++; }

    if (failed) {
        printf("%d check(s) failed\n", failed);
        return 1;
    }
    printf("All checks passed\n");
    return 0;
}
