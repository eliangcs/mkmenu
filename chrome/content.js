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
 * Item indices.
 */
var NW = 0, N = 1, NE = 2, E = 3,
    SE = 4, S = 5, SW = 6, W = 7;

var $win = $(window);
var $doc = $(document);
var $body = $(document.body);

/**
 * Gets a localized message.
 * @param {String} msgName Message name.
 * @param {String, Array} substitutions Optional.
 * @return {String} Localized message.
 */
function L(msgName, substitutions) {
  return chrome.i18n.getMessage(msgName, substitutions);
}

/**
 * Utility functions.
 */
var Utils = {
  COEF_X: [
    [  -1,    0,  -1],  // NW
    [-0.5,    0,   0],  // N
    [   0,    0,   1],  // NE
    [   0,  0.5,   0],  // E
    [   0,    0,   1],  // SE
    [-0.5,    0,   0],  // S
    [  -1,    0,  -1],  // SW
    [  -1, -0.5,   0]   // W
  ],
  COEF_Y: [
    [-1.5, -1],  // NW
    [-2.5, -2],  // N
    [-1.5, -1],  // NE
    [-0.5,  0],  // E
    [ 0.5,  1],  // SE
    [ 1.5,  2],  // S
    [ 0.5,  1],  // SW
    [-0.5,  0]   // W
  ],
  /**
   * Integer hex to decimal.
   * @param {String} Hex number.
   * @return {Number} Decimal number.
   */
  h2d: function(h) { return parseInt(h, 16); },
  /**
   * Integer decimal to hex. If #digits < 2, it pads a zero.
   * @param {Number} Decimal number.
   * @return {String} Hex number.
   */
  d2h: function(d) {
    var h = d.toString(16);
    if (h.length == 1) return "0" + h;
    return h;
  },
  /**
   * Parses a color string.
   * @param {String} c Color string. Examples: #222, #ff00ee, rgb(255,0,0), rgba(255,0,0,0.5).
   * @return {Object} Color object. Example: { r: 255, g: 0, b: 0, a: 1 }.
   */
  parseColor: function(c) {
    if (c[0] == "#") {
      if (c.length == 4) {
        return {
          r: this.h2d( c[1] + c[1] ),
          g: this.h2d( c[2] + c[2] ),
          b: this.h2d( c[3] + c[3] ),
          a: 1
        }
      }
      if (c.length == 7) {
        return {
          r: this.h2d( c.substr(1, 2) ),
          g: this.h2d( c.substr(3, 2) ),
          b: this.h2d( c.substr(5, 2) ),
          a: 1
        };
      }
    } else if ( c.substr(0, 3).toLowerCase() == "rgb" ) {
       var arr = c.substring( c.indexOf("("),  c.indexOf(")") ).split(",");
       return {
         r: parseInt( arr[0] ),
         g: parseInt( arr[1] ),
         b: parseInt( arr[2] ),
         a: arr[4] == undefined ? 1 : Math.max(0, Math.min(1, parseFloat(arr[4])))  
       };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  },
  /**
   * Interpolation.
   * @param {Number} v1 Beginning value.
   * @param {Number} v2 End value.
   * @param {Number} t Interpolation parameter: [0, 1].
   */
  interp: function(v1, v2, t) {
    return v1 + Math.min(1, Math.max(0, t)) * (v2 - v1);
  },
  /**
   * Interpolates colors.
   * @param {Object} c1 Beginning color. Example: {r: 255, g: 0, b: 0, a: 1}.
   * @param {Object} c2 End color.
   * @param {Number} t Interpolation parameter: [0, 1].
   */
  interpColor: function(c1, c2, t) {
    return this.colorStr({
      r: Math.round( this.interp(c1.r, c2.r, t) ),
      g: Math.round( this.interp(c1.g, c2.g, t) ),
      b: Math.round( this.interp(c1.b, c2.b, t) ),
      a: this.interp(c1.a, c2.a, t)
    });
  },
  /**
   * Color object to color string.
   * @param {Object} c Color object. Example: { r: 255, g: 0, b: 0, a: 1 }.
   * @return {String} Color string. Examples: #ff0000, rgba(255,0,0,1).
   */
  colorStr: function(c) {
    if (c.a > 0.999) return "#" + this.d2h(c.r) + this.d2h(c.g) + this.d2h(c.b);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + c.a + ")";
  },
  /**
   * Gets the background/foreground color of a menu item.
   * @param {Object} c1 Beginning color. Example: {r: 255, g: 0, b: 0, a: 1}.
   * @param {Object} c2 End color.
   * @param {Number} n Item index, an integer from 0 to 7.
   * @return {String} Color string. Examples: #ff0000, rgba(255,0,0,1).
   */
  itemColor: function(c1, c2, n) {
    var t = [0.25, 0, 0.25, 0.5, 0.75, 1, 0.75, 0.5];
    return this.interpColor(c1, c2, t[n]);
  },
  /**
   * Gets the position of a menu item with respect to the client area.
   * @param {Number} n Item index, an integer from 0 to 7.
   * @param {Number} w Item width in pixels.
   * @param {Number} h Item height in pixels.
   * @param {Number} s Item space in pixels.
   * @param {Number} x0 Optional. Center X offset. Default: 0.
   * @param {Number} y0 Optional. Center Y offset. Default: 0.
   * @return {Object} Position. Example: { x: 100, y: 300 }.
   */
  itemPos: function(n, w, h, s, x0, y0) {
    var t = Math.tan(Math.PI / 8);
    var c = (1.5 + h + s) * t;
    x0 = x0 || 0;
    y0 = y0 || 0;
    return {
      x: Math.round(this.COEF_X[n][0] * w +
                    this.COEF_X[n][1] * h / t +
                    this.COEF_X[n][2] * c + x0),
      y: Math.round(this.COEF_Y[n][0] * h +
                    this.COEF_Y[n][1] * s + y0)
    };
  },
  /**
   * From a drag vector to an item index.
   * @param {Number} dx Displacement X.
   * @param {Number} dy Displacement Y.
   * @return {Number} Item index, an integer from 0 to 7.
   */
  dragIdx: function(dx, dy) {
    if (dx * dx + dy * dy < 255) return -1;
    var theta = Math.atan2(dy, dx);
    var idx = Math.floor(4 * theta / Math.PI + 3.5);
    if (idx < 0 || idx > 7) idx = 7;
    return idx;
  },
  /**
   * From a DOM element to a context name.
   * @param {DOMElement} elem
   * @return {String} Context name. Could be one of these:
   *   cmdsBg, cmdsText, cmdsImg, cmdsLink, cmdsSubmit, cmdsEdit. 
   */
  getContext: function(elem) {
    var sel = window.getSelection();
    if ( sel.rangeCount > 0 ) {
        var text = sel.getRangeAt(0).toString();
        if (text !== "")
            return "cmdsText";
    }
    // TODO: support link and image context menu
    /*switch (elem.tagName.toLowerCase()) {
      case "a": return "cmdsLink";
      case "img": return "cmdsImg";
    }*/
    return "cmdsBg";
  },
  ease: function (t) {
    return (t>=1) ? 1 : -Math.pow(2, -10 * t) + 1;
  }
};

var Cmds = {
  cmdTop: function() {
    $win.scrollTop(0);
    return false;
  },
  cmdBottom: function() {
    $win.scrollTop($doc.height());
    return false;
  },
  cmdHome: function() {
    chrome.extension.sendRequest({ name: "home" });
    return false;
  },
  cmdBack: function() {
    history.back();
    return false;
  },
  cmdForward: function() {
    history.forward();
    return false;
  },
  cmdNewWindow: function() {
    chrome.extension.sendRequest({ name: "newWin" });
    return false;
  },
  cmdNewTab: function() {
    chrome.extension.sendRequest({ name: "newTab" });
    return true;
  },
  cmdNextTab: function() {
    chrome.extension.sendRequest({ name: "nextTab" });
    return true;
  },
  cmdPrevTab: function() {
    chrome.extension.sendRequest({ name: "prevTab" });
    return true;
  },
  
  search: function(idx) {
    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
      var text = sel.getRangeAt(0).toString();
      if (text !== "") {
        chrome.extension.sendRequest({
          name: "search",
          index: idx,
          keyword: text
        });
      }
    }
    return false;
  },
  cmdSearch0: function() { return Cmds.search(0); },
  cmdSearch1: function() { return Cmds.search(1); },
  cmdSearch2: function() { return Cmds.search(2); },
  cmdSearch3: function() { return Cmds.search(3); },
  cmdSearch4: function() { return Cmds.search(4); },
  cmdSearch5: function() { return Cmds.search(5); },
  cmdSearch6: function() { return Cmds.search(6); },
  cmdSearch7: function() { return Cmds.search(7); }
};

