var MWeb = function(target, options) {
  this.target = target;

  this.options = $.extend({
    minWidth: 13,
    minHeight: 13,
    score: null,
    status: null,
    showValid: false,
    showNumbers: false,
    size: 31,
    minPadding: 2,
    messages: [
      'Great job!',
      'Good one.',
      "Even I didn't see that coming!",
      'Are you cheating?',
      'Nice move, buddy.'
    ]
  }, options || {});

  this.canvas = $('<canvas></canvas>').get(0);
  this._trans = {x: 0, y: 0};
  $(this.target).html(this.canvas);

  this._listen();
  this.reset();
};

MWeb._inputModes = {

  initial: {},

  pointSelect: {

    setup: function() {
      this.canvas.style.cursor = 'crosshair';
    },

    cleanup: function() {
      this.canvas.style.cursor = 'auto';
    },

    mousemove: function(e) {
      this._currentPoint = this._point(e);
      this._redraw();
    },

    mouseout: function(e) {
      this._currentPoint = null;
      this._redraw();
    },

    mousedown: function(e) {
      if(e.which != 1) {
        this.undo();
        return;
      }

      var p = this._currentPoint = this._point(e);

      if(!this.isOpen(p.x, p.y)) {
        this.status("That spot isn't open!");
        return;
      }

      if(this.game) {
        var lines = this.game.lines(p.x, p.y);
        if(lines.length == 0) {
          this.status('Invalid move!');
        } else if(lines.length == 1) {
          this.move(p.x, p.y, lines[0]);
          this.cute();
        } else {
          this._setInput('lineSelect', lines, {x: e.pageX, y: e.pageY});
        }
      } else {
        this._config.marks.push([p.x, p.y]);
        this.status('Mark placed.');
      }

      this._redraw();
    }
  },

  lineSelect: {

    setup: function(lines, mouse) {
      this._lines = lines;
      this._dragging = false;

      if(mouse) {
        this._setCurrentLine(mouse);
      } else {
        this._currentLine = this._lines[0];
      }

      this._input = MWeb._inputModes.lineSelect;
      this.canvas.style.cursor = 'move';
      this.status('Select a line.');
    },

    cleanup: function() {
      this._lines = this._currentLine = null;
      this._redraw();
    },

    mousedown: function(e) {
      if(e.which == 1) {
        this._down = true;
      } else {
        this._setInput('pointSelect');
      }
      this._redraw();
    },

    mousemove: function(e) {
      if(this.options.dragging) this._down = true;
      this._setCurrentLine({x: e.pageX, y: e.pageY});
      this._redraw();
    },

    mouseup: function(e) {
      if(!this._down) return;
      this._down = false;
      
      this.move(this._currentPoint.x, this._currentPoint.y, this._currentLine);
      this.cute();
      this._setInput('pointSelect');
    }

  }

};

var Geo = {
  midpoint: function(p1, p2) {
    return {x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2};
  },
  distance: function(p1, p2) {
    return Math.sqrt(Math.pow(p1.x-p2.x, 2) + Math.pow(p1.y-p2.y, 2));
  }
};

