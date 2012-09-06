/*
 * Copyright 2011 Chang-Hung Liang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

 /**
 * Preferences can be saved in the following places:
 * 1. chrome.storage.sync.get("mkmenu-prefs")
 * 2. localStorage["mkmenu-prefs"]
 * 3. Prefs
 * 4. Options form
 */
var Prefs = {
  reset: function() {
    this.font = [9, "Arial, Helvetica, sans-serif"];
    this.bg = ["#f7f7f7", "#c6c6c6"];
    this.fg = ["#000", "#000"];
    this.bgActive = "#b8bfd3";
    this.fgActive = "#000";
    this.bdrCrActive = ["#666", "#666", "#666", "#666"];
    this.bdrWidth = 1;
    this.bdrColors = ["#666", "#666", "#666", "#666"];
    this.shadowColor = "rgba(0,0,0,0.7)";
    this.menuOpacity = 1;
    this.itemSpace = 2;
    this.itemPadding = [4, 30];
    this.rayColor = "#000";
    this.rayWidth = 2;
    this.rayOpacity = 1;
    this.rayBdrColor = "#f6f6f6";
    this.rayBdrWidth = 3;
    this.rayBdrOpacity = 1;
    this.animation = true;
    this.copySearch = true;
    this.popupDelay = 200;
    this.hideDelay = 200;
    this.modKey = "none";
    this.mouseButton = 2;  // 1 for middle, 2 for right
    this.cmdsBg     = ["cmdPrevTab", "cmdTop", "cmdNextTab", "cmdForward",
                       "cmdNewTab", "cmdBottom", "cmdHome", "cmdBack"];
    this.cmdsText   = ["cmdSearch0", "cmdSearch1", "cmdSearch2", "cmdSearch3",
                       "cmdSearch4", "cmdSearch5", "cmdSearch6", "cmdSearch7"];
    this.cmdsImg    = ["cmdCopyAlt", "cmdCopyImg", "cmdViewImg", "cmdViewImg",
                       "cmdSaveImg", "cmdCopyImgLoc", "cmdViewImgInfo", "cmdSendImg"];
    this.cmdsLink   = ["cmdBookmark", "cmdCopyLinkText", "cmdOpenNewTab", "cmdOpenNewWin",
                       "cmdSaveLink", "cmdCopyLink", "cmdSendLink", "cmdSelectLink"];
    this.cmdsSubmit = [null, null, "cmdSubmitNewTab", "cmdSubmitNewWin",
                       null, "cmdCopySubmitLoc", null, null];
    this.cmdsEdit   = [null, null, null, null,
                       "cmdAddSearch", null, null, null];
    this.searchEngines = [{"name": "Amazon", "url": "http://www.amazon.com/s/?field-keywords=%s"},
                          {"name": "Google", "url": "http://www.google.com/search?q=%s"},
                          {"name": "Google Images", "url": "http://www.google.com/search?tbm=isch&q=%s"},
                          {"name": "Google Maps", "url": "http://maps.google.com.tw/maps?q=%s"},
                          {"name": "Google Translate", "url": "http://translate.google.com/#auto|en|%s"},
                          {"name": "IMDb", "url": "http://www.imdb.com/find?q=%s"},
                          {"name": "Wikipedia", "url": "http://en.wikipedia.org/w/index.php?title=Special%3ASearch&search=%s"},
                          {"name": "YouTube", "url": "http://www.youtube.com/results?search_query=%s"}];
    return this;
  },
  load: function() {
    chrome.storage.sync.get("mkmenu-prefs", function(obj) {
      if (obj) {
        for (var i in obj) {
          this[i] = obj[i];
        }
      } else {
        var localObj = localStorage["mkmenu-prefs"];
        if (localObj) {
          localObj = JSON.parse(localObj);
          for (var i in localObj) {
            this[i] = localObj[i];
          }
          this.save();
        } else {
          this.reset();
        }
      }
    });
    return this;
  },
  save: function() {
    chrome.storage.sync.set({ "mkmenu-prefs": this });
    return this;
  }
};
Prefs.reset();
Prefs.load();

var Requests = {
  getPrefs: function() {
    return Prefs;
  },
  home: function() {
    // HACK! create a temp tab to get the home url
    // set the home url to current tab and remove temp tab
    chrome.tabs.create({
        url: undefined,
        selected: false
      },
      function(homeTab) {
        if (homeTab) {
          chrome.tabs.getSelected(undefined, function(tab) {
            if (tab)
              chrome.tabs.update(tab.id, { url: homeTab.url });
            chrome.tabs.remove(homeTab.id);
          });
        }
      });
  },
  newTab: function() {
    chrome.tabs.getSelected(undefined, function(tab) {
      chrome.tabs.create({
        index: tab.index + 1,
        url: undefined,
        selected: true
      });
    });
  },
  nextTab: function() {
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
      // iterate over all tabs, find the selected one, then change the selected one
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].selected) {
          var idx = (i + 1) % tabs.length;
          chrome.tabs.update(tabs[idx].id, { selected: true });
          break;
        }
      }
    });
  },
  prevTab: function() {
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
      // iterate over all tabs, find the selected one, then change the selected one
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].selected) {
          var idx = i == 0 ? tabs.length - 1 : i - 1;
          chrome.tabs.update(tabs[idx].id, { selected: true });
          break;
        }
      }
    });
  },
  search: function(req) {
    var idx = req.index;
    var url = Prefs.searchEngines[idx].url;
    if (url) {
      url = url.replace("%s", req.keyword);
      chrome.tabs.getSelected(undefined, function(tab) {
        chrome.tabs.create({
          index: tab.index + 1,
          url: url,
          selected: true
        });
      });
    }
  }
};

chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
  var result = Requests[req.name](req, sender);
  sendResponse(result ? result : {});
});