/**
 * Menu constructor.
 * @param {Object} prefs An object storing prefernces.
 * @param {String} contextName Could be one of these:
 *   cmdsBg, cmdsText, cmdsImg, cmdsLink, cmdsSubmit, cmdsEdit. 
 */
var Menu = function(prefs, contextName) {
  // parses colors in prefs
  var parseColors = function(colors) {
    var arr = [];
    for (var i = 0; i < colors.length; i++)
      arr.push( Utils.parseColor(colors[i]) );
    return arr;
  }
  this.prefs = prefs;
  this.bg = parseColors(prefs.bg);
  this.fg = parseColors(prefs.fg);
  
  // distance (in pixels) from center to boundary, will be filled later
  this.bounds = { left: 0, right: 0, top: 0, bottom: 0 }
  
  // creates the div representing the menu
  this.$div = $("<div class='mkmenu-menu'>").css({
    opacity: prefs.menuOpacity,
    position: "absolute",
    left: 0,
    top: 0,
    width: "auto",
    height: "auto",
    visibility: "hidden"  // temporary hidden
  });
  
  // creates menu items and applies styles to them
  for (var i = 0; i < 8; i++) {
    var $item = $("<div class='mkmenu-item'>")
      .appendTo(this.$div)
      .css({
        fontSize: prefs.font[0] + "pt",
        fontFamily: prefs.font[1],
        fontWeight: "normal",
        lineHeight: prefs.font[0] + "pt",
        background: Utils.itemColor(this.bg[0], this.bg[1], i),
        color: Utils.itemColor(this.fg[0], this.fg[1], i),
        padding: prefs.itemPadding[0] + "px " + prefs.itemPadding[1] + "px",
        borderTop: prefs.bdrWidth + "px solid " + prefs.bdrColors[0],
        borderRight: prefs.bdrWidth + "px solid " + prefs.bdrColors[1],
        borderBottom: prefs.bdrWidth + "px solid " + prefs.bdrColors[2],
        borderLeft: prefs.bdrWidth + "px solid " + prefs.bdrColors[3],
        whiteSpace: "nowrap",
        cursor: "default",
        visibility: "hidden",
        position: "absolute",
        width: "auto",
        height: "auto",
        left: 0,
        top: 0
      });
    if (prefs.shadowColor) {
      $item.css({
        //"-moz-box-shadow": "1px 1px 4px " + prefs.shadowColor,
        "-webkit-box-shadow": "1px 1px 4px " + prefs.shadowColor    
      });
    }
    var cmdLabel = null;
    if (contextName == "cmdsText")
      cmdLabel = prefs.searchEngines[i].name;
    this.command(i, prefs[contextName][i], cmdLabel);
  }
  
  // attaches menu temporarily to trigger the calculation of items' width and height
  bounds = this.bounds;
  this.attach();
  this.$div.children().each(function(n) {
    var $item = $(this);
    var w = $item.outerWidth();
    var h = $item.outerHeight();
    var pos = Utils.itemPos(n, w, h, prefs.itemSpace, 0, 0);
    // compute boundary
    if (n == 1)  // top item
      bounds.top = Math.max(-pos.y, bounds.top);
    else if (n == 5)  // bottom item
      bounds.bottom = Math.max(pos.y + h, bounds.bottom);
    if (n >= 1 && n <= 5)  // right items
      bounds.right = Math.max(pos.x + w, bounds.right);
    if (n == 0 || n == 1 || (n >= 5 && n <= 7))  // left items
      bounds.left = Math.max(-pos.x, bounds.left);
    $item.css({
      left: pos.x + "px",
      top: pos.y + "px"
    });
  });
  this.detach();
  this.$div.css("visibility", "visible");
};
Menu.prototype = {
  /**
   * Sets/gets/removes command of an item.
   * @param {Number} idx Item index, an integer from 0 to 7.
   * @param {Object} cmdName Optional. Command name. Pass an empty string or null to remove a command.
   * @param {String} cmdLabel Optional. Readable text displayed on the menu item.
   *   If not given, use locale text resource.
   * @return {Object, String} Menu object itself or command name.
   */
  command: function(idx, cmdName, cmdLabel) {
    if (idx === undefined) {
      if (this.$activeItem) idx = this.$activeItem.index();
      else return "";
    } 
    var $child = this.$div.children().eq(idx);
    if (cmdName === undefined) return $child.data("cmd");
    if (cmdName === "" || cmdName === null) {
      $child.removeData("cmd");
      $child.empty();
      $child.css("visibility", "hidden");
    } else {
      $child.data("cmd", cmdName);
      if (cmdLabel)
        $child.html(cmdLabel);
      else
        $child.html( L(cmdName) );
      $child.css("visibility", "inherit");
    }
    return this;
  },
  /**
   * Sets a CSS property of the menu or one of its items.
   * @param {String} prop CSS property name.
   * @param {String, Number} value property value.
   * @param {Number} idx Item index, an integer from 0 to 7.
   * @return {Object} Menu object itself.
   */
  css: function(prop, value, idx) {
    var $target = this.$div;
    if (idx >= 0) $target = $target.children().eq(idx);
    $target.css(prop, value);
    return this;
  },
  /**
   * Makes the menu or one of its items visible.
   * @param {Number} idx Optional. Item index, an integer from 0 to 7.
   * @return {Object} Menu object itself.
   */
  show: function(idx) {
    return this.css("visibility", "visible", idx);
  },
  /**
   * Makes the menu or one of its items hidden.
   * @param {Number} idx Optional. Item index, an integer from 0 to 7.
   * @return {Object} Menu object itself.
   */
  hide: function(idx) {
    return this.css("visibility", "hidden", idx);
  },
  /**
   * Appends the menu to another node.
   * @param {DOMElement, jQuery} parent Optional.
   *   Parent node to be attached to. Default: document.body.
   * @return {Object} Menu object itself.
   */
  attach: function(parent) {
    this.$div.appendTo(parent || document.body);
    return this;
  },
  /**
   * Detach the menu from the parent node if there's any.
   * @return {Object} Menu object itself.
   */
  detach: function() {
    this.$div.detach();
    return this;
  },
  /**
   * Sets/gets the position of the menu.
   * @param {Number} x Optional.
   * @param {Number} y Optional.
   * @return {Object} Menu object itself. Or the position such as { x: 100, y: 300 }.
   */
  offset: function(x, y) {
    if (x === undefined)
      return { x: parseInt(this.$div.css("left")),
               y: parseInt(this.$div.css("top")) };
    this.$div.css({
      left: x + "px",
      top: y + "px"
    });
    return this;
  },
  scale: function(factor) {
    if (factor === undefined) {
      var t = this.$div.css("-webkit-transform");
      var subject = "scale(";
      var idx = t.indexOf(subject);
      if (idx >= 0) return parseFloat(t.substr(idx + subject.length));
      return 1;
    }
    this.$div.css({ "-webkit-transform": "scale(" + factor + ")" });
    return this;
  },
  opacity: function(factor, idx) {
    var $target = this.$div;
    if (idx >= 0) $target = $target.children().eq(idx);
    if (factor >= 0) {
      $target.css("opacity", factor);
      return this;
    }
    return parseFloat($target.css("opacity"));
  },
  fadeIn: function(dur, idx) {
    var menu = this;
    if (idx >= 0) {
      this.opacity(0, idx);
      this.show(i);
    } else {
      this.scale(0);
      this.opacity(0);
    }
    this.show();
    var start = new Date().getTime();
    var menu = this;
    var update = function() {
      var t = (new Date().getTime() - start) / dur;
      var u = Utils.ease(t);
      if (idx == undefined) menu.scale(u);
      menu.opacity(u);
      if (t < 1) setTimeout(update, 12);
    };
    update();
    return this;
  },
  ghost: function(x, y, delay, dur, callback) {
    var $item = this.$activeItem;
    if (!$item) return this;
    delay = delay || 200;
    dur = dur || 400;
    var $clonedMenu = $(this.$div[0].cloneNode(false));
    var $clonedItem = $item.clone().appendTo($clonedMenu);
    var $parent = this.$div.parent();
    if ($parent) $clonedMenu.appendTo($parent);
    if (x != undefined) {
      var center = $clonedMenu.offset();
      x = Math.round(x + $win.scrollLeft() - center.left - $clonedItem.outerWidth() / 2);
      y = Math.round(y + $win.scrollTop() - center.top - $clonedItem.outerHeight() / 2);
      $clonedItem.css({ left: x + "px", top: y + "px" });
      $clonedMenu.css("visibility", "visible");
    }
    setTimeout(function() {
      $clonedMenu.animate({ opacity: 0 }, dur, function() {
        $(this).remove();
      });
    }, delay);
    return this;
  },
  mark: function(idx) {
    var unmark = function(menu) {
      if (menu.$activeItem) {
        var lastIdx = menu.$activeItem.index();
        menu.$activeItem.css({
          background: Utils.itemColor(menu.bg[0], menu.bg[1], lastIdx),
          color: Utils.itemColor(menu.fg[0], menu.fg[1], lastIdx)
        });
      }
    }
    if (idx >= 0) {
      if (this.$activeItem && this.$activeItem.index() == idx) return this;
      else {
        unmark(this);
        this.$activeItem = this.$div.children().eq(idx).css({
          background: this.prefs.bgActive,
          color: this.prefs.fgActive
        });
      }
    } else {
      unmark(this);
      this.$activeItem = null;
    }
    return this;
  }
};