MWeb.prototype = {

  custom: function() {
    this.reset();
    this._setInput('pointSelect');
  },

  reset: function() {
    this._setInput('initial');
    this.game = null;
    this._config = {length: 4, disjoint: 0, marks: []};
    this._history = [];
    this._redraw();
  },

  _setInput: function(input) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.shift();

    if(this._input && 'cleanup' in this._input) {
      this._input.cleanup.apply(this);
    }
    this._input = MWeb._inputModes[input];
    if('setup' in this._input) {
      this._input.setup.apply(this, args);
    }
  },
  
  option: function(name, value) {
    if(typeof value === 'undefined') {
      return this.options[name];
    } else {
      this.options[name] = value;
      this._redraw();
      return this;
    }
  },

  isOpen: function(x, y) {
    if(this.game) {
      return !this.game.isPlayed(x, y);
    } else {
      for(var i = 0; i < this._history.length; i++) {
        if(this._history[i][0] == x && this._history[i][1] == y) {
          return false;
        }
      }
      return true;
    }
  },

  config: function(attr, value) {
    if(typeof attr === 'undefined') {
      return $.extend({}, {moves: this._history}, this._config);
    } else if(typeof attr === 'string' && typeof value === 'undefined') {
      return this._config[attr];
    } else {
      // can not change configuration while game is in progress
      if(this.game) this.reset();

      if(typeof attr == 'object') {
        $.extend(this._config, attr);
      } else {
        this._config[attr] = value;
      }
      return this;
    }
  },

  cute: function() {
    var mi = Math.floor(Math.random()*this.options.messages.length);
    this.status(this.options.messages[mi]);
  },

  start: function(rules) {
    if(typeof rules !== 'undefined') {
      this.config(rules);
    }

    try {
      this.game = new Morpion(this._config.length, this._config.disjoint);
      this._history = [];
      for(var i = 0; i < this._config.marks.length; i++) {
        var m = this._config.marks[i];
        this.game.mark(m[0], m[1]);
      }
      if('moves' in this._config) {
        for(var i = 0; i < this._config.moves.length; i++) {
          this.move.apply(this, this._config.moves[i]);
        }
      }
      this._setInput('pointSelect');
      this.status('Game started.');
    } catch(e) {
      console.log(e);
      this.status('Failed to load game :(');
    }
  },

  _setCurrentLine: function(p) {
    var bestLine = bestMid = -1;

    for(var i = 0; i < this._lines.length; i++) {
      var lx = this._lines[i][0], ly = this._lines[i][1], dx = this._lines[i][2], dy = this._lines[i][3];

      var v = this._page(lx, ly);
      var w = this._page(lx+this.game.len*dx, ly+this.game.len*dy);

      // distance to line segment is primary determinant
      // thanks: http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
      var l2 = Math.pow(v.x-w.x, 2) + Math.pow(v.y-w.y, 2);
      if(l2 == 0) {
        dLine = Geo.distance(p, v);
      } else {
        var t = ((p.x-v.x)*(w.x-v.x) + (p.y- v.y)*(w.y-v.y)) / l2;
        if(t < 0) {
          dLine = Geo.distance(p, v);
        } else if(t > 1) {
          dLine = Geo.distance(p, w);
        } else {
          dLine = Geo.distance(p, {x: v.x + t*(w.x-v.x), y: v.y + t*(w.y-v.y)});
        }
      }
      dLine = Math.round(dLine);

      // distance to midpoint as secondary determinant
      var mid = Geo.midpoint(v, w);
      var dMid = Geo.distance(p, mid);

      if(bestLine == -1 || dLine < bestLine || (dLine == bestLine && dMid < bestMid)) {
        bestLine = dLine;
        bestMid = dMid;
        this._currentLine = this._lines[i];
      }
    }
  },

  _listen: function() {
    var that = this;
    
    $(this.canvas).on('mousemove mouseup mousedown mouseout', function(event) {
      if(event.type in that._input) {
        event.preventDefault();
        that._input[event.type].call(that, event);
      }
    });
    $(this.canvas).on('contextmenu', function(e) { e.preventDefault(); });
  },

  status: function(status) {
    if(this.options.status) {
      $(this.options.status).text(status);
      this._redraw();
    }
  },

  _point: function(event) {
    return {
      x: Math.floor((event.pageX-$(this.canvas).offset().left-this._trans.x)/this.options.size),
      y: Math.floor((event.pageY-$(this.canvas).offset().top-this._trans.y)/this.options.size)
    }
  },

  _page: function(x, y) {
    return {
      x: this.options.size*(x+.5)+this._trans.x+$(this.canvas).offset().left,
      y: this.options.size*(y+.5)+this._trans.y+$(this.canvas).offset().top
    };
  },

  move: function(x, y, line) {
    this.game.markSafe(x, y, line);
    this._history.push([x, y, line]);
  },

  undo: function() {
    if(this.game) {
      if(this._history.length > 0) {
        this.game.unmark.apply(this.game, this._history.pop());
        this.status('Move undone!');
        return true;
      }
    } else if(this._config.marks.length > 0) {
      this._config.marks.pop();
      return true;
    }

    this.status('Nothing to undo!');
    return false;
  },

  restart: function() {
    while(this.undo());
    this.status('Game restarted.');
  },

  _redraw: function() {

    var ctx = this.canvas.getContext('2d');

    var b = this._bounds();
    var w = b.xMax-b.xMin+1;
    var h = b.yMax-b.yMin+1;

    var p = this.options.minPadding;
    var xPad = (w+p*2) < this.options.minWidth ? Math.ceil((this.options.minWidth-w)/2) : p;
    var yPad = (h+p*2) < this.options.minHeight ? Math.ceil((this.options.minHeight-h)/2) : p;

    this.canvas.width = (w+xPad*2)*this.options.size;
    this.canvas.height = (h+yPad*2)*this.options.size;

    // allows us to draw using actual coordinates
    this._trans = {
      x: (xPad-b.xMin)*this.options.size,
      y: (yPad-b.yMin)*this.options.size
    };
    ctx.translate(this._trans.x, this._trans.y);

    if(this.game && !this._lines && this.options.showValid) {
      this._drawValid(ctx);
    }

    // draw preview
    if(this._currentPoint) {
      ctx.fillStyle = '#f00';
      this._drawMark(ctx, [this._currentPoint.x, this._currentPoint.y]);
    }

    // draw initial marks
    for(var i = 0; i < this._config.marks.length; i++) {
      ctx.fillStyle = '#333';
      this._drawMark(ctx, this._config.marks[i]);
    }

    // draw history lines
    if(this.game) {
      var s;
      for(s = 0; s < this._history.length; s++) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        this._drawLine(ctx, this._history[s][2]);
      }
      if(this.options.score) {
        $(this.options.score).text(s);
      }
    }

    // draw history marks
    for(var i = 0; i < this._history.length; i++) {
      if(this.options.showNumbers) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px sans';
      }

      ctx.fillStyle = '#000';
      this._drawMark(ctx, this._history[i], this.options.showNumbers ? i+1 : null);
    }

    if(this._lines) {
      this._drawLines(ctx);
    }

  },

  _drawValid: function(ctx) {
    ctx.fillStyle = '#CCC';
    ctx.strokeStyle = "#CCC";
    ctx.lineWidth = 1;

    var v = this.game.validMoves();
    for(var i = 0; i < v.length; i++) {
      this._drawMark(ctx, v[i]);
      this._drawLine(ctx, v[i][2]);
    }
  },

  _drawLines: function(ctx) {
    // white translucent overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(-this._trans.x, -this._trans.y, this.canvas.width, this.canvas.height);

    // draw non-current lines
    for(var i = 0; i < this._lines.length; i++) {
      if(this._lines[i] == this._currentLine) continue;
      ctx.strokeStyle = '#090';
      ctx.lineWidth = 3;
      this._drawLine(ctx, this._lines[i]);
    }

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 9;
    this._drawLine(ctx, this._currentLine);
  },

  _drawMark: function(ctx, mark, number) {
    var x = mark[0], y = mark[1];
    var showNum = typeof number == 'number';
    var cX = (x+.5)*this.options.size, cY = (y+.5)*this.options.size;

    ctx.beginPath();
    ctx.arc(cX, cY, this.options.size*(showNum ? .4 : .3), 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();

    if(showNum) {
      ctx.fillStyle = '#FFF';
      ctx.fillText(number, cX, cY);
    }
  },

  _drawLine: function(ctx, line) {
    ctx.lineCap = 'round';
    var x = line[0], y = line[1], dx = line[2], dy = line[3];
    x += .5; // center within cell
    y += .5; // center within cell
    ctx.beginPath();
    ctx.moveTo(x*this.options.size, y*this.options.size);
    ctx.lineTo((x+this.game.len*dx)*this.options.size, (y+this.game.len*dy)*this.options.size);
    ctx.moveTo(0, 0);
    ctx.closePath();
    ctx.stroke();
  },

  _bounds: function() {
    var marks = this._config.marks.concat(this._history);

    if(marks.length > 0) {
      var b = {xMin: marks[0][0], xMax: marks[0][0], yMin: marks[0][1], yMax: marks[0][1]};
      for(var i = 1; i < marks.length; i++) {
        var m = marks[i];
        if(m[0] < b.xMin) b.xMin = m[0];
        if(m[0] > b.xMax) b.xMax = m[0];
        if(m[1] < b.yMin) b.yMin = m[1];
        if(m[1] > b.yMax) b.yMax = m[1];
      }
      return b;
    } else {
      return {xMin: 0, xMax: 0, yMin: 0, yMax: 0}
    }
  },

  progress: function() {
    return this._history.length > 0;
  }

};

