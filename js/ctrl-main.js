function Tab (name, path, id, project, text, session, scope) {
  this.name = name;
  this.path = path;
  this.id = id;
  this.project = project;
  this.session = session;
  this.md5sum = md5(text);
  this.saved_md5sum = this.md5sum;
  this.scope = scope;
  
  return this;
}

Tab.prototype.position = function (index) {
  return 115 * index;
};

Tab.prototype.save = function (force) {
  var changed = false;
  if (!force) {
    var md5sum = md5(this.session.getValue());
    if (md5sum != this.md5sum) {
      changed = true;
    }
  }
  
  if (force || changed) {
    this.project.save(this);
  }
};

Tab.prototype.update_hash = function () {
  this.md5sum = md5(this.session.getValue());
};

ndrive.controller('MainCtrl', function($scope, $rootScope) {
  $scope.tabs = [];
  $scope.current_tab = null;
  $scope.set_hasher = true;
  
  $scope.update_hash = function () {
    if ($scope.current_tab) {
      $scope.tabs[$scope.current_tab].update_hash();
      $scope.$apply();
    }
  };
  
  $scope.get_mode = function (name) {
    var parts = name.split('.');
    var ext = name.toLowerCase();
    if (parts.length > 1) {
      ext = parts[parts.length - 1].toLowerCase();
    }
    
    if (EXTENSIONS[ext]) {
      return EXTENSIONS[ext];
    }
    
    return 'plain_text';
  };
  
  $scope.set_session_prefs = function (session) {
    session.setTabSize(PREFS.tabsize);
    session.setUseSoftTabs(PREFS.softab);
    
    switch (PREFS.soft_wrap) {
      case "off":
        session.setUseWrapMode(false);
        break;
        
      case "free":
        session.setUseWrapMode(true);
        session.setWrapLimitRange(null, null);
        break;
        
      default:
        session.setUseWrapMode(true);
        session.setWrapLimitRange(PREFS.print_margin, PREFS.print_margin);
        break;
    }
  };
  
  $scope.set_editor_prefs = function () {
    $("#editor").css('font-size', PREFS.fontsize);
    
    var handler = null;
    if (PREFS.keybind == 'emacs') {
      handler = require("ace/keyboard/emacs").handler;
    }
    
    else if (PREFS.keybind == 'vim') {
      handler = require("ace/keyboard/vim").handler;
    }
    
    Editor.setKeyboardHandler(handler);
    Editor.setTheme("ace/theme/" + PREFS.theme);
    
    Editor.setHighlightActiveLine(PREFS.hactive);
    Editor.setHighlightSelectedWord(PREFS.hword);
    Editor.setShowInvisibles(PREFS.invisibles);
    Editor.setBehavioursEnabled(PREFS.behave);
    
    Editor.renderer.setFadeFoldWidgets(false);
    Editor.renderer.setShowGutter(PREFS.gutter);
    Editor.renderer.setShowPrintMargin(PREFS.pmargin);
    Editor.renderer.setPrintMarginColumn(PREFS.print_margin);
  };
  
  $scope.set_prefs = function (event, prefs) {
    for (var key in PREFS) {
      PREFS[key] = prefs[key];
    }
    
    for (var i=0; i < $scope.tabs.length; i++) {
      $scope.set_session_prefs($scope.tabs[i].session);
    }
    
    $scope.set_editor_prefs();
    
    if (event) {
      chrome.storage.sync.set({'prefs': JSON.stringify(PREFS)}, function() {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
        
        else {
          console.log('Prefs saved');
          console.log(PREFS);
        }
      });
    }
  };
  
  $scope.add_tab = function (event, file, text, project) {
    var session = new EditSession(text);
    session.setUndoManager(new UndoManager());
    session.setMode("ace/mode/" + $scope.get_mode(file.name));
    
    $scope.set_session_prefs(session);
    $scope.set_editor_prefs();
    
    Editor.setSession(session);
    
    var t = new Tab(file.name, file.path, file.id, project, text, session, $scope);
    $scope.tabs.push(t);
    $scope.current_tab = $scope.tabs.length - 1;
    $scope.$apply();
    
    Editor.focus();
    $scope.scroll_to($scope.tabs.length - 1);
    
    if ($scope.set_hasher) {
      Editor.on("change", $scope.update_hash);
      $scope.set_hasher = false;
    }
  };
  
  $scope.open_tab = function (event, path, pid, callback) {
    for (var i=0; i < $scope.tabs.length; i++) {
      var tab = $scope.tabs[i];
      if (tab.path == path && tab.project.pid == pid) {
        $scope.switch_tab(i);
        return null;
      }
    }
    
    callback();
  };
  
  $scope.remove_tab = function (index) {
    delete $scope.tabs[index].session;
    $scope.tabs.splice(index, 1);
    if (index === $scope.current_tab) {
      if ($scope.tabs.length === 0) {
        $scope.current_tab = null;
      }
      
      else {
        if ($scope.tabs.length > index) {
          $scope.switch_tab(index);
        }
        
        else {
          $scope.switch_tab(index - 1);
        }
      }
    }
  };
  
  $scope.switch_tab = function (index, noscroll) {
    $scope.current_tab = index;
    Editor.setSession($scope.tabs[index].session);
    Editor.focus();
    
    if (!noscroll) {
      $scope.scroll_to(index);
    }
  };
  
  $scope.scroll_to = function (index) {
    var l = $scope.tabs[index].position(index);
    $("#tabs .tab-scroll").animate({scrollLeft: l}, 500);
  };
  
  $scope.save_current = function () {
    $scope.tabs[$scope.current_tab].save(true);
  };
  
  $scope.close_tab = function () {
    $scope.remove_tab($scope.current_tab);
    $scope.$apply();
  };
  
  $scope.close_tab_all = function () {
    while ($scope.tabs.length > 0) {
      $scope.remove_tab($scope.tabs.length - 1);
    }
    
    $scope.$apply();
  };
  
  chrome.storage.sync.get('prefs', function (obj) {
    if (obj.prefs) {
      $scope.set_prefs(null, JSON.parse(obj.prefs));
      $scope.$apply();
    }
  });
  
  $rootScope.$on('addTab', $scope.add_tab);
  $rootScope.$on('openTab', $scope.open_tab);
  $rootScope.$on('setPrefs', $scope.set_prefs);
  
  $rootScope.$on('keyboard-save', $scope.save_current);
  $rootScope.$on('keyboard-close-tab', $scope.close_tab);
  $rootScope.$on('keyboard-close-tabs-all', $scope.close_tab_all);
});