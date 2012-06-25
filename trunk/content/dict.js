"use strict";

var EXPORTED_SYMBOLS = ["DictionarySearcher"];

Components.utils["import"]("resource://furiganainserter/utilities.js");
Components.utils["import"]('resource://gre/modules/AddonManager.jsm');
var Ci = Components.interfaces;
var Cc = Components.classes;

function Dic (file) {
    this.name = "";
    this.isName = false;
    this.file = file;
    this.isKanji = false;
    this.hasType = false;
    this.hasIndex = false;
}

Dic.prototype.findWord = function (word) {
    var db = null, entries = [];
    // open db
    // get entries
    // close db
    try {
        db = this.openDatabase();
        if (!this.hasIndex) this.createIndex(db);
        entries = this.getEntries(db, word);
    } finally {
        if (db) db.close();
    }
    return entries;
}

Dic.prototype.createIndex = function (db) {
    if (!db.indexExists("ix_kana"))
        db.executeSimpleSQL("CREATE INDEX ix_kana ON dict (kana ASC)");
    if (!db.indexExists("ix_kanji"))
        db.executeSimpleSQL("CREATE INDEX ix_kanji ON dict (kanji ASC)");
    this.hasIndex = true;
}

Dic.prototype.openDatabase = function () {
    var file = this.file;
    // The files may get installed as read-only, breaking
    // index creation. Try changing the file permission.
    if (!file.isWritable()) file.permissions |= 0x180;
    var service = Components.classes['@mozilla.org/storage/service;1']
            .getService(Components.interfaces.mozIStorageService);
    return service.openDatabase(file);
}

Dic.prototype.getEntries = function (db, word) {
    var result = [], entry;
    var stm = "SELECT * FROM dict WHERE kanji=:kanji OR kana=:kana";
    var st = db.createStatement(stm);
    st.params.kanji = word;
    st.params.kana = word;
    try {
        while (st.step()) {
            entry = new Entry();
            entry.kana = st.row.kana;
            entry.kanji = st.row.kanji;
            entry.entry = st.row.entry;
            result.push(entry);
        }
    } finally {
        st.finalize();
    }
    return result;
}

Dic.prototype.getResults = function (st) {
    var results = [], result = {}, key;
    while (st.step()) {
        result = {};
        for (key in st.row)
            if (st.row.hasOwnProperty(key))
                result[key] = st.row[key];
        results.push(result);
    }
    return results;
}

function Entry () {
    this.kanji = "";
    this.kana = "";
    this.entry = "";
    this.reason = "";
}

function SearchResult () {
    this.entries = [];
    this.matchLen = 0;
    this.more = false;
    this.names = false;
    this.title = "";
    this.kanji = false;
}

function Variant (word) {
    this.word = word;
    this.type = 0xFF;
    this.reason = "";
}

/**
 * from Rikaichan
 */
function DictionarySearcher () {
    this._dif = new Dif();
    this._dicList = [];
}

DictionarySearcher.prototype.init = function (rcxDicList) {
    var ids = [], id;
    var that = this;
    for (id in rcxDicList)
        if (rcxDicList.hasOwnProperty(id)) ids.push(id);

    AddonManager.getAddonsByIDs(ids, function (addons) {
        that._dicList = [];
        var uri, file, i, dic, rcxDic, addon;
        for (i = 0; i < addons.length; ++i) {
            addon = addons[i];
            uri = addon.getResourceURI("dict.sqlite");
            file = uri.QueryInterface(Ci.nsIFileURL).file;
            dic = new Dic(file);
            rcxDic = rcxDicList[addon.id];
            dic.isName = rcxDic.isName;
            dic.isKanji = rcxDic.isKanji;
            dic.hasType = rcxDic.hasType;
            dic.name = rcxDic.name;
            that._dicList.push(dic);
        }
    })
}

DictionarySearcher.prototype._wordSearch = function (word, dic) {
    var variants, variant, i, j, entries, entry, origWord = word;
    var result = new SearchResult();
    result.title = dic.name;
    result.names = dic.isName;
    word = katakanaToHiragana(word);

    while (word.length > 0) {
        if (dic.isName)
            variants = [new Variant(word)];
        else variants = this._dif.deinflect(word);
        for (i = 0; i < variants.length; ++i) {
            variant = variants[i];
            entries = dic.findWord(variant.word);
            for (j = 0; j < entries.length; ++j) {
                entry = entries[j];
                // > 0 a de-inflected word
                if (dic.hasType && this._checkType(variant.type, entry.entry)
                    || !dic.hasType) {
                    if (result.matchLen === 0) result.matchLen = word.length;
                    if (variant.reason === '')
                        entry.reason = '';
                    else if (origWord === word)
                        entry.reason = '&lt; ' + variant.reason;
                    else entry.reason = '&lt; ' + variant.reason + ' &lt; ' + word;
                    result.entries.push(entry);
                }
            } // for j < entries.length
        } // for i < variants.length
        if (result.entries.length > 0) return result;
        word = word.substr(0, word.length - 1);
    } // while (word.length > 0)
    if (result.entries.length === 0)
        return null;
    else return result;
}