var Canvas = function(prefs) {
  this.prefs = prefs;
  this.$cvs = $("<canvas id='mkmenu-canvas'></canvas>").css({
    position: "absolute",
    left: 0,
    top: 0,
    background: "transparent"
    //opacity: 0.3
  });
  this.clearRect = null;
};
Canvas.prototype = {
  attach: function(parent) {
    parent = parent || document.body;
    this.$cvs.appendTo(parent);
    return this;
  },
  detach: function() {
    this.$cvs.detach();
    return this;
  },
  resize: function(w, h) {
    w = w || $win.width();
    h = h || $win.height();
    this.$cvs.attr({
      width: w,
      height: h
    });
    return this;
  },
  ray: function(fromX, fromY, toX, toY) {
    var ctx = this.$cvs[0].getContext('2d');
    if (this.clearRect != null) {
      var r = this.clearRect;
      ctx.clearRect(r.x, r.y, r.w, r.h);
    }
    ctx.lineCap = "round";
    var prefs = this.prefs;
    this._drawLine(ctx, prefs.rayBdrColor, prefs.rayBdrWidth, prefs.rayBdrOpacity, fromX, fromY, toX, toY);
    this._drawLine(ctx, prefs.rayColor, prefs.rayWidth, prefs.rayOpacity, fromX, fromY, toX, toY);
    this.clearRect = {
      x: Math.min(fromX, toX) - 2,
      y: Math.min(fromY, toY) - 2,
      w: Math.abs(fromX - toX) + 4,
      h: Math.abs(fromY - toY) + 4
    };
    return this;
  },
  _drawLine: function(ctx, lineColor, lineWidth, opacity, fromX, fromY, toX, toY) {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.closePath();
    ctx.stroke();
  }
};

