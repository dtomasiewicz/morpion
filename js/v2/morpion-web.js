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
    padding: 2,
    messages: [
      'Great job!',
      'Good one.',
      "Even I didn't see that coming!",
      'Are you cheating?',
      'Nice move, buddy.'
    ]
  }, options || {});
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
    this.transX = this.transY = 0;
    $(this.target).html(this.canvas);
    this.preview = this.linePreview = null;

    this.game = new Morpion();
    this.history = [];
    this.playing = false;

    if(rules) {
      try {
        this.game.len = rules.length;
        this.game.dis = rules.disjoint;
        if('marks' in rules) {
          for(var i = 0; i < rules.marks.length; i++) {
            this.play.apply(this, rules.marks[i]);
          }
        }
        this.start(); // redraws
      } catch(e) {
        console.log(e);
        this._status('Failed to load game :(');
      }
    } else {
      this._status('Place your marks!');
    }

    this._listen();
  },

  start: function() {
    this.playing = true;
    this._status('Game started.');
  },

  _listen: function() {
    var mweb = this;
    
    $(this.canvas).on('mousemove.preview', function(e) {
      mweb.preview = mweb._coords(e);
      mweb._redraw();
    });
    
    $(this.canvas).on('mouseout.preview', function() {
      mweb.preview = null;
      mweb._redraw();
    });

    $(this.canvas).on('click.play', function(e) {
      var c = mweb._coords(e);
      if(mweb.game.isPlayed(c.x, c.y)) {
        mweb._status('You already played there...');
        return;
      }

      if(mweb.playing) {
        var lines = mweb.game.lines(c.x, c.y);
        var played = false;

        if(lines.length == 0) {
          mweb._status('Invalid move!');
        } else if(lines.length == 1) {
          mweb.play(c.x, c.y, lines[0]);
          played = true;
        } else {
          for(var i = 0; i < lines.length; i++) {
            mweb.linePreview = lines[i];
            mweb._redraw();
            if(confirm('Play this one?')) {
              mweb.play(c.x, c.y, lines[i]);
              played = true;
              break;
            }
          }
          mweb.linePreview = null;
        }

        if(played) {
          var mi = Math.floor(Math.random()*mweb.options.messages.length);
          mweb._status(mweb.options.messages[mi]);
        }
      } else {
        mweb.play(c.x, c.y);
        mweb._status('Mark placed.');
      }

      mweb._redraw();
    });
  },

  _status: function(status) {
    if(this.options.status) {
      $(this.options.status).text(status);
      this._redraw();
    }
  },

  _coords: function(event) {
    return {
      x: Math.floor((event.pageX-$(this.canvas).offset().left-this.transX)/this.options.size),
      y: Math.floor((event.pageY-$(this.canvas).offset().top-this.transY)/this.options.size)
    }
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

    var p = this.options.padding;
    var xPad = (w+p*2) < this.options.minWidth ? Math.ceil((this.options.minWidth-w)/2) : p;
    var yPad = (h+p*2) < this.options.minHeight ? Math.ceil((this.options.minHeight-h)/2) : p;

    this.canvas.width = (w+xPad*2)*this.options.size;
    this.canvas.height = (h+yPad*2)*this.options.size;


    // allows us to draw using actual coordinates
    this.transX = (xPad-b.xMin)*this.options.size;
    this.transY = (yPad-b.yMin)*this.options.size;
    ctx.translate(this.transX, this.transY);

    if(this.options.showValid) {
      ctx.fillStyle = '#CCC';
      ctx.strokeStyle = "#CCC";
      ctx.lineWidth = 1;
      var v = this.game.validMoves();
      for(var i = 0; i < v.length; i++) {
        var m = v[i], l = v[i][2];
        this._drawMark(ctx, m[0], m[1]);
        this._drawLine(ctx, l[0], l[1], l[2], l[3]);
      }
    }

    /* uncomment to show boundaries
    for(var xy in this.game.bound) {
      ctx.fillStyle = '#E9E9E9';
      xy = xy.split(',');
      this._drawMark.call(this, ctx, parseInt(xy[0]), parseInt(xy[1]));
    }*/

    // draw preview
    if(this.preview) {
      ctx.fillStyle = '#f00';
      this._drawMark(ctx, this.preview.x, this.preview.y);
    }

    // draw lines and initial marks
    var score = 0;
    for(var i = 0; i < this.history.length; i++) {
      var mark = this.history[i], line = mark[2];

      if(line) {
        score++;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        this._drawLine(ctx, line[0], line[1], line[2], line[3]);
      } else {
        ctx.fillStyle = '#333';
        this._drawMark(ctx, mark[0], mark[1]);
      }
    }

    // draw marks with(out) move numbers
    var num = 1;
    for(var i = 0; i < this.history.length; i++) {
      var mark = this.history[i], line = mark[2], showNum = null;

      if(line) {

        if(this.options.showNumbers) {
          showNum = num++;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '10px sans';
        }

        ctx.fillStyle = '#000';
        this._drawMark(ctx, mark[0], mark[1], showNum);
      }
    }

    if(this.linePreview) {
      ctx.strokeStyle = '#f00';
      ctx.lineWidth = 3;
      this._drawLine(ctx, this.linePreview[0], this.linePreview[1], this.linePreview[2], this.linePreview[3]);
    }

    if(this.options.score) {
      $(this.options.score).text(score);
    }
  },

  // TODO draw an X
  _drawMark: function(ctx, x, y, number) {
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

  _drawLine: function(ctx, x, y, dx, dy) {
    x += .5; // center within cell
    y += .5; // center within cell
    ctx.beginPath();
    ctx.moveTo(x*this.options.size, y*this.options.size);
    ctx.lineTo((x+this.game.len*dx)*this.options.size, (y+this.game.len*dy)*this.options.size);
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
      if(m[0]) mark.push(m);
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
});