DictionarySearcher.prototype.wordSearch = function (word) {
    var retval = [], i;
    for (i = 0; i < this._dicList.length; ++i) {
        var dic = this._dicList[i];
        if (dic.isKanji) continue;
        var e = this._wordSearch(word, dic);
        if (e) retval.push(e);
    }
    retval.sort(function (a, b) {
        return (b.matchLen - a.matchLen);
    })
    return retval;
}

DictionarySearcher.prototype._checkType = function (type, entry) {
    var i;
    if (type === 0xFF) return true;

    // ex:
    // /(io) (v5r) to finish/to close/
    // /(v5r) to finish/to close/(P)/
    // /(aux-v,v1) to begin to/(P)/
    // /(adj-na,exp,int) thank you/many thanks/
    // /(adj-i) shrill/
    var entryParts = entry.split(/[,()]/);
    for (i = Math.min(entryParts.length - 1, 10); i >= 0; --i) {
        var entryPart = entryParts[i];
        if ((type & 1) && (entryPart === 'v1')) return true;
        if ((type & 4) && (entryPart === 'adj-i')) return true;
        if ((type & 2) && (entryPart.substr(0, 2) === 'v5')) return true;
        if ((type & 16) && (entryPart.substr(0, 3) === 'vs-')) return true;
        if ((type & 8) && (entryPart === 'vk')) return true;
    }
    return false;
}

DictionarySearcher.prototype.makeHtml = function (searchResult) {
    var result = "<div class='w-title'>" + searchResult.title + "</div>";
    var groupedEntries = groupBy(searchResult.entries,
            function (entry) {return entry.entry;});
    result += groupedEntries.map(function (group) {
        var result = [];
        group.forEach(function (entry) {
            if (entry.kanji !== "")
                result.push("<span class='w-kanji'>", entry.kanji, "</span>");
            result.push("<span class='w-kana'>", entry.kana, "</span>");
            if (entry.reason !== "")
                result.push("<span class='w-conj'>", entry.reason, "</span>");
            result.push("<br>");
        });
        result.push("<span class='w-def'>", group[0].entry.replace(/\//g, "; "), "</span>");
        return result.join("");
    }).join("<br>");
    return result;
}

DictionarySearcher.prototype.kanjiSearch = function (c) {
    var searchResult = new SearchResult(), i;
    for (i = 0; i < this._dicList.length; ++i) {
        var dic = this._dicList[i];
        if (!dic.isKanji) continue;
        searchResult.entries = dic.findWord(c);
        searchResult.kanji = true;
        searchResult.title = dic.name;
        break; // only one kanji dictionary allowed
    }
    return searchResult;
}

DictionarySearcher.prototype.moveToTop = function (index) {
    if (index === 0) return;
    var removed = this._dicList.splice(index, 1);
    this._dicList.unshift(removed[0]);
}

function Rule () {
    this.from = "";
    this.to = "";
    this.type = 0;
    this.reason = 0;
}

function Dif () {
    var i, line, lines, fields, rule;
    this.reasons = [];
    this.rules = [];
    var string = readUri("chrome://furiganainserter/content/deinflect.dat", "UTF-8");
    lines = string.split("\r\n");
    for (i = 1; i < lines.length; ++i) {
        line = lines[i];
        fields = line.split("\t");
        if (fields.length === 1)
            this.reasons.push(fields[0]);
        else {
            rule = new Rule();
            rule.from = fields[0];
            rule.to = fields[1];
            rule.type = parseInt(fields[2]);
            rule.reason = parseInt(fields[3]);
            this.rules.push(rule);
        }
    }
}

Dif.prototype.deinflect = function (word) {
    var i, j, index, end, rule, newWord, newVariant;
    var variant = new Variant(word);
    var cache = {};
    cache[word] = variant;
    var variants = [variant];
    var rules = this.rules;
    for (i = 0; i < variants.length; ++i) {
        variant = variants[i]
        for (j = 0; j < rules.length; ++j) {
            rule = rules[j]
            if (rule.from.length >= variant.word.length) continue;
            index = variant.word.length - rule.from.length;
            end = variant.word.substring(index);
            if ((variant.type & rule.type) === 0 || end !== rule.from) continue;
            newWord = variant.word.substring(0, index) + rule.to;
            // update cache
            if (cache.hasOwnProperty(newWord)) {
                newVariant = cache[newWord];
                newVariant.type |= (rule.type >> 8);
            }
            //new deinflection
            else {
                newVariant = new Variant(newWord);
                newVariant.type = rule.type >> 8;
                if (variant.reason === "")
                    newVariant.reason = this.reasons[rule.reason];
                else newVariant.reason = this.reasons[rule.reason] + ' &lt; '
                    + variant.reason;
            }
            cache[newWord] = newVariant;
            variants.push(newVariant);
        }
    }
    return variants;
}