var Container = function() {
  this.$div = $("<div id='mkmenu-container'>").css({
    position: "fixed",
    zIndex: 1000000
  });
};
Container.prototype = {
  attach: function(parent) {
    this.$div.css({
      left: 0,
      top: 0
    }).appendTo(parent || document.body);
    return this;
  },
  detach: function() {
    this.$div.detach();
    return this;
  }
};

chrome.extension.sendRequest({name: "getPrefs"}, function(prefs) {
  
  var popped = false;  // is a menu or an item shown?
  var ctx = null;      // current context name
  var popupTimer = 0;  // popup timeout ID
  var contexts = ["cmdsBg", "cmdsText", "cmdsImg", "cmdsLink", "cmdsSubmit", "cmdsEdit"];
  
  var container = new Container();
  var canvas = new Canvas(prefs);
  var menuSet = {};
  for (var i in contexts)
    menuSet[contexts[i]] = new Menu(prefs, contexts[i]);
    
  $doc.mousedown(function(event) {
    if (event.button != prefs.mouseButton) return;  // only response to mouse button that is set in preferences
    if (prefs.modKey == "ctrl" && !event.ctrlKey) return;
    if (prefs.modKey == "alt" && !event.altKey) return;
    //var sel = window.getSelection();
    //var range = sel.getRangeAt(0);
    ctx = Utils.getContext(event.target);
    var menu = menuSet[ctx];
    canvas.resize();
    // boundary check
    var winWidth = $win.width();
    var winHeight = $win.height();
    var fixedX = event.clientX;
    var fixedY = event.clientY;
    if (fixedX - menu.bounds.left < 0) {
      fixedX += menu.bounds.left - fixedX;
    } else if (fixedX + menu.bounds.right > winWidth) {
      fixedX -= fixedX + menu.bounds.right - winWidth;
    }
    if (fixedY - menu.bounds.top < 0) {
      fixedY += menu.bounds.top - fixedY;
    } else if (fixedY + menu.bounds.bottom > winHeight) {
      fixedY -= fixedY + menu.bounds.bottom - winHeight;
    }
    //menu.offset(event.clientX, event.clientY);
    menu.offset(fixedX, fixedY);
    menu.hide();
    menu.attach(container.$div);
    container.attach();
    
    var scheduleFadeIn = function() {
      popupTimer = setTimeout(function() {
        popped = true;
        menu.fadeIn(200);
        //window.getSelection().removeAllRanges(); // restore selection
        //window.getSelection().addRange(range);   // for Chrome
      }, prefs.popupDelay);
    };
    scheduleFadeIn();
    
    // mouse position when pressed
    var pressedX = event.clientX;
    var pressedY = event.clientY;
    $doc.bind("mousemove.mkmenu", function(event) {
      canvas.attach(container.$div);
      if (popped) {
        var x = fixedX;
        var y = fixedY;
      } else {
        var x = pressedX;
        var y = pressedY;
        clearTimeout(popupTimer);
        scheduleFadeIn();
      }
      var idx = Utils.dragIdx(event.clientX - x, event.clientY - y);
      menu.mark(idx);
      canvas.ray(x, y, event.clientX, event.clientY);
    });
  });
  
  $doc.mouseup(function(event) {
    $doc.unbind("mousemove.mkmenu");
    clearTimeout(popupTimer);
    if (event.button != prefs.mouseButton) return;
    canvas.detach();
    var menu = menuSet[ctx];
    if (menu.$activeItem) {
      if (!popped) {
        popped = true;
        var x = event.clientX;
        var y = event.clientY;
      }
      
      var func = Cmds[ menu.command() ];
      var hideInstancely = false;
      if (func) {
        hideInstancely = func(prefs, event);
      }
      
      if (hideInstancely) {
        container.detach();
      } else {
        menu.ghost(x, y, prefs.hideDelay, 400, function() {
          container.detach();        
        });
      }
      
      canvas.detach();
      menu.detach();
      menu.mark();
    } else {
      container.detach();
      menu.detach();
      menu.mark();
    }
  });
  
  // if marking menu is popped, don't show context menu
  $doc.bind("contextmenu", function(event) {
    if (popped) {
      popped = false;
      return false;
    }
  });
});