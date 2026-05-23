# Performance audit memory fallback

## 2026-05-10T10:46:50.4222042+09:00
- Intended memory path C:\Users\kjun0\.codex\automations\performance-audit-2\memory.md could not be created: access denied when creating the automation ID directory. Saved this fallback under the workspace instead.
- Repository found at C:\Users\kjun0\OneDrive\문서\New project 3\vocarush; parent folder is not a git repo.
- No prior performance-audit-2 memory file existed/readable. Existing performance-audit memory was for a different project and noted a prior Ionicons import issue; this project already uses direct @expo/vector-icons/Ionicons imports.
- Git repo has no commits yet and all project files are untracked, so no commit-based regression diff was possible.
- 
pm.cmd run typecheck passed.
- Expo web export measured: Metro bundle 25,508 ms; total export 43,219 ms; single web JS bundle 2,280,828 bytes raw / 452,915 bytes gzip; Ionicons font asset 390 kB.
- Data init measurement via compiled JS: generateVocabData + uildInitialStudySets + uildInitialAssignments produced 924 vocab, 40 sets, 4 assignments. Runs: 365.6 ms, 271.1 ms, 288.6 ms total; uildInitialStudySets alone was 190.4-263.8 ms.
- Main findings proposed: precompute or lazy-load initial vocab/study-set data; virtualize VocabularyScreen instead of ScrollView + filteredWords.map; then optimize LearnScreen quiz candidate allocation.
