setlocal
set VERSION=2.11
"%ProgramFiles%\7-zip\7z.exe" u furigana-inserter-%VERSION%.xpi -tzip -r components content defaults locale mecab skin chrome.manifest COPYING.GPL install.rdf license.txt -x!*.user -x!*.ncb -x!*.suo -x!Release -x!content\tests
"%ProgramFiles%\7-zip\7z.exe" t furigana-inserter-%VERSION%.xpi
pause
