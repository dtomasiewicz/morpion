var MWeb = function(target, options) {
  this.target = target;

  this.options = $.extend({
    score: null,
    status: null,
    showValid: false,
    showGrid: true,
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

  this.canvas = null;
  this.game = null;
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

  startGame: function(rules) {
    if(typeof rules === 'object')
      this.gameRules = rules;

    this.canvas = $('<canvas></canvas>').get(0);
    $(this.target).html(this.canvas);
    this.preview = this.linePreview = null;
    this.transX = this.transY = 0;

    this.game = new Morpion(this.gameRules.length, this.gameRules.disjoint);
    this.history = [];
    if('marks' in this.gameRules) {
      for(var i = 0; i < this.gameRules.marks.length; i++) {
        this.play.apply(this, this.gameRules.marks[i]);
      }
    }

    this._listen();
    this._status('Game started.');
    this._redraw();
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
    this._redraw();
  },

  undo: function() {
    var mark = this.history.pop();
    if(mark[2]) {
      this.game.unmark.apply(this.game, mark);
      this._status('Move undone!');
    } else {
      this.history.push(mark);
      this._status('Nothing to undo!');
    }
  },

  _redraw: function() {
    if(!this.game) return;

    var ctx = this.canvas.getContext('2d');

    var b = this._bounds();
    this.canvas.width = (b.xMax-b.xMin+1+this.options.padding*2)*this.options.size;
    this.canvas.height = (b.yMax-b.yMin+1+this.options.padding*2)*this.options.size;


    // allows us to draw using actual coordinates
    this.transX = (this.options.padding-b.xMin)*this.options.size;
    this.transY = (this.options.padding-b.yMin)*this.options.size;
    ctx.translate(this.transX, this.transY);

    // TODO draw grid lines

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

    // draw preview
    if(this.preview) {
      ctx.fillStyle = '#f00';
      this._drawMark(ctx, this.preview.x, this.preview.y);
    }

    // draw existing marks
    // TODO show move numbers
    var score = 0;
    for(var i = 0; i < this.history.length; i++) {
      var mark = this.history[i], line = mark[2];

      ctx.fillStyle = line ? '#000' : '#666';
      this._drawMark(ctx, mark[0], mark[1]);

      if(line) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        this._drawLine(ctx, line[0], line[1], line[2], line[3]);
        score++;
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
  _drawMark: function(ctx, x, y) {
    ctx.beginPath();
    ctx.arc((x+.5)*this.options.size, (y+.5)*this.options.size, this.options.size*.25, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();
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
    var b = {xMin: 0, xMax: 0, yMin: 0, yMax: 0};
    for(var i = 0; i < this.history.length; i++) {
      var m = this.history[i];
      if(m[0] < b.xMin) b.xMin = m[0];
      if(m[0] > b.xMax) b.xMax = m[0];
      if(m[1] < b.yMin) b.yMin = m[1];
      if(m[1] > b.yMax) b.yMax = m[1];
    }
    return b;
  },

  import: function(data) {
    // TODO
  },

  export: function() {
    // TODO
  }

};

$(function() {
  var ui = new MWeb($('#morpion').get(0), {
    score: $('#score').get(0),
    status: $('#status').get(0)
  });
  
  $('.option').change(function() {
    ui.option(this.name, this.checked);
  }).change();

  $('#variant').change(function() {
    var variant = $(this).val();
    if(variant == "custom") {
      // TODO
    } else {
      $.getJSON('games/'+variant+'.json', function(rules) {
        ui.startGame(rules);
        $('#info').html('');
        if('desc' in rules) {
          $('<p></p>').text(rules.desc).appendTo('#info');
        }
        if('link' in rules) {
          var link = $('<a target="_blank">More Information</a>').attr('href', rules.link);
          $('<p></p>').append(link).appendTo('#info');
        }
      });
    }
  }).change();

  $('#restart').click(function() {
    ui.startGame();
  });

  $('#undo').click(function() {
    if(ui.game) {
      ui.undo();
    }
  });

  $('#import').click(function() {
    ui.import($('#import_data').val());
  });

  $('#export').click(function() {
    $('#import_data').val(ui.export());
  });
});