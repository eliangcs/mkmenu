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

var Prefs = chrome.extension.getBackgroundPage().Prefs;

function L(msgName, substitutions) {
  return chrome.i18n.getMessage(msgName, substitutions);
}

function loadForm() {
  $("#modifier-key-" + Prefs.modKey).prop("checked", true);
  $("#mouse-button-" + Prefs.mouseButton).prop("checked", true);
  for (var i = 0; i < Prefs.searchEngines.length; i++) {
    var $nameField = $("#engine-name-" + i);
    var $urlField = $("#engine-url-" + i);
    var engine = Prefs.searchEngines[i];
    if (engine.name != "") {
      $nameField.val(engine.name).removeClass("empty-field");
    } else {
      $nameField.val(L("optEngineNameHint")).addClass("empty-field");
    }
    if (engine.url != "") {
      $urlField.val(engine.url).removeClass("empty-field");
    } else {
      $urlField.val(L("optEngineURLHint")).addClass("empty-field");
    }
  }
}

function setupFieldsHint(cssSelector, hintMsgName) {
  $(cssSelector).focus(function() {
    var $this = $(this);
    if ($this.hasClass("empty-field")) {
      $this.val("").removeClass("empty-field");
    }
  }).blur(function() {
    var $this = $(this);
    if ($this.val() == "") {
      $this.val(L(hintMsgName)).addClass("empty-field");
    }
  });
}

function replaceLocaleMessages() {
  $(".locale-msg").each(function() {
    var $this = $(this);
    var msgName = $this.html();
    if (msgName != "") {
      $this.html(L(msgName));
    }
  });
}

function saveForm() {
  Prefs.modKey = $("input[name='modifier-key']:checked").val();
  Prefs.mouseButton = parseInt($("input[name='mouse-button']:checked").val());
  for (var i = 0; i < 8; i++) {
    var $nameField = $("#engine-name-" + i);
    var $urlField = $("#engine-url-" + i);
    var nameEmpty = $nameField.hasClass("empty-field");
    var urlEmpty = $urlField.hasClass("empty-field");
    if (nameEmpty || urlEmpty) {
      Prefs.cmdsText[i] = null;
    } else {
      Prefs.cmdsText[i] = "cmdSearch" + i;
    }
    Prefs.searchEngines[i].name = nameEmpty ? "" : $nameField.val();
    Prefs.searchEngines[i].url = urlEmpty ? "" : $urlField.val();
  }
  Prefs.save();
}

function resetForm() {
  Prefs.reset();
  loadForm();
}

$(function() {
  Prefs.load();
  loadForm();
  setupFieldsHint(".engine-name", "optEngineNameHint");
  setupFieldsHint(".engine-url", "optEngineURLHint");
  replaceLocaleMessages();

  $("input").change(function() {
    $("#save-btn").removeAttr("disabled");
    $("#reset-btn").removeAttr("disabled");
    $("#save-hint").css("display", "inline");
  });

  $("#save-btn").click(function() {
    $(this).attr("disabled", "disabled");
    saveForm();
    $("#save-hint").css("display", "none");
  });

  $("#reset-btn").click(function() {
    $(this).attr("disabled", "disabled");
    $("#save-btn").removeAttr("disabled");
    resetForm();
    $("#save-hint").css("display", "inline");
  });
});
