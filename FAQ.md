# Frequently Asked Questions #

## What is the keywords mode? ##
The keywords mode introduced in FI 2.0 allows inserting a keywords for a kanji instead of the reading. A list of english keywords is available for download. You have to copy and paste the list into the keywords dialog. You can find it in "Tools->Furigana Inserter->Keywords...".

## Why does all kanji disappear when I remove furigana from a web page? ##
This happens when you use the HTML Ruby add-on 6. To prevent this problem you should disable the option "Process inserted content" of the HTML Ruby add-on.

## How do I install a dictionary for Furigana Inserter? ##
There are two ways to install a dictionary required by Furigana Inserter.
  1. The first option is to install the dictionary add-on for Firefox.
    1. Download the file `furiganainserter-dictionary-<version>.7z` and unpack it with [7-Zip](http://www.7-zip.org) or WinRAR.
    1. Then either drag and drop the unpacked file `furiganainserter-dictionary.xpi` into a Firefox window or go the `File` menu in Firefox, choose `Open File...` and select the file `furiganainserter-dictionary.xpi`.
  1. Second option is to install [MeCab](http://code.google.com/p/mecab/downloads/list) instead of the dictionary add-on.
    1. If you are on Windows then download `mecab-<version>.exe` where `<version>` is the version number.
    1. During the installation choose the UTF-8 format.

## How do I change the font size of ruby (furigana)? ##
The HTML Ruby add-on allows you to change the font size of ruby (furigana). Go to the `Tools` menu, select `Add-ons` then select `HTML Ruby` and choose `Options`. There you will find the option `Ruby text size`.

## What about Linux and Mac OS X? ##
Since version 2.0 Furigana Inserter should work on Linux and Mac OS X. Firefox version 4 or higher is required. The dictionary add-on should also work. I have only tested it on Linux and Windows.

The user dictionary will only work with the IPAdic dictionary. You have to install either MeCab with a dictionary or MeCab and the dictionary add-on for Firefox. You should use the UTF-8 encoding for the MeCab dictionary.

To install FI 2.7 on Fedora 18 64-bit:
  1. Drag and drop `furigana-inserter-<version>.xpi` file into Firefox.
  1. `sudo yum install mecab mecab-ipadic`
  1. `sudo ln -s /usr/lib64/libmecab.so.2 /usr/lib64/libmecab.so.1`

[Blog entry](http://akitaonrails.com/2012/05/08/off-topic-reading-with-subtitles-over-kanjis-in-japanese-webpages) explaining how to install Furigana Inserter on Mac OS X.