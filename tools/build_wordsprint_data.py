#!/usr/bin/env python3
"""
Builds games/wordsprint/wordsprint-data.js for the Word Sprint game.

For every letter set (3 vowels + 3 common consonants) it lists EVERY 4-letter word
that can be spelled with those six letters (letters may repeat), so the game never
rejects a real word.

Sources (downloaded on the fly):
  * ENABLE word list (public domain) and Collins Scrabble Words (SOWPODS) - every valid
    Scrabble-style word, so the game accepts plurals, verb forms, modern words (APPS, BLOG,
    MEME...) and less common words too. A few modern words neither list has are added by
    hand in MODERN_EXTRA.
  * LDNOOBW English list (CC BY 4.0) plus a few extra words - removed so the game
    never asks kids to spell inappropriate words.
  * wordfreq (pip install wordfreq) - only used to pick letter sets that have lots of
    COMMON words, so a kid can always find four easily.

Usage:  python3 tools/build_wordsprint_data.py
"""
import itertools, json, os, sys, urllib.request
from wordfreq import zipf_frequency

ENABLE = "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt"
COLLINS = "https://raw.githubusercontent.com/jesstess/Scrabble/master/scrabble/sowpods.txt"
BAD = "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en"
EXTRA_BAD = """anal anus arse berk bint boob bong chink clit cock coon crap cum cums cunt dago damn dick dong dyke
fags fart frig fuck gash gimp gook hell homo hore jews kafs kike lewd lust meth mofo muff nads nude orgy pimp piss
porn pube rape raped rapes sext sexy shag shat shit slag slut smut spaz spic spik tard tits toke turd twat
wank wang whor wino wops""".split()

# Modern everyday words that neither dictionary has yet
MODERN_EXTRA = "gifs wifi nano".split()

VOWELS = "aeiou"
CONSONANTS = "bcdfghklmnprstw"     # common consonants (no J Q V X Z, and Y is left out on purpose)
NUM_SETS = 100
S_SETS = 80            # at least this many sets contain an S, so plurals (CATS, PIGS...) can be spelled
# Stage 2: 50 MORE sets, chosen for how many words they can make. 40 of them contain an S, so
# 120 of the 150 sets can spell plurals. (Stage 1 is unchanged, so the first 100 sets never change.)
MORE_SETS = 50
MORE_S_SETS = 40
MIN_COMMON, MIN_TOTAL = 18, 35
OUT = os.path.join(os.path.dirname(__file__), "..", "games", "wordsprint", "wordsprint-data.js")

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read().decode("utf-8").splitlines()

def main():
    four = sorted({w.strip().lower() for src in (ENABLE, COLLINS) for w in fetch(src)
                   if len(w.strip()) == 4 and w.strip().isalpha()} | set(MODERN_EXTRA))
    bad = {w.strip().lower() for w in fetch(BAD) if " " not in w.strip()} | set(EXTRA_BAD)
    words = [w for w in four if w not in bad]
    common = {w for w in words if zipf_frequency(w, "en") >= 3.0}
    print(f"{len(four)} four-letter words, {len(four) - len(words)} removed, {len(common)} common")

    cands = []
    for v in itertools.combinations(VOWELS, 3):
        for c in itertools.combinations(CONSONANTS, 3):
            letters = set(v) | set(c)
            ws = [w for w in words if set(w) <= letters]
            cm = sum(1 for w in ws if w in common)
            if cm >= MIN_COMMON and len(ws) >= MIN_TOTAL:
                cands.append((v, c, ws, cm))

    # Greedy pick: prefer sets with many common words, but spread the letters around.
    # The first S_SETS picks must contain an S (so plurals work); the rest add variety.
    use_c = {c: 0 for c in CONSONANTS}
    use_v = {}
    chosen = []
    while len(chosen) < NUM_SETS and cands:
        need_s = len(chosen) < S_SETS
        pool = [x for x in cands if ("s" in x[1]) == need_s] or cands
        def score(x):
            v, c, ws, cm = x
            others = [k for k in c if not (need_s and k == "s")]   # S is wanted, so don't penalise it
            return cm - 1.6 * sum(use_c[k] for k in others) - 0.8 * use_v.get(v, 0)
        best = max(pool, key=lambda x: (score(x), x[3], "".join(x[0] + x[1])))
        cands.remove(best)
        v, c, ws, cm = best
        for k in c: use_c[k] += 1
        use_v[v] = use_v.get(v, 0) + 1
        chosen.append(best)

    # Stage 2: pick the sets that generate the MOST words among those that are left. Letters are
    # still spread around (a penalty for reusing a consonant or vowel trio within this stage).
    stage1 = len(chosen)
    use_c2 = {c: 0 for c in CONSONANTS}
    use_v2 = {}
    while len(chosen) < stage1 + MORE_SETS and cands:
        need_s = len(chosen) - stage1 < MORE_S_SETS
        pool = [x for x in cands if ("s" in x[1]) == need_s] or cands
        def score2(x):
            v, c, ws, cm = x
            others = [k for k in c if not (need_s and k == "s")]
            return len(ws) - 4.0 * sum(use_c2[k] for k in others) - 2.0 * use_v2.get(v, 0)
        best = max(pool, key=lambda x: (score2(x), x[3], "".join(x[0] + x[1])))
        cands.remove(best)
        v, c, ws, cm = best
        for k in c: use_c[k] += 1; use_c2[k] += 1
        use_v[v] = use_v.get(v, 0) + 1
        use_v2[v] = use_v2.get(v, 0) + 1
        chosen.append(best)

    sets = []
    for v, c, ws, cm in chosen:
        letters = "".join(sorted(v)).upper() + "".join(sorted(c)).upper()
        sets.append({"letters": letters, "words": " ".join(w.upper() for w in ws)})
    sets.sort(key=lambda s: s["letters"])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write("// Word Sprint — letter sets and EVERY 4-letter word that can be spelled from each one.\n")
        f.write("// Generated by tools/build_wordsprint_data.py. Do not edit by hand.\n")
        f.write("// letters: 3 vowels then 3 consonants.  words: all valid 4-letter words (letters may repeat).\n")
        f.write("window.WS = { sets: ")
        f.write(json.dumps(sets, separators=(",", ":")))
        f.write(" };\n")
    tot = sum(len(s["words"].split()) for s in sets)
    print(f"wrote {len(sets)} sets, {tot} word entries, {os.path.getsize(OUT)//1024} KB -> {OUT}")
    print("consonant usage:", {k: v for k, v in sorted(use_c.items())})
    print("vowel combos:", {"".join(k): v for k, v in sorted(use_v.items())})

main()
