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
};

MWeb._inputModes = {

  initial: {},

  pointSelect: {

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

      var p = this._point(e);

      if(this.game.isPlayed(p.x, p.y)) {
        this._status('You already played there...');
        return;
      }

      if(this.playing) {
        var lines = this.game.lines(p.x, p.y);
        var played = false;

        if(lines.length == 0) {
          this._status('Invalid move!');
        } else if(lines.length == 1) {
          this.move(p.x, p.y, lines[0]);
        } else {
          this._lineSelect(p, lines, {x: e.pageX, y: e.pageY});
        }
      } else {
        this.play(p.x, p.y);
        this._status('Mark placed.');
      }

      this._redraw();
    }
  },

  lineSelect: {

    mousedown: function(e) {
      if(e.which == 1) {
        this._dragging = true;
      } else {
        this._currentPoint = this._lines = this._currentLine = null;
        this._pointSelect();
      }
      this._redraw();
    },

    mousemove: function(e) {
      this._dragging = true;
      this._setCurrentLine({x: e.pageX, y: e.pageY});
      this._redraw();
    },

    mouseup: function(e) {
      if(!this._dragging) return;

      this.move(this._currentPoint.x, this._currentPoint.y, this._currentLine);
      this._currentPoint = this._lines = this._currentLine = null;
      this._pointSelect();
      this._redraw();
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
  
  option: function(name, value) {
    if(typeof value === 'undefined') {
      return this.options[name];
    } else {
      this.options[name] = value;
      this._redraw();
      return this;
    }
  },

  init: function(rules) {
    this.canvas = $('<canvas></canvas>').get(0);
    this._trans = {x: 0, y: 0};
    $(this.target).html(this.canvas);

    this.game = new Morpion();
    this.history = [];
    this.playing = false;

    this._listen();

    if(rules) {
      try {
        this.game.len = rules.length;
        this.game.dis = rules.disjoint;
        if('marks' in rules) {
          for(var i = 0; i < rules.marks.length; i++) {
            this.play.apply(this, rules.marks[i]);
          }
        }
        this._pointSelect();
        this.start(); // redraws
      } catch(e) {
        console.log(e);
        this._status('Failed to load game :(');
      }
    } else {
      this._pointSelect();
      this._status('Place your marks!');
    }
  },

  start: function() {
    this.playing = true;
    this._status('Game started.');
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

    this._input = MWeb._inputModes.initial;
  },

  _pointSelect: function() {
    this._input = MWeb._inputModes.pointSelect;
    this.canvas.style.cursor = 'crosshair';
  },

  _lineSelect: function(point, lines, mouse) {
    this._currentPoint = point;
    this._lines = lines;
    this._dragging = false;

    if(mouse) {
      this._setCurrentLine(mouse);
    } else {
      this._currentLine = this._lines[0];
    }

    this._input = MWeb._inputModes.lineSelect;
    this.canvas.style.cursor = 'move';
    this._status('Select a line.');
  },

  _status: function(status) {
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

  play: function(x, y, line) {
    if(line) {
      this.game.markSafe(x, y, line);
      this.history.push([x, y, line]);
    } else {
      this.game.mark(x, y);
      this.history.push([x, y]);
    }
  },

  move: function(x, y, line) {
    this.play(x, y, line);
    var mi = Math.floor(Math.random()*this.options.messages.length);
    this._status(this.options.messages[mi]);
  },

  undo: function() {
    if(this.history.length > 0) {
      var mark = this.history.pop();
      if(!this.playing || mark[2]) {
        this.game.unmark.apply(this.game, mark);
        this._status('Move undone!');
        return true;
      } else {
        this.history.push(mark);
        this._status('Nothing to undo!');
        return false;
      }
    } else {
      return false;
    }
  },

  restart: function() {
    while(this.undo());
    this._status('Game restarted.');
  },

  _redraw: function() {
    if(!this.game) return;

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

    if(!this._lines && this.options.showValid) {
      this._drawValid(ctx);
    }

    // draw preview
    if(this._currentPoint) {
      ctx.fillStyle = '#f00';
      this._drawMark(ctx, [this._currentPoint.x, this._currentPoint.y]);
    }

    // draw lines and initial marks
    var score = 0;
    for(var i = 0; i < this.history.length; i++) {
      var mark = this.history[i];

      if(mark[2]) {
        score++;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        this._drawLine(ctx, mark[2]);
      } else {
        ctx.fillStyle = '#333';
        this._drawMark(ctx, mark);
      }
    }

    this._drawMarkers(ctx);

    if(this._lines) {
      this._drawLines(ctx);
    }

    if(this.options.score) {
      $(this.options.score).text(score);
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

  _drawMarkers: function(ctx) {
    var num = 1;
    for(var i = 0; i < this.history.length; i++) {
      var mark = this.history[i], showNum = null;

      if(mark[2]) {
        if(this.options.showNumbers) {
          showNum = num++;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '10px sans';
        }

        ctx.fillStyle = '#000';
        this._drawMark(ctx, mark, showNum);
      }
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
    if(this.history.length > 0) {
      var b = null;
      for(var i = 0; i < this.history.length; i++) {
        var m = this.history[i];
        if(b) {
          if(m[0] < b.xMin) b.xMin = m[0];
          if(m[0] > b.xMax) b.xMax = m[0];
          if(m[1] < b.yMin) b.yMin = m[1];
          if(m[1] > b.yMax) b.yMax = m[1];
        } else {
          b = {xMin: m[0], xMax: m[0], yMin: m[1], yMax: m[1]};
        }
      }
      return b;
    } else {
      return {xMin: 0, xMax: 0, yMin: 0, yMax: 0}
    }
  },

  import: function(data) {
    data = data.split(';');
    var meta = data.shift().split(':');
    var marks = data.map(function(m) {
      m = m.split(',').map(function(i) { return parseInt(i); });
      var mark = [m.shift(), m.shift()];
      if(m.length > 0) mark.push(m);
      return mark;
    });
    return {length: parseInt(meta[0]), disjoint: parseInt(meta[1]), marks: marks};
  },

  export: function() {
    return this.game.len+':'+this.game.dis+';'+this.history.join(';');
  }

};

function playUI() {
  $('#options_play, #score').show();
  $('#options_design').hide();
  customUI($('#variant_value').val() == 'custom', true);
}

function designUI() {
  $('#options_design').show();
  $('#options_play, #score').hide();
  customUI(true, false);
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

function customUI(show, disabled) {
  var cr = $('#custom_rules');
  if(show) {
    cr.show()
    $('#length_value, #disjoint_value').prop('disabled', disabled);
  } else {
    cr.hide();
  }
}

$(function() {
  var ui = new MWeb($('#morpion').get(0), {
    score: $('#score_value').get(0),
    status: $('#status_value').get(0)
  });
  
  $('.option').change(function() {
    ui.option(this.name, this.checked);
  }).change();

  $('#variant_value').change(function() {
    var variant = $(this).val();
    if(variant == "custom") {
      ui.init();
      designUI();
      setInfo("This one's up to you! Place your starting marks where you want them, then click Start to begin playing.");
    } else {
      $.getJSON('games/'+variant+'.json', function(rules) {
        ui.init(rules);
        playUI();
        setInfo(rules.desc, rules.link);
      });
    }
  }).change();

  $('.restart').click(function() {
    if(!confirm('Are you sure you want to restart?')) return;

    ui.restart();
  });

  $('.undo').click(function() {
    ui.undo();
  });

  $('#import').click(function() {
    if(!confirm('Are you sure you want to abandon your current game?')) return;

    var rules = ui.import($('#serial_data').val());

    $('#variant_value').val('custom');
    
    ui.init(rules);
    $('#length_value').val(rules.length);
    $('#disjoint_value').val(rules.disjoint);
    playUI();

    setInfo('This is an imported game.');
  });

  $('#export').click(function() {
    $('#serial_data').val(ui.export());
  });

  $('#start').click(function() {
    ui.game.len = parseInt($('#length_value').val());
    ui.game.dis = parseInt($('#disjoint_value').val());
    ui.start();
    playUI();
  });

  $('h1').on('click.wtf', function() {
    console.log('cliccked!');
    $(this).off('*.wtf');
  });
});