function playUI() {
  $('.design_ui').hide();
  $('.play_ui').show();
  $('.custom_ui').toggle($('#variant_value').val() == 'custom');
  customEnabled(false);
}

function designUI() {
  $('.play_ui').hide();
  $('.design_ui, .custom_ui').show();
  $('#options_design').show();
  $('#options_play, #score').hide();
  customEnabled(true);
}

function setInfo(desc, link) {
  var info = $('#variant_info').html('');
  if(typeof desc !== 'undefined') {
    $('<p></p>').text(desc).appendTo(info);
  }
  if(typeof link !== 'undefined') {
    var link = $('<a target="_blank">More Information</a>').attr('href', link);
    $('<p></p>').append(link).appendTo(info);
  }
}

function customEnabled(enabled) {
  $('.custom_ui').filter('input, textarea, select, button').prop('disabled', !enabled);
}

function populate(config) {
  $('.custom_config').each(function() {
    $(this).val(config[this.name]);
  });
  setInfo(config.desc, config.link);
}

$(function() {
  var ui = new MWeb($('#morpion').get(0), {
    score: $('#score_value').get(0),
    status: $('#status_value').get(0)
  });

  function confirmAbandon() {
    return ui.progress() ? confirm("Are you sure you want to abandon your current game?") : true;
  }
  
  $('.option').change(function() {
    ui.option(this.name, this.checked);
  }).change();

  $('#variant_value').click(function() { $('option:selected', this).addClass('last_selected'); }).click();
  $('#variant_value').change(function() {
    if(!confirmAbandon()) {
      $('.last_selected', this).removeClass('last_selected').prop('selected', true);
      return;
    }

    var variant = $(this).val();
    if(variant == "custom") {
      ui.custom();
      populate(ui.config());
      designUI();
    } else {
      $.getJSON('games/'+variant+'.json', function(rules) {
        ui.start(rules);
        playUI();
        setInfo(rules.desc, rules.link);
      });
    }
  }).change();

  $('.load_game').click(function() {
    if(!confirmAbandon()) return;
    $.getJSON('games/'+this.value+'.json', function(rules) {
      ui.start(rules);
      populate(rules);
      playUI();
      ui.status('Game loaded.');
      setInfo(rules.desc, rules.link);
    });
  });

  $('.restart').click(function() {
    if(!confirm('Are you sure you want to restart?')) return;
    ui.restart();
  });

  $('.undo').click(function() {
    ui.undo();
  });

  $('#import').click(function() {
    if(!confirmAbandon()) return;

    try {
      var cfg = JSON.parse($('#import_data').val());
      ui.start(cfg);
      $('#variant_value').val('custom');
      populate(cfg);
      playUI();
    } catch(e) {
      console.log(e);
      ui.status("Failed to import game!");
    }
  });

  $('#export').click(function() {
    $('#export_data').val(JSON.stringify(ui.config())).select();
  });

  $('.custom_config').change(function() {
    var val = $(this).hasClass('int') ? parseInt($(this).val()) : $(this).val();
    ui.config(this.name, val);
  });

  $('#start').click(function() {
    ui.start();
    populate(ui.config());
    playUI();
  